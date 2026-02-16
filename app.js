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
    debugMode: false,
    actionLocked: false
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
    } else {
        elements.rotateOverlay.classList.add('active');
    }
}

// ===== Render Categories =====
function renderCategories() {
    elements.categoryList.innerHTML = GAME_DATA.categories.map(cat => `
        <div class="category-card" data-category-id="${cat.id}">
            <span class="category-emoji">${cat.emoji}</span>
            <div class="category-name">${cat.name}</div>
            <div class="category-count">${cat.cards.length} cards</div>
        </div>
    `).join('');
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Category selection
    elements.categoryList.addEventListener('click', (e) => {
        const card = e.target.closest('.category-card');
        if (card) {
            const categoryId = parseInt(card.dataset.categoryId);
            startGame(categoryId);
        }
    });

    // Results buttons
    elements.playAgain.addEventListener('click', () => {
        if (gameState.currentCategory) {
            startGame(gameState.currentCategory.id);
        }
    });

    elements.changeCategory.addEventListener('click', () => {
        showScreen('start');
    });

    // Debug toggle (Triple tap score)
    let tapCount = 0;
    let tapTimer;
    elements.score.addEventListener('click', () => {
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => tapCount = 0, 500);

        if (tapCount === 3) {
            gameState.debugMode = !gameState.debugMode;
            elements.debugInfo.style.display = gameState.debugMode ? 'block' : 'none';
            tapCount = 0;
        }
    });

    // Device orientation for tilt detection
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleTilt);
    }
}

// ===== Screen Management =====
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// ===== Start Game =====
function startGame(categoryId) {
    const category = getCategoryById(categoryId);
    if (!category) return;

    // Reset game state
    gameState = {
        currentCategory: category,
        cards: getShuffledCards(categoryId),
        currentCardIndex: 0,
        score: 0,
        timeLeft: 60,
        isPlaying: true,
        timerInterval: null,
        results: [],
        debugMode: gameState.debugMode,
        actionLocked: false
    };

    // Update UI
    updateScore();
    showCard();
    showScreen('game');

    // Request full screen if available
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    }

    // Request device orientation permission on iOS
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    startTimer();
                }
            })
            .catch(console.error);
    } else {
        startTimer();
    }
}

// ===== Timer =====
function startTimer() {
    elements.timer.textContent = gameState.timeLeft;
    updateTimerProgress();

    gameState.timerInterval = setInterval(() => {
        if (document.hidden || elements.rotateOverlay.classList.contains('active')) {
            return; // Don't count down if backgrounded or wrong orientation
        }

        gameState.timeLeft--;
        elements.timer.textContent = gameState.timeLeft;
        updateTimerProgress();

        // Timer warnings
        if (gameState.timeLeft === 10) {
            elements.timer.classList.add('warning');
            vibrate(200);
        } else if (gameState.timeLeft === 5) {
            elements.timer.classList.remove('warning');
            elements.timer.classList.add('danger');
            vibrate(300);
        }

        // Game over
        if (gameState.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function updateTimerProgress() {
    const percentage = (gameState.timeLeft / 60) * 100;
    elements.timerProgress.style.width = `${percentage}%`;
}

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

    const isTriggerZone = Math.abs(gamma) < 60; // Wide trigger zone
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
        const isNeutral = Math.abs(gamma) > 70;
        if (isNeutral) {
            gameState.actionLocked = false;
        }
    }
}

function lockAction() {
    gameState.actionLocked = true;
    setTimeout(() => {
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
