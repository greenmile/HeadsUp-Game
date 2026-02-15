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
    const isLandscape = window.innerWidth > window.innerHeight;

    if (isLandscape) {
        elements.rotateOverlay.classList.remove('active');
        if (gameState.isPlaying && gameState.timeLeft > 0) {
            // Resume if paused (logic to be added if needed)
        }
    } else {
        elements.rotateOverlay.classList.add('active');
        // Optional: Pause game if in portrait
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
        debugMode: gameState.debugMode
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

    // Animation reset
    elements.currentCard.style.animation = 'none';
    elements.currentCard.offsetHeight; /* trigger reflow */
    elements.currentCard.style.animation = 'zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
}

// ===== Tilt Detection (Landscape Logic) =====
function handleTilt(event) {
    if (!gameState.isPlaying) return;

    // In landscape, we use GAMMA (left/right tilt relative to portrait)
    // When holding phone to forehead in landscape:
    // Screen facing forward (neutral): Gamma ≈ -90 (on one side) or 90 (on other)
    // Tilt Down (Screen to floor): Gamma moves towards 0 (from -90) or 0 (from 90)
    // Tilt Up (Screen to ceiling): Gamma moves towards -180 (from -90) or 180 (from 90)

    // We need to normalize based on which way the phone is rotated
    let tilt = event.gamma;
    const beta = event.beta;

    // Debug info
    if (gameState.debugMode) {
        elements.debugInfo.innerHTML = `
            Alpha: ${Math.round(event.alpha)}<br>
            Beta: ${Math.round(event.beta)}<br>
            Gamma: ${Math.round(event.gamma)}<br>
            Orientation: ${window.orientation || 'N/A'}
        `;
    }

    // Normalize gamma for both landscape orientations
    // We assume the user holds the phone roughly vertical (beta approx 0-90)

    // Thresholds
    const TILT_THRESHOLD = 35; // Degrees to trigger
    const RESET_THRESHOLD = 15; // Degrees to reset

    // Determine actions based on Gamma
    // Note: This logic works for standard landscape (home button right)
    // You might need to invert for landscape-secondary (home button left)

    // Simple state machine for tilt to avoid jitter
    // 0 = Neutral, 1 = Triggered Down, 2 = Triggered Up

    // Check for "Tilt Down" (Correct)
    // Gamma usually goes from -90 -> -45 (or 90 -> 45)
    const isTiltDown = Math.abs(tilt) < (90 - TILT_THRESHOLD);

    // Check for "Tilt Up" (Skip)
    // Gamma usually goes from -90 -> -135 (or 90 -> 135)
    // Note: Gamma flips sign at +/- 90 in some browsers, so we check absolute > 90
    const isTiltUp = Math.abs(tilt) > (90 + TILT_THRESHOLD);

    // Reset zone (Near vertical)
    const isNeutral = Math.abs(tilt) > (90 - RESET_THRESHOLD) && Math.abs(tilt) < (90 + RESET_THRESHOLD);

    // Visual Feedback
    const tiltUpIndicator = document.querySelector('.tilt-up');
    const tiltDownIndicator = document.querySelector('.tilt-down');

    if (isTiltUp) {
        tiltUpIndicator.classList.add('active');
        tiltDownIndicator.classList.remove('active');
    } else if (isTiltDown) {
        tiltDownIndicator.classList.add('active');
        tiltUpIndicator.classList.remove('active');
    } else {
        tiltUpIndicator.classList.remove('active');
        tiltDownIndicator.classList.remove('active');
    }

    // Trigger Actions
    if (isTiltDown && !gameState.actionLocked) {
        handleCorrect();
        lockAction();
    } else if (isTiltUp && !gameState.actionLocked) {
        handleSkip();
        lockAction();
    } else if (isNeutral) {
        gameState.actionLocked = false;
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
