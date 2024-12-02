const gameTime = 60 * 1000; // Game duration: 60 seconds
window.timer = null;
window.gameStart = null;
window.pauseTime = 0;
window.isPaused = false;

// Helper functions to add/remove classes
function addClass(el, name) {
    el.className += ' ' + name;
}

function removeClass(el, name) {
    el.className = el.className.replace(name, '');
}

// Fetch words from words.json
async function fetchWords() {
    try {
        const response = await fetch('words.json'); // Path to your JSON file
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const words = await response.json();
        return words;
    } catch (error) {
        console.error("Error fetching words:", error);
        return []; // Return an empty array if fetching fails
    }
}

// Update the cursor position
function updateCursorPosition() {
    const cursor = document.getElementById('cursor');
    const currentLetter = document.querySelector('.letter.current');
    const currentWord = document.querySelector('.word.current');

    if (currentLetter) {
        const rect = currentLetter.getBoundingClientRect();
        cursor.style.top = `${rect.top}px`;
        cursor.style.left = `${rect.left}px`;
        cursor.style.height = `${rect.height}px`;
        cursor.style.display = 'block';
    } else if (currentWord) {
        const rect = currentWord.getBoundingClientRect();
        cursor.style.top = `${rect.top}px`;
        cursor.style.left = `${rect.right}px`;
        cursor.style.height = `1.6rem`;
        cursor.style.display = 'block';
    } else {
        cursor.style.display = 'none';
    }
}

// Game initialization
async function initializeGame() {
    const words = await fetchWords();
    if (words.length === 0) {
        alert('Failed to load words. Please check the file or your connection.');
        return;
    }

    function randomWord() {
        const randomIndex = Math.floor(Math.random() * words.length);
        return words[randomIndex];
    }

    function formatWord(word) {
        return `<div class="word"><span class="letter">${word.split('').join('</span><span class="letter">')}</span></div>`;
    }

    function newGame() {
        const wordsContainer = document.getElementById('words');
        wordsContainer.innerHTML = ''; // Clear previous words
        for (let i = 0; i < 200; i++) {
            wordsContainer.innerHTML += formatWord(randomWord());
        }
        addClass(document.querySelector('.word'), 'current');
        addClass(document.querySelector('.letter'), 'current');
        document.getElementById('info').innerHTML = (gameTime / 1000) + '';
        window.timer = null; // Reset timer
        window.gameStart = null; // Reset game start
        window.isPaused = false; // Reset pause state
        wordsContainer.style.marginTop = '0px'; // Reset scrolling
        document.getElementById('game').focus(); // Automatically focus on game container

        // Show and initialize cursor
        const cursor = document.getElementById('cursor');
        cursor.style.display = 'block';
        updateCursorPosition();
    }

    // Ensure the game container is focusable and handle focus
    const gameElement = document.getElementById('game');
    gameElement.setAttribute('tabindex', '0'); // Make it focusable
    gameElement.addEventListener('click', () => gameElement.focus()); // Focus on click

    gameElement.addEventListener('keyup', ev => {
        if (window.isPaused) return;

        const key = ev.key;
        const currentWord = document.querySelector('.word.current');
        const currentLetter = document.querySelector('.letter.current');
        const expected = currentLetter?.innerHTML || ' ';
        const isLetter = key.length === 1 && key !== ' ';
        const isSpace = key === ' ';
        const isBackspace = key === 'Backspace';

        if (!window.timer && isLetter) {
            startTimer();
        }

        if (isLetter) {
            if (currentLetter) {
                const alreadyTypedCorrectly = currentLetter.classList.contains('correct');
                const newCorrectness = key === expected;

                if (!alreadyTypedCorrectly) {
                    addClass(currentLetter, newCorrectness ? 'correct' : 'incorrect');
                }

                removeClass(currentLetter, 'current');
                if (currentLetter.nextSibling) {
                    addClass(currentLetter.nextSibling, 'current');
                }
            } else {
                const extraLetter = document.createElement('span');
                extraLetter.innerHTML = key;
                extraLetter.className = 'letter incorrect extra';
                currentWord.appendChild(extraLetter);
            }
        }

        if (isSpace) {
            if (currentWord) {
                const letters = [...currentWord.querySelectorAll('.letter')];
                const incorrectLetters = letters.filter(letter => letter.classList.contains('incorrect')).length;

                if (incorrectLetters > 0) {
                    currentWord.classList.add('incorrect');
                } else {
                    currentWord.classList.add('correct');
                }

                removeClass(currentWord, 'current');
                if (currentWord.nextSibling) {
                    addClass(currentWord.nextSibling, 'current');
                    addClass(currentWord.nextSibling.firstChild, 'current');
                }
            }
        }

        if (isBackspace) {
            if (currentLetter) {
                const isFirstLetter = currentLetter === currentWord.firstChild;

                if (!isFirstLetter) {
                    removeClass(currentLetter, 'current');
                    const prevLetter = currentLetter.previousSibling;
                    addClass(prevLetter, 'current');
                } else {
                    const prevWord = currentWord.previousSibling;
                    if (prevWord) {
                        removeClass(currentWord, 'current');
                        addClass(prevWord, 'current');
                        const lastLetter = prevWord.lastChild;
                        addClass(lastLetter, 'current');
                    }
                }
            } else if (currentWord) {
                const lastLetter = currentWord.lastChild;
                if (lastLetter) {
                    addClass(lastLetter, 'current');
                }
            }
        }

        updateCursorPosition();
    });

    function startTimer() {
        window.timer = setInterval(() => {
            if (!window.gameStart) {
                window.gameStart = (new Date()).getTime();
            }
            const currentTime = (new Date()).getTime();
            const msPassed = currentTime - window.gameStart;
            const sPassed = Math.round(msPassed / 1000);
            const sLeft = Math.round((gameTime / 1000) - sPassed);
            if (sLeft <= 0) {
                gameOver();
                return;
            }
            document.getElementById('info').innerHTML = sLeft + '';
        }, 1000);
    }

    function gameOver() {
        clearInterval(window.timer);
        addClass(document.getElementById('game'), 'over');
        const wpm = getWpm();
        const accuracy = getAccuracy();
        document.getElementById('info').innerHTML = `WPM: ${wpm.toFixed(2)} | Accuracy: ${accuracy.toFixed(2)}%`;
    }

    function getAccuracy() {
        const letters = [...document.querySelectorAll('.letter')];
        const correctLetters = letters.filter(letter => letter.className.includes('correct')).length;
        const incorrectLetters = letters.filter(letter => letter.className.includes('incorrect')).length;
        const totalTypedLetters = correctLetters + incorrectLetters;

        return totalTypedLetters > 0
            ? (correctLetters / totalTypedLetters) * 100
            : 0;
    }

    function getWpm() {
        const words = [...document.querySelectorAll('.word')];
        const lastTypedWord = document.querySelector('.word.current');
        const lastTypedWordIndex = words.indexOf(lastTypedWord) + 1;
        const typedWords = words.slice(0, lastTypedWordIndex);
        const correctWords = typedWords.filter(word => {
            const letters = [...word.children];
            const incorrectLetters = letters.filter(letter => letter.className.includes('incorrect'));
            const correctLetters = letters.filter(letter => letter.className.includes('correct'));
            return incorrectLetters.length === 0 && correctLetters.length === letters.length;
        });
        return correctWords.length / gameTime * 60000;
    }

    document.getElementById('newGameBtn').addEventListener('click', () => {
        gameOver();
        newGame();
    });

    newGame();
}

initializeGame();
