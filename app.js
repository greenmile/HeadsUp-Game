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
    actionLocked: false,
    isGameOver: false
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
    console.log('[HeadsUp] Initializing game...');

    // Verify GAME_DATA is loaded
    if (typeof GAME_DATA === 'undefined' || !GAME_DATA.categories) {
        console.error('[HeadsUp] GAME_DATA not loaded!');
        alert('Error: Game data failed to load. Please refresh the page.');
        return;
    }

    console.log('[HeadsUp] GAME_DATA loaded:', GAME_DATA.categories.length, 'categories');

    renderCategories();
    setupEventListeners();
    registerServiceWorker();
    checkOrientation();

    // Listen for orientation changes with delay to allow layout to settle
    window.addEventListener('resize', () => {
        setTimeout(checkOrientation, 100); // Small delay for layout stabilization
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(checkOrientation, 100); // Small delay for API updates
    });

    SoundManager.init(); // Initialize audio context
    console.log('[HeadsUp] Initialization complete');
}

// ===== Orientation Management =====
function checkOrientation() {
    let isLandscape = false;
    let detectionMethod = '';

    // Primary method: Dimensions (Most reliable, especially for PWA)
    const dimensionLandscape = window.innerWidth > window.innerHeight;

    // Secondary method: Try window.orientation (Deprecated but sometimes useful)
    let apiLandscape = null;
    if (typeof window.orientation !== 'undefined') {
        apiLandscape = Math.abs(window.orientation) === 90;
        detectionMethod = 'window.orientation';
    }
    // Tertiary method: Screen Orientation API
    else if (screen.orientation && screen.orientation.type) {
        apiLandscape = screen.orientation.type.includes('landscape');
        detectionMethod = 'screen.orientation';
    }

    // Decision logic: Prioritize dimensions, especially for PWA/standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

    if (isStandalone || apiLandscape === null) {
        // In PWA mode or if API unavailable, always trust dimensions
        isLandscape = dimensionLandscape;
        detectionMethod = 'dimensions (PWA/standalone mode)';
    } else if (dimensionLandscape === apiLandscape) {
        // API and dimensions agree - use that value
        isLandscape = dimensionLandscape;
    } else {
        // API and dimensions disagree - trust dimensions
        isLandscape = dimensionLandscape;
        detectionMethod += ' (overridden by dimensions)';
    }

    if (gameState.debugMode) {
        elements.debugInfo.innerHTML = `
            Method: ${detectionMethod}<br>
            Dimensions: ${window.innerWidth}x${window.innerHeight} → ${dimensionLandscape ? 'L' : 'P'}<br>
            API: ${apiLandscape !== null ? (apiLandscape ? 'L' : 'P') : 'N/A'}<br>
            Final: ${isLandscape ? 'Landscape' : 'Portrait'}<br>
            Standalone: ${isStandalone}
        `;
    }

    console.log(`[Orientation] ${isLandscape ? 'Landscape' : 'Portrait'} (${detectionMethod})`);

    if (isLandscape) {
        elements.rotateOverlay.classList.remove('active');
    } else {
        elements.rotateOverlay.classList.add('active');
    }
}

// ===== Render Categories =====
function renderCategories() {
    console.log('[HeadsUp] Rendering categories...');
    elements.categoryList.innerHTML = GAME_DATA.categories.map(cat => `
        <div class="category-card glass" data-category-id="${cat.id}">
            <span class="category-emoji">${cat.emoji}</span>
            <div class="category-name">${cat.name}</div>
            <div class="category-count">${cat.cards.length} cards</div>
        </div>
    `).join('');
    console.log('[HeadsUp] Categories rendered:', GAME_DATA.categories.length);
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

    // Force Start Button (Emergency Bypass)
    const forceStartBtn = document.getElementById('force-start-btn');
    if (forceStartBtn) {
        forceStartBtn.addEventListener('click', () => {
            elements.rotateOverlay.classList.remove('active');
            // Request fullscreen if possible to help orientation
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(e => console.log(e));
            }
        });
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
        actionLocked: false,
        isGameOver: false
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
    if (!gameState.isPlaying || gameState.isGameOver) return;

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
    vibrate(200); // Boosted
    SoundManager.play('correct');

    // Transition
    gameState.isPlaying = false;

    // Swipe animation
    elements.currentCard.style.transition = 'transform 0.4s ease-in';
    elements.currentCard.style.transform = 'translateY(100vh) rotate(-10deg)';

    setTimeout(() => {
        if (!gameState.isGameOver) {
            gameState.isPlaying = true;
            elements.currentCard.style.transition = 'none';
            elements.currentCard.style.transform = 'translateY(0) rotate(0)';
            showCard();
        }
    }, 400);
}

function handleSkip() {
    if (!gameState.isPlaying) return;

    const word = gameState.cards[gameState.currentCardIndex];
    gameState.results.push({ word, correct: false });
    gameState.currentCardIndex++;

    showFeedback('Pass', 'skip');
    vibrate([100, 50, 100]); // Boosted pattern
    SoundManager.play('pass');

    // Transition
    gameState.isPlaying = false;

    // Swipe animation
    elements.currentCard.style.transition = 'transform 0.4s ease-in';
    elements.currentCard.style.transform = 'translateY(-100vh) rotate(10deg)';

    setTimeout(() => {
        if (!gameState.isGameOver) {
            gameState.isPlaying = true;
            elements.currentCard.style.transition = 'none';
            elements.currentCard.style.transform = 'translateY(0) rotate(0)';
            showCard();
        }
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
    gameState.isGameOver = true;
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

    // Clear indicators
    const tiltUp = document.querySelector('.tilt-up');
    const tiltDown = document.querySelector('.tilt-down');
    if (tiltUp) tiltUp.classList.remove('active');
    if (tiltDown) tiltDown.classList.remove('active');

    vibrate(1000); // Long vibrate
    SoundManager.play('alarm');
    showScreen('results');
}

// ===== Global Actions =====
window.forceStartGame = function () {
    console.log('[HeadsUp] Force start triggered');
    const overlay = document.getElementById('rotate-overlay');
    if (overlay) overlay.classList.remove('active');

    // Request fullscreen if possible
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    }
};

// ===== Sound Management =====
const SoundManager = {
    ctx: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    play(type) {
        if (!this.ctx) this.init();
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        if (type === 'correct') {
            // High pitch "Ding!"
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);
        }
        else if (type === 'pass') {
            // Low pitch "Bup"
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            osc.start(now);
            osc.stop(now + 0.2);
        }
        else if (type === 'tick') {
            // Woodblock tick
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.start(now);
            osc.stop(now + 0.05);
        }
        else if (type === 'alarm') {
            // Time's up buzzer
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.5);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

            osc.start(now);
            osc.stop(now + 0.5);
        }
    }
};

// ===== Utilities =====
function vibrate(pattern) {
    // Log for debugging
    console.log('[HeadsUp] Vibrate:', pattern);

    // Safety check
    if (typeof navigator.vibrate === 'function') {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.warn('[HeadsUp] Vibration failed:', e);
        }
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
