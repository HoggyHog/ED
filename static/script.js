// Word lists for different lengths
const wordLists = {
    5: ["power","anode","solar","reuse","green"],
    6: ["energy","biogas","charge","offset","reduce","biogas"],
    7: ["current","outages","climate","recycle","battery"],
    8: ["windmill","dispatch","blackout","hydrogen","electric"]
};

let currentWord = "";
let currentGuess = [];
let currentRow = 0;
let guessesAllowed = 6;
let wordLength = 5;
let gameOver = false;
let boardTiles = [];
let totalScore = 0;
let roundNumber = 1;

let team_name=localStorage.getItem('teamName')

let usedWords = new Set(); // Track words already used



// Calculate score based on word length and number of attempts
function calculateScore(wordLength, attempts) {
    // Base score is word length × 10
    const baseScore = wordLength * 10;
    
    // Bonus for fewer attempts: 20 points for each unused attempt
    const attemptBonus = (guessesAllowed - attempts) * 20;
    
    return baseScore + attemptBonus;
}

// Initialize the game
function initGame(isNewGame = true) {
    gameOver = false;
    currentRow = 0;
    currentGuess = [];
    
    if (isNewGame) {
        totalScore = 0;
        roundNumber = 1;
        usedWords.clear();
        updateScoreDisplay();
        updateRoundDisplay();
    }

    // Choose a random word length between 5 and 8
    function getNewWord() {
        let attempts = 0;
    
        while (attempts < 100) {
            const len = Math.floor(Math.random() * 4) + 5; // 5–8
            const candidates = wordLists[len].filter(word => !usedWords.has(word));
    
            if (candidates.length > 0) {
                const word = candidates[Math.floor(Math.random() * candidates.length)];
                usedWords.add(word);
                return { word, length: len };
            }
    
            attempts++;
        }
    
        alert("⚠️ Out of unique words!");
        return { word: "error", length: 5 };
    }
    
    const { word, length } = getNewWord();
    currentWord = word;
    wordLength = length;

    document.getElementById("current-length").textContent = `Word length: ${wordLength}`;
    // Clear the board
    const board = document.getElementById("board");
    board.innerHTML = "";
    boardTiles = [];
    
    // Create the board with tiles based on the word length
    for (let i = 0; i < guessesAllowed; i++) {
        const row = document.createElement("div");
        row.className = "row";
        const rowTiles = [];
        
        for (let j = 0; j < wordLength; j++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            row.appendChild(tile);
            rowTiles.push(tile);
        }
        
        board.appendChild(row);
        boardTiles.push(rowTiles);
    }
    
    // Reset the keyboard
    const keys = document.querySelectorAll(".key");
    keys.forEach(key => {
        key.classList.remove("correct", "present", "absent");
    });

    // Adjust the tile size based on word length
    const maxTileSize = 62;
    const minTileSize = 40;
    const boardWidth = Math.min(500, window.innerWidth - 40);
    const tileSize = Math.max(minTileSize, Math.min(maxTileSize, (boardWidth - (wordLength - 1) * 5) / wordLength));
    
    document.querySelectorAll(".tile").forEach(tile => {
        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
        tile.style.fontSize = `${tileSize / 2}px`;
    });
}



// Start next round
function nextRound() {
    roundNumber++;
    updateRoundDisplay();
    initGame(false);
    console.log(team_name)
    fetch('/next_round', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ team_name: team_name, totalScore: totalScore, roundNumber: roundNumber })
    })
    .then(res => res.json())
    .then(data => {
        console.log("✅ Round updated on server:", data);
    });
}

// Update the score display
function updateScoreDisplay() {
    document.getElementById("score-display").textContent = `Score: ${totalScore}`;
}

// Update the round display
function updateRoundDisplay() {
    document.getElementById("rounds-display").textContent = `Round: ${roundNumber}`;
}

// Handle keyboard input
function handleKeyPress(key) {
    if (gameOver) return;
    console.log(key)
    if (key === "Enter") {
        submitGuess();
    } else if (key === "Backspace") {
        deleteLetter();
    } else if (/^[a-z]$/.test(key)) {
        addLetter(key);
    }
}

// Add a letter to the current guess
function addLetter(letter) {
    console.log(letter)
    if (currentGuess.length < wordLength) {
        currentGuess.push(letter);
        boardTiles[currentRow][currentGuess.length - 1].textContent = letter;
    }
}

// Delete the last letter from the current guess
function deleteLetter() {
    if (currentGuess.length > 0) {
        boardTiles[currentRow][currentGuess.length - 1].textContent = "";
        currentGuess.pop();
    }
}

// Submit the current guess
function submitGuess() {
    if (currentGuess.length !== wordLength) {
        showMessage("Not enough letters");
        shakeRow();
        return;
    }
    
    const guess = currentGuess.join("");
    
    // No word validation needed - any combination is allowed
    
    // Check the guess against the target word
    checkGuess(guess);
    
    // Clear the current guess
    currentGuess = [];
    
    // Move to the next row
    currentRow++;
    
    // Check if the game is over
    if (guess === currentWord) {
        const roundScore = calculateScore(wordLength, currentRow);
        totalScore += roundScore;
        updateScoreDisplay();
        console.log(totalScore)
        gameWon(roundScore);
    } else if (currentRow >= guessesAllowed) {
        gameLost();
    }
}

// Check the guess against the target word
function checkGuess(guess) {
    // Create a copy of the target word for letter frequency counting
    let targetWordArray = currentWord.split("");
    
    // First pass: mark correct letters
    for (let i = 0; i < wordLength; i++) {
        const tile = boardTiles[currentRow][i];
        const letter = guess[i];
        const keyEl = document.querySelector(`.key[data-key="${letter}"]`);
        
        if (letter === currentWord[i]) {
            // Mark as correct
            setTimeout(() => {
                tile.classList.add("flip", "correct");
                if (keyEl) keyEl.classList.remove("present", "absent");
                keyEl.classList.add("correct");
            }, i * 100);
            
            // Remove this letter from the target word array for frequency counting
            targetWordArray[i] = null;
        }
    }
    
    // Second pass: mark present or absent letters
    for (let i = 0; i < wordLength; i++) {
        const tile = boardTiles[currentRow][i];
        const letter = guess[i];
        const keyEl = document.querySelector(`.key[data-key="${letter}"]`);
        
        if (letter !== currentWord[i]) {
            // Check if the letter is present elsewhere
            const index = targetWordArray.indexOf(letter);
            
            if (index !== -1) {
                // Mark as present
                setTimeout(() => {
                    tile.classList.add("flip", "present");
                    if (keyEl && !keyEl.classList.contains("correct")) {
                        keyEl.classList.remove("absent");
                        keyEl.classList.add("present");
                    }
                }, i * 100);
                
                // Remove this letter from the target word array for frequency counting
                targetWordArray[index] = null;
            } else {
                // Mark as absent
                setTimeout(() => {
                    tile.classList.add("flip", "absent");
                    if (keyEl && !keyEl.classList.contains("correct") && !keyEl.classList.contains("present")) {
                        keyEl.classList.add("absent");
                    }
                }, i * 100);
            }
        }
    }
}

// Show a message to the user
function showMessage(text) {
    const message = document.getElementById("message");
    message.textContent = text;
    message.classList.add("show");
    
    setTimeout(() => {
        message.classList.remove("show");
    }, 2000);
}

// Shake the current row to indicate an invalid guess
function shakeRow() {
    const row = document.querySelector(".board .row:nth-child(" + (currentRow + 1) + ")");
    row.classList.add("shake");
    
    setTimeout(() => {
        row.classList.remove("shake");
    }, 500);
}

// Show the game won modal
function gameWon(roundScore) {
    gameOver = true;
    setTimeout(() => {
        const modal = document.getElementById("game-end-modal");
        const title = document.getElementById("modal-title");
        const message = document.getElementById("modal-message");
        
        title.textContent = "Victory!";
        message.textContent = `You guessed "${currentWord}" in ${currentRow}/${guessesAllowed} attempts!\nRound Score: +${roundScore} | Total Score: ${totalScore}`;
        
        modal.classList.add("show");
    }, wordLength * 100 + 500);
}

// Show the game lost modal
function gameLost() {
    gameOver = true;
    setTimeout(() => {
        const modal = document.getElementById("game-end-modal");
        const title = document.getElementById("modal-title");
        const message = document.getElementById("modal-message");
        
        title.textContent = "Game Over";
        message.textContent = `The word was "${currentWord}". Total Score: ${totalScore}`;
        
        modal.classList.add("show");
    }, wordLength * 100 + 500);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    // Initialize the game
    initGame();
    
    // Keyboard click events
    document.querySelectorAll(".key").forEach(key => {
        key.addEventListener("click", () => {
            const keyValue = key.getAttribute("data-key");
            handleKeyPress(keyValue);
        });
    });
    
    // Physical keyboard events
    document.addEventListener("keydown", (e) => {
        const key = e.key.toLowerCase();
        
        if (key === "enter" || key === "backspace" || /^[a-z]$/.test(key)) {
            handleKeyPress(key);
        }
    });
    
    // New game button
    document.getElementById("new-game").addEventListener("click", () => initGame(true));
    
    // Next round button in modal
    document.getElementById("next-round").addEventListener("click", () => {
        document.getElementById("game-end-modal").classList.remove("show");
        nextRound();
    });
    
    // Play again (new game) button in modal
    document.getElementById("play-again").addEventListener("click", () => {
        document.getElementById("game-end-modal").classList.remove("show");
        initGame(true);
    });
});

// Handle window resize
window.addEventListener("resize", () => {
    // Adjust the tile size based on word length
    const maxTileSize = 62;
    const minTileSize = 40;
    const boardWidth = Math.min(500, window.innerWidth - 40);
    const tileSize = Math.max(minTileSize, Math.min(maxTileSize, (boardWidth - (wordLength - 1) * 5) / wordLength));
    
    document.querySelectorAll(".tile").forEach(tile => {
        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
        tile.style.fontSize = `${tileSize / 2}px`;
    });
});
    
let registeredTeamName = "";
let sessionId = 1;  // You can make this dynamic later

function registerTeam() {
    const teamName = document.getElementById("teamNameInput").value;
    if (!teamName) {
        alert("Enter a team name");
        return;
    }
    fetch("register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_name: teamName })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.message === "Registered" || data.message === "Team already exists") {
            registeredTeamName = teamName;
        }
    });
}

function submitFinalScore(score) {
    if (!registeredTeamName) {
        alert("Register a team first");
        return;
    }
    fetch("/submit_score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_name: registeredTeamName, score: score, session_id: sessionId })
    })
    .then(res => res.json())
    .then(data => console.log(data));
}

function showLeaderboard() {
    fetch(`/leaderboard/${sessionId}`)
        .then(res => res.json())
        .then(data => {
            const leaderboard = data.map(entry => `${entry.team}: ${entry.score}`).join("\n");
            document.getElementById("leaderboard").textContent = leaderboard;
        });
}