// ===== Game State =====
let gameState = {
    currentCategory: null,
    cards: [],
    currentCardIndex: 0,
    score: 0,
    timeLeft: 60,
    isPlaying: false,
    timerInterval: null,
    results: [],
    debugMode: false
};

// ===== DOM Elements =====
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    results: document.getElementById('results-screen')
};

const elements = {
    categoryList: document.getElementById('category-list'),
    currentCard: document.getElementById('current-card'),
    cardWord: document.querySelector('.card-word'),
    timer: document.getElementById('timer'),
    timerProgress: document.getElementById('timer-progress'),
    score: document.getElementById('score'),
    feedback: document.getElementById('feedback'),
    finalScore: document.getElementById('final-score'),
    finalCategory: document.getElementById('final-category'),
    resultsList: document.getElementById('results-list'),
    playAgain: document.getElementById('play-again'),
    changeCategory: document.getElementById('change-category'),
    rotateOverlay: document.getElementById('rotate-overlay'),
    debugInfo: document.getElementById('debug-info')
};

// ===== Initialization =====
function init() {
    renderCategories();
    setupEventListeners();
    registerServiceWorker();
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
}

// ===== Orientation Management =====
function checkOrientation() {
    let isLandscape = false;

    // Preferred: screen.orientation
    if (screen.orientation && screen.orientation.type) {
        isLandscape = screen.orientation.type.includes('landscape');
    } else if (typeof window.orientation !== 'undefined') {
        // Fallback: window.orientation (iOS/Older Android)
        isLandscape = Math.abs(window.orientation) === 90;
    } else {
        // Fallback: Dimensions
        isLandscape = window.innerWidth > window.innerHeight;
    }

    if (isLandscape) {
        elements.rotateOverlay.classList.remove('active');
        if (gameState.isPlaying && gameState.timeLeft > 0) {
            // Resume if paused (logic to be added if needed)
        }
    } else {
        elements.rotateOverlay.classList.add('active');
    }
}

// ... existing code ...

// ===== Card Display =====
function showCard() {
    if (gameState.currentCardIndex >= gameState.cards.length) {
        // Reshuffle if we run out
        gameState.cards = getShuffledCards(gameState.currentCategory.id);
        gameState.currentCardIndex = 0;
    }

    const word = gameState.cards[gameState.currentCardIndex];
    elements.cardWord.textContent = word;
    adjustTextSize(word);

    // Animation reset
    elements.currentCard.style.animation = 'none';
    elements.currentCard.offsetHeight; /* trigger reflow */
    elements.currentCard.style.animation = 'zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
}

function adjustTextSize(word) {
    // Reset classes
    elements.cardWord.classList.remove('text-fit', 'text-long');

    if (word.length > 20) {
        elements.cardWord.classList.add('text-long');
    } else if (word.length > 10) {
        elements.cardWord.classList.add('text-fit');
    }
}

// ===== Tilt Detection (Landscape Logic) =====
function handleTilt(event) {
    if (!gameState.isPlaying) return;

    const gamma = event.gamma; // Left/Right (Standard Landscape: Neutral is +/-90)
    const beta = event.beta;   // Front/Back (Face Up/Down)

    // Debug info
    if (gameState.debugMode) {
        elements.debugInfo.innerHTML = `
            Alpha: ${Math.round(event.alpha)}<br>
            Beta: ${Math.round(event.beta)}<br>
            Gamma: ${Math.round(event.gamma)}<br>
            Space: ${Math.round(Math.abs(gamma))}
        `;
    }

    // TILT LOGIC
    // Neutral (Forehead): Gamma approx +/- 90, Beta approx 0
    // Tilt Down (Correct): Screen -> Floor. Gamma -> 0. Beta -> 180 (or -180)
    // Tilt Up (Pass): Screen -> Ceiling. Gamma -> 0. Beta -> 0

    const TILT_THRESHOLD = 50; // Threshold for Gamma deviation from 90 (Trigger zone)
    // i.e., at Neutral, Abs(Gamma) is 90. 
    // Trigger when Abs(Gamma) < (90 - 50) = 40.

    // Check if we have titled "flat" (Screen looking up or down)
    // Ideally Gamma drops close to 0 when flat in landscape
    const isTriggerZone = Math.abs(gamma) < 60; // Wide trigger zone

    // Distinguish Up vs Down using Beta
    // Face Up (Pass): Beta is near 0
    // Face Down (Correct): Beta is near 180 (or -180)

    const isFaceDown = Math.abs(beta) > 90;
    const isFaceUp = Math.abs(beta) < 90;

    let action = null; // 'correct', 'pass', or null

    if (isTriggerZone) {
        if (isFaceDown) action = 'correct';
        else if (isFaceUp) action = 'pass';
    }

    // Visual Feedback Indicators
    const tiltUpIndicator = document.querySelector('.tilt-up');
    const tiltDownIndicator = document.querySelector('.tilt-down');

    // Reset visuals
    tiltUpIndicator.classList.remove('active');
    tiltDownIndicator.classList.remove('active');

    if (action === 'pass') {
        tiltUpIndicator.classList.add('active');
    } else if (action === 'correct') {
        tiltDownIndicator.classList.add('active');
    }

    // Execute Action (with lock to prevent repeated firing)
    if (!gameState.actionLocked) {
        if (action === 'correct') {
            handleCorrect();
            lockAction();
        } else if (action === 'pass') {
            handleSkip();
            lockAction();
        }
    } else {
        // Unlock if we return to Neutral
        // Neutral is when Gamma is high (near 90)
        const isNeutral = Math.abs(gamma) > 70;
        if (isNeutral) {
            gameState.actionLocked = false;
        }
    }
}

function lockAction() {
    gameState.actionLocked = true;
    setTimeout(() => {
        // Failsafe in case they don't return to neutral
        gameState.actionLocked = false;
    }, 1500);
}

// ===== Game Actions =====
function handleCorrect() {
    if (!gameState.isPlaying) return;

    const word = gameState.cards[gameState.currentCardIndex];
    gameState.results.push({ word, correct: true });
    gameState.score++;
    gameState.currentCardIndex++;

    updateScore();
    showFeedback('Correct!', 'correct');
    vibrate(100);

    // Transition
    gameState.isPlaying = false;

    // Swipe animation
    elements.currentCard.style.transition = 'transform 0.4s ease-in';
    elements.currentCard.style.transform = 'translateY(100vh) rotate(-10deg)';

    setTimeout(() => {
        gameState.isPlaying = true;
        elements.currentCard.style.transition = 'none';
        elements.currentCard.style.transform = 'translateY(0) rotate(0)';
        showCard();
    }, 400);
}

function handleSkip() {
    if (!gameState.isPlaying) return;

    const word = gameState.cards[gameState.currentCardIndex];
    gameState.results.push({ word, correct: false });
    gameState.currentCardIndex++;

    showFeedback('Pass', 'skip');
    vibrate([50, 50]);

    // Transition
    gameState.isPlaying = false;

    // Swipe animation
    elements.currentCard.style.transition = 'transform 0.4s ease-in';
    elements.currentCard.style.transform = 'translateY(-100vh) rotate(10deg)';

    setTimeout(() => {
        gameState.isPlaying = true;
        elements.currentCard.style.transition = 'none';
        elements.currentCard.style.transform = 'translateY(0) rotate(0)';
        showCard();
    }, 400);
}

function updateScore() {
    elements.score.textContent = `Score: ${gameState.score}`;
}

// ===== Feedback =====
function showFeedback(text, type) {
    elements.feedback.textContent = text;
    elements.feedback.className = `feedback ${type} show`;

    setTimeout(() => {
        elements.feedback.classList.remove('show');
    }, 800);
}

// ===== End Game =====
function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerInterval);

    // Exit fullscreen
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(e => console.log(e));
    }

    // Update results screen
    elements.finalScore.textContent = gameState.score;
    elements.finalCategory.textContent = gameState.currentCategory.name;

    // Render results list
    elements.resultsList.innerHTML = gameState.results.map(result => `
        <div class="result-item ${result.correct ? 'correct' : 'skipped'}">
            <span class="result-word">${result.word}</span>
            <span class="result-icon">${result.correct ? '✅' : '⛔'}</span>
        </div>
    `).join('');

    vibrate(500);
    showScreen('results');
}

// ===== Utilities =====
function vibrate(pattern) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// ===== Service Worker Registration =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('Service Worker registered:', registration))
            .catch(error => console.log('Service Worker registration failed:', error));
    }
}

// ===== Initialize on Load =====
document.addEventListener('DOMContentLoaded', init);
