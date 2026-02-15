// ===== Game State =====
let gameState = {
    currentCategory: null,
    cards: [],
    currentCardIndex: 0,
    score: 0,
    timeLeft: 60,
    isPlaying: false,
    timerInterval: null,
    results: []
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
    changeCategory: document.getElementById('change-category')
};

// ===== Initialization =====
function init() {
    renderCategories();
    setupEventListeners();
    registerServiceWorker();
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
        results: []
    };

    // Update UI
    updateScore();
    showCard();
    showScreen('game');

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
    elements.currentCard.classList.add('flip');

    setTimeout(() => {
        elements.currentCard.classList.remove('flip');
    }, 600);
}

// ===== Tilt Detection =====
function handleTilt(event) {
    if (!gameState.isPlaying) return;

    const beta = event.beta; // Front-to-back tilt (-180 to 180)

    // Update tilt indicators
    const tiltUp = document.querySelector('.tilt-up');
    const tiltDown = document.querySelector('.tilt-down');

    if (beta > 30) {
        tiltUp.classList.add('active');
        tiltDown.classList.remove('active');
    } else if (beta < -30) {
        tiltDown.classList.add('active');
        tiltUp.classList.remove('active');
    } else {
        tiltUp.classList.remove('active');
        tiltDown.classList.remove('active');
    }

    // Tilt down = Correct
    if (beta < -45) {
        handleCorrect();
    }
    // Tilt up = Skip
    else if (beta > 45) {
        handleSkip();
    }
}

// ===== Game Actions =====
function handleCorrect() {
    if (!gameState.isPlaying) return;

    const word = gameState.cards[gameState.currentCardIndex];
    gameState.results.push({ word, correct: true });
    gameState.score++;
    gameState.currentCardIndex++;

    updateScore();
    showFeedback('✓', 'correct');
    vibrate(100);

    // Debounce to prevent multiple triggers
    gameState.isPlaying = false;
    setTimeout(() => {
        gameState.isPlaying = true;
        showCard();
    }, 800);
}

function handleSkip() {
    if (!gameState.isPlaying) return;

    const word = gameState.cards[gameState.currentCardIndex];
    gameState.results.push({ word, correct: false });
    gameState.currentCardIndex++;

    showFeedback('→', 'skip');
    vibrate(50);

    // Debounce to prevent multiple triggers
    gameState.isPlaying = false;
    setTimeout(() => {
        gameState.isPlaying = true;
        showCard();
    }, 800);
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
    }, 500);
}

// ===== End Game =====
function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerInterval);

    // Update results screen
    elements.finalScore.textContent = gameState.score;
    elements.finalCategory.textContent = gameState.currentCategory.name;

    // Render results list
    elements.resultsList.innerHTML = gameState.results.map(result => `
        <div class="result-item">
            <span class="result-word">${result.word}</span>
            <span class="result-status">${result.correct ? '✓' : '→'}</span>
        </div>
    `).join('');

    vibrate(500);
    showScreen('results');
}

// ===== Utilities =====
function vibrate(duration) {
    if ('vibrate' in navigator) {
        navigator.vibrate(duration);
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
