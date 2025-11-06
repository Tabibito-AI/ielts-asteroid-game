let canvas, ctx, gameOverlay, startButton, aiPanel, aiMessage, helpButton, translationLanguageSelect, typingInput, textInput, currentTarget;

// Game state
let gameRunning = false;
let gamePaused = false;
let score = 0;
let asteroids = [];
let currentTypingTarget = null;
let selectedLanguage = 'ja';


// TTS Language Codes
const ttsLanguageCodes = {
    'ja': 'ja-JP',
    'es': 'es-ES',
    'zh': 'zh-CN',
    'fr': 'fr-FR',
    'it': 'it-IT',
    'ko': 'ko-KR',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'ru': 'ru-RU',
    'id': 'id-ID',
    'pt': 'pt-PT'
};

// Audio Control State
let soundEnabled = true;
let bgmEnabled = true;
let bgmAudioContext = null;
let bgmOscillator = null;
let bgmGainNode = null;

// Use IELTS words if available, otherwise fallback
let gameWords = [];

// Asteroid class
class Asteroid {
    constructor() {
        this.word = gameWords[Math.floor(Math.random() * gameWords.length)];
        this.x = Math.random() * (canvas.width - 100);
        this.y = -50;
        this.speed = 0.5 + Math.random() * 1.5;
        this.size = 90 + Math.random() * 60; // Asteroid size increased
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.typedChars = 0;
        this.isTargeted = false;
        this.color = '#ffffff';
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        ctx.rotate(this.rotation);
        
        // Draw asteroid shape
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sides = 8;
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const radius = this.size/2 + Math.sin(angle * 3) * 5;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
        
        // Draw word
        ctx.fillStyle = this.color;
        ctx.font = '48px monospace'; // Font size increased
        ctx.textAlign = 'center';
        
        // Highlight typed characters
        const typedPart = this.word.substring(0, this.typedChars);
        const remainingPart = this.word.substring(this.typedChars);

        ctx.textAlign = 'center';
        const textY = this.y + this.size + 40;

        // Measure text widths
        const typedWidth = ctx.measureText(typedPart).width;
        const remainingWidth = ctx.measureText(remainingPart).width;
        const totalWidth = typedWidth + remainingWidth;

        // Calculate starting X for the entire word to be centered
        const startX = this.x + this.size / 2 - totalWidth / 2;

        // Draw typed part in yellow
        ctx.fillStyle = '#ffff00';
        ctx.fillText(typedPart, startX + typedWidth / 2, textY);

        // Draw remaining part in white
        ctx.fillStyle = '#ffffff';
        ctx.fillText(remainingPart, startX + typedWidth + remainingWidth / 2, textY);
    }

    checkTyping(char) {
        if (this.word[this.typedChars].toLowerCase() === char.toLowerCase()) {
            this.typedChars++;
            playSound(800, 0.1); // Success sound
            return true;
        } else {
            playSound(200, 0.2); // Error sound
            return false;
        }
    }

    isComplete() {
        return this.typedChars >= this.word.length;
    }

    isOffScreen() {
        return this.y > canvas.height + 50;
    }
}

// Sound effects
function playSound(frequency, duration) {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// BGM Functions
function startBGM() {
    if (!bgmEnabled) return;
    
    try {
        bgmAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        bgmOscillator = bgmAudioContext.createOscillator();
        bgmGainNode = bgmAudioContext.createGain();
        
        bgmOscillator.connect(bgmGainNode);
        bgmGainNode.connect(bgmAudioContext.destination);
        
        bgmOscillator.frequency.setValueAtTime(110, bgmAudioContext.currentTime);
        bgmOscillator.type = 'sine';
        
        bgmGainNode.gain.setValueAtTime(0.1, bgmAudioContext.currentTime);
        
        bgmOscillator.start(bgmAudioContext.currentTime);
    } catch (error) {
        console.error('Error starting BGM:', error);
    }
}

function stopBGM() {
    if (bgmOscillator && bgmAudioContext) {
        try {
            bgmOscillator.stop(bgmAudioContext.currentTime);
            bgmOscillator = null;
            bgmGainNode = null;
            bgmAudioContext = null;
        } catch (error) {
            console.error('Error stopping BGM:', error);
        }
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    if (soundEnabled) {
        btn.textContent = '🔊 Sound: ON';
        btn.classList.remove('off');
    } else {
        btn.textContent = '🔇 Sound: OFF';
        btn.classList.add('off');
    }
}

function toggleBGM() {
    bgmEnabled = !bgmEnabled;
    const btn = document.getElementById('bgmToggle');
    if (bgmEnabled) {
        btn.textContent = '🎵 BGM: ON';
        btn.classList.remove('off');
        if (gameRunning) {
            startBGM();
        }
    } else {
        btn.textContent = '🔇 BGM: OFF';
        btn.classList.add('off');
        stopBGM();
    }
}

// Game functions
function startGame() {
    gameRunning = true;
    gamePaused = false;
    score = 0;
    asteroids = [];
    currentTypingTarget = null;
    
    gameOverlay.style.display = 'none';
    aiPanel.style.display = 'block';
    typingInput.style.display = 'block';
    
    // Show game control buttons
    const pauseButton = document.getElementById('pauseButton');
    const menuButton = document.getElementById('menuButton');
    if (pauseButton) pauseButton.style.display = 'inline-block';
    if (menuButton) menuButton.style.display = 'inline-block';
    
    textInput.focus();
    
    // Start BGM if enabled
    if (bgmEnabled) {
        startBGM();
    }
    
    // Spawn initial asteroids
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            asteroids.push(new Asteroid());
        }, i * 1000);
    }
    
    gameLoop();
}

function pauseGame() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    const pauseButton = document.getElementById('pauseButton');
    if (gamePaused) {
        pauseButton.textContent = '▶ Resume';
        pauseButton.style.backgroundColor = '#ffa500';
    } else {
        pauseButton.textContent = '⏸ Pause';
        pauseButton.style.backgroundColor = '#ff6b6b';
    }
}

function returnToMenu() {
    gameRunning = false;
    gamePaused = false;
    endGame();
}

function endGame() {
    gameRunning = false;
    gamePaused = false;
    gameOverlay.style.display = 'flex';
    aiPanel.style.display = 'none';
    typingInput.style.display = 'none';
    
    // Hide game control buttons
    const pauseButton = document.getElementById('pauseButton');
    const menuButton = document.getElementById('menuButton');
    if (pauseButton) pauseButton.style.display = 'none';
    if (menuButton) menuButton.style.display = 'none';
    
    // Stop BGM
    stopBGM();
    
    // Show final score
    const h1 = gameOverlay.querySelector('h1');
    h1.textContent = `Game Over! Final Score: ${score}`;
    
    // Get AI encouragement
    const prompt = geminiAI.generateGameOver(score);
    geminiAI.getResponse(prompt).then(response => {
        aiMessage.textContent = response;
        aiPanel.style.display = 'block';
    });
}

function spawnAsteroid() {
    if (gameRunning && asteroids.length < 8) {
        asteroids.push(new Asteroid());
    }
}

function updateGame() {
    // Update asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        asteroid.update();
        
        if (asteroid.isOffScreen()) {
            asteroids.splice(i, 1);
        }
    }
    
    // Check game over condition
    if (asteroids.length > 10) {
        endGame();
        return;
    }
    
    // Spawn new asteroids
    if (Math.random() < 0.01) {
        spawnAsteroid();
    }
}

function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#0b0f13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 73) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // Draw asteroids
    asteroids.forEach(asteroid => asteroid.draw());
    
    // Draw UI
    ctx.fillStyle = '#cde8ff';
    ctx.font = '24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
    
    // Draw controls info
    const controlsInfo = document.getElementById('controlsInfo');
    if (controlsInfo) {
        controlsInfo.textContent = 'Press Tab for Help, Select language for translations';
    }
}

function gameLoop() {
    if (!gameRunning) return;
    
    if (!gamePaused) {
        updateGame();
    }
    drawGame();
    requestAnimationFrame(gameLoop);
}

// Show translation function
function showTranslation(word) {
    const selectedLang = translationLanguageSelect.value;
    
    // Capitalize the first letter of the word to match the wordTranslations keys
    const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
    
    // Check if wordTranslations is available and has the word
  if (typeof wordTranslations !== 'undefined' && wordTranslations[capitalizedWord] && wordTranslations[capitalizedWord][selectedLang]) {
        const translation = wordTranslations[capitalizedWord][selectedLang];
        const ttsLangCode = ttsLanguageCodes[selectedLang];
        
        // Display translation temporarily
        const translationDiv = document.createElement('div');
        translationDiv.style.position = 'fixed';
        translationDiv.style.top = '50%';
        translationDiv.style.left = '50%';
        translationDiv.style.transform = 'translate(-50%, -50%)';
        translationDiv.style.background = 'rgba(0, 0, 0, 0.9)';
        translationDiv.style.color = '#00ff00';
        translationDiv.style.padding = '20px';
        translationDiv.style.borderRadius = '10px';
        translationDiv.style.fontSize = '24px';
        translationDiv.style.fontFamily = 'monospace';
        translationDiv.style.zIndex = '1000';
        translationDiv.style.border = '2px solid #00ff00';
        translationDiv.innerHTML = `Word completed: <strong>${capitalizedWord}</strong><br>${translation}`;
        
        document.body.appendChild(translationDiv);
        
        // Remove after 2 seconds
        setTimeout(() => {
            document.body.removeChild(translationDiv);
        }, 2000);
        
        // Speak translation in selected language
        speechSynthesis.cancel(); // Ensure the utterance is not interrupted
        ttsService.speakNative(translation, ttsLangCode);
    } else {
        // Fallback: show word in English and speak it
        const translationDiv = document.createElement("div");
        translationDiv.style.position = "fixed";
        translationDiv.style.top = "50%";
        translationDiv.style.left = "50%";
        translationDiv.style.transform = "translate(-50%, -50%)";
        translationDiv.style.background = "rgba(0, 0, 0, 0.9)";
        translationDiv.style.color = "#ffff00";
        translationDiv.style.padding = "20px";
        translationDiv.style.borderRadius = "10px";
        translationDiv.style.fontSize = "24px";
        translationDiv.style.fontFamily = "monospace";
        translationDiv.style.zIndex = "1000";
        translationDiv.style.border = "2px solid #ffff00";
        translationDiv.innerHTML = `Word completed: <strong>${capitalizedWord}</strong><br><em>(No translation available for ${selectedLang})</em>`;
        
        document.body.appendChild(translationDiv);
        
        setTimeout(() => {
            document.body.removeChild(translationDiv);
        }, 2000);
        
        // Speak the English word as a fallback
        speechSynthesis.cancel();
        ttsService.speakNative(capitalizedWord, 'en-US');
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    // Initialize DOM elements
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    gameOverlay = document.getElementById('gameOverlay');
    startButton = document.getElementById('startButton');
    aiPanel = document.getElementById('aiPanel');
    aiMessage = document.getElementById('aiMessage');
    helpButton = document.getElementById('helpButton');
    translationLanguageSelect = document.getElementById('translationLanguage');
    typingInput = document.getElementById('typingInput');
    textInput = document.getElementById('textInput');
    currentTarget = document.getElementById('currentTarget');

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    

    // Use IELTS words if available, otherwise fallback
    if (typeof ieltsWords !== 'undefined' && ieltsWords.length > 0) {
        gameWords = ieltsWords.map(word => word.toLowerCase());
    } else {
        gameWords = [
            'default', 'words', 'for', 'testing', 'purposes'
        ];
    }
    console.log('Game words loaded:', gameWords.length);

    startButton.addEventListener("click", startGame);
    helpButton.addEventListener("click", getHelpTip);
    
    // Game control buttons
    const pauseButton = document.getElementById('pauseButton');
    const menuButton = document.getElementById('menuButton');
    if (pauseButton) {
        pauseButton.addEventListener('click', pauseGame);
    }
    if (menuButton) {
        menuButton.addEventListener('click', returnToMenu);
    }
    
    // Audio control buttons
    const soundToggle = document.getElementById('soundToggle');
    const bgmToggle = document.getElementById('bgmToggle');
    
    if (soundToggle) {
        soundToggle.addEventListener('click', toggleSound);
    }
    if (bgmToggle) {
        bgmToggle.addEventListener('click', toggleBGM);
    }

    // Language selection
    translationLanguageSelect.addEventListener("change", (e) => {
        selectedLanguage = e.target.value;
    });

    // Input handling
    textInput.addEventListener('input', (e) => {
        if (!gameRunning) return;

        const inputValue = e.target.value;
        const lastChar = inputValue[inputValue.length - 1];

        if (currentTypingTarget && currentTypingTarget.word) {
            // If an asteroid is already targeted, continue typing that word
            const expectedChar = currentTypingTarget.word[currentTypingTarget.typedChars];
            if (lastChar && expectedChar && lastChar.toLowerCase() === expectedChar.toLowerCase()) {
                currentTypingTarget.typedChars++;
                playSound(800, 0.1); // Success sound

                if (currentTypingTarget.isComplete()) {
                    // Word completed - destroy asteroid
                    const completedWord = currentTypingTarget.word;
                    const wordIndex = asteroids.indexOf(currentTypingTarget);
                    if (wordIndex > -1) {
                        asteroids.splice(wordIndex, 1);
                    }

                    // Add score
                    score += completedWord.length * 10;

                    // Show translation and speak it
                    showTranslation(completedWord);

                    // Reset target
                    currentTypingTarget = null;
                    currentTarget.textContent = 'Target: None';
                    textInput.value = ''; // Clear input only on successful destruction

                    // Play destruction sound
                    playSound(600, 0.3);
                }
            } else if (lastChar) {
                // Incorrect character typed for targeted asteroid
                playSound(200, 0.2); // Error sound
                // Do not clear input, allow user to correct
            }
        } else if (inputValue.length === 1) {
            // No asteroid targeted, and first character typed
            let foundTarget = false;
            for (const asteroid of asteroids) {
                if (asteroid.word[0].toLowerCase() === lastChar.toLowerCase()) {
                    currentTypingTarget = asteroid;
                    asteroid.isTargeted = true;
                    asteroid.color = '#ffff00';
                    currentTarget.textContent = `Target: ${asteroid.word}`;
                    ttsService.speakNative(asteroid.word, 'en-US');
                    currentTypingTarget.typedChars = 1; // First char is already typed
                    playSound(800, 0.1); // Success sound for first char
                    foundTarget = true;
                    break;
                }
            }
            if (!foundTarget) {
                // If no asteroid matches the first character, clear input to allow re-typing
                textInput.value = '';
            }
        } else if (inputValue.length > 0 && !currentTypingTarget) {
            // This case handles when input has characters but no target (e.g., previous target destroyed, but input not cleared)
            // Or if user typed more than one character without a target
            // Clear input to allow re-targeting
            textInput.value = '';
        }
    });

    // Backspace handling
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && currentTypingTarget) {
            if (textInput.value.length <= 1) {
                // Reset target when backspacing to empty
                currentTypingTarget.isTargeted = false;
                currentTypingTarget.color = '#ffffff';
                currentTypingTarget.typedChars = 0;
                currentTypingTarget = null;
                currentTarget.textContent = 'Target: None';
            }
        }
    });

    // Tab key for help
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            getHelpTip();
        }
    });

    // Initialize
    aiMessage.textContent = "Press Tab or HELP button for typing and vocabulary tips.";

    // Resize canvas on window resize
    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
});


// Help function
function getHelpTip() {
    aiMessage.textContent = 'Getting advice...';
    
    const prompt = geminiAI.generateGameTip();
    geminiAI.getResponse(prompt).then(response => {
        // Remove asterisks from the response
        const cleanResponse = response.replace(/\*/g, '');
        aiMessage.textContent = cleanResponse;
        
        // Speak the tip
        ttsService.speakNative(cleanResponse, 'en-US');
    });
}

