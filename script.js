const canvas = document.getElementById("tetris");
const nextPieceCanvas = document.getElementById("nextPiece");
const ctx = canvas.getContext("2d");
const nextCtx = nextPieceCanvas.getContext("2d");
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const gameOverScreen = document.getElementById("game-over-screen");
const pauseScreen = document.getElementById("pause-screen");
const highScoresList = document.getElementById("highScoresList");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextPieceCanvas.width = 4 * BLOCK_SIZE;
nextPieceCanvas.height = 4 * BLOCK_SIZE;

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let score = 0;
let level = 1;
let gameOver = false;
let isPaused = false;
let gameStarted = false;
let gameInterval;
let nextPiece = null;
let currentPiece = null;

const COLORS = [
    "#FF0000", // Vermelho
    "#00FF00", // Verde
    "#0000FF", // Azul
    "#FFFF00", // Amarelo
    "#00FFFF", // Ciano
    "#FF00FF", // Magenta
    "#FFA500"  // Laranja
];

const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]], // Z
    [[1, 1, 1], [1, 0, 0]], // L
    [[1, 1, 1], [0, 0, 1]] // J
];

class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.x = 3;
        this.y = 0;
    }

    draw(context, offsetX = 0, offsetY = 0) {
        context.fillStyle = this.color;
        this.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    context.fillRect(
                        (this.x + x + offsetX) * BLOCK_SIZE,
                        (this.y + y + offsetY) * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                    context.strokeStyle = "rgba(255, 255, 255, 0.3)";
                    context.strokeRect(
                        (this.x + x + offsetX) * BLOCK_SIZE,
                        (this.y + y + offsetY) * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                }
            });
        });
    }

    moveDown() {
        this.y++;
        if (this.collision()) {
            this.y--;
            this.merge();
            return true;
        }
        return false;
    }

    moveLeft() {
        this.x--;
        if (this.collision()) this.x++;
    }

    moveRight() {
        this.x++;
        if (this.collision()) this.x--;
    }

    rotate() {
        const rotated = this.shape[0].map((_, index) =>
            this.shape.map(row => row[index]).reverse()
        );
        const oldShape = this.shape;
        this.shape = rotated;
        if (this.collision()) this.shape = oldShape;
    }

    collision() {
        return this.shape.some((row, y) =>
            row.some((cell, x) => {
                if (!cell) return false;
                const newY = this.y + y;
                const newX = this.x + x;
                if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                return board[newY][newX] !== null;
            })
        );
    }

    merge() {
        this.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    const boardY = this.y + y;
                    const boardX = this.x + x;
                    if (boardY < 0) {
                        gameOver = true;
                        showGameOver();
                        return;
                    }
                    board[boardY][boardX] = this.color;
                }
            });
        });
        removeFullRows();
    }
}

function createNewPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    return new Piece(SHAPES[shapeIndex], COLORS[shapeIndex]);
}

function removeFullRows() {
    let rowsCleared = 0;
    board = board.filter(row => {
        if (row.every(cell => cell !== null)) {
            rowsCleared++;
            return false;
        }
        return true;
    });

    while (board.length < ROWS) {
        board.unshift(Array(COLS).fill(null));
    }

    if (rowsCleared > 0) {
        score += rowsCleared * 100 * level;
        scoreElement.textContent = score;
        
        // Aumentar nível a cada 1000 pontos
        const newLevel = Math.floor(score / 1000) + 1;
        if (newLevel > level) {
            level = newLevel;
            levelElement.textContent = level;
            updateGameSpeed();
        }
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar grade
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }

    // Desenhar peças
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                ctx.fillStyle = board[row][col];
                ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
                ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    if (nextPiece) {
        // Calcula o tamanho real da peça
        const shape = nextPiece.shape;
        const pieceWidth = shape[0].length;
        const pieceHeight = shape.length;
        // Centraliza a peça no canvas
        const offsetX = ((nextPieceCanvas.width / BLOCK_SIZE) - pieceWidth) / 2;
        const offsetY = ((nextPieceCanvas.height / BLOCK_SIZE) - pieceHeight) / 2;
        // Desenha a peça no canvas de próxima peça
        nextPiece.draw(nextCtx, offsetX - nextPiece.x, offsetY - nextPiece.y);
    }
}

function updateGameSpeed() {
    clearInterval(gameInterval);
    const speed = Math.max(100, 500 - (level - 1) * 50);
    gameInterval = setInterval(gameLoop, speed);
}

function gameLoop() {
    if (!gameStarted || isPaused || gameOver) return;
    
    if (currentPiece.moveDown()) {
        currentPiece = nextPiece;
        nextPiece = createNewPiece();
        if (currentPiece.collision()) {
            gameOver = true;
            showGameOver();
            return;
        }
        drawNextPiece();
    }
    draw();
}

function draw() {
    drawBoard();
    if (currentPiece) currentPiece.draw(ctx);
}

function showCelebrationMessage() {
    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    
    const message = document.createElement('div');
    message.className = 'celebration-message';
    message.textContent = 'Parabéns pelo seu recorde!';
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.remove();
    }, 3000);
}

function showDefeatMessage() {
    const overlay = document.createElement('div');
    overlay.className = 'defeat-overlay';
    
    const message = document.createElement('div');
    message.className = 'defeat-message';
    message.textContent = 'Game Over!';
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.remove();
    }, 2000);
}

function showGameOver() {
    const finalScore = document.getElementById("finalScore");
    finalScore.textContent = `Pontuação Final: ${score}`;
    const newHighScore = document.getElementById("newHighScore");
    const highScores = getHighScores();
    if (highScores.length < 3 || score > highScores[highScores.length - 1].score) {
        newHighScore.classList.remove("hidden");
    } else {
        newHighScore.classList.add("hidden");
    }
    showDefeatMessage();
    gameOverScreen.classList.remove("hidden");
    gameStarted = false;
    startBtn.textContent = "Iniciar";
}

function getHighScores() {
    const scores = JSON.parse(localStorage.getItem("tetrisHighScores") || "[]");
    return scores.sort((a, b) => b.score - a.score).slice(0, 3);
}

function saveHighScore() {
    const playerName = document.getElementById("playerName").value.trim();
    if (!playerName) return;

    const highScores = getHighScores();
    const isNewRecord = highScores.length === 0 || score > highScores[0].score;
    
    highScores.push({ name: playerName, score: score });
    highScores.sort((a, b) => b.score - a.score);
    
    localStorage.setItem("tetrisHighScores", JSON.stringify(highScores.slice(0, 3)));
    updateHighScoresList();
    document.getElementById("newHighScore").classList.add("hidden");
    
    if (isNewRecord) {
        showCelebrationMessage();
    }
}

function updateHighScoresList() {
    const scores = getHighScores();
    // Detecta se está no mobile
    const isMobile = window.innerWidth <= 500;
    if (isMobile) {
        if (scores.length > 0) {
            const top = scores[0];
            highScoresList.innerHTML = `<div class='recorde-nome'>${top.name}</div><div class='recorde-pontos'>${top.score}</div>`;
        } else {
            highScoresList.innerHTML = `<div class='recorde-nome'>---</div><div class='recorde-pontos'>0</div>`;
        }
    } else {
        highScoresList.innerHTML = scores.map((score, index) => 
            `<div>${index + 1}º ${score.name}: ${score.score}</div>`
        ).join("");
    }
}

function startGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    level = 1;
    gameOver = false;
    isPaused = false;
    gameStarted = true;
    scoreElement.textContent = score;
    if (levelElement) levelElement.textContent = level;
    currentPiece = createNewPiece();
    nextPiece = createNewPiece();
    updateGameSpeed();
    updateHighScoresList();
    startBtn.textContent = "Reiniciar";
}

function restartGame() {
    gameOverScreen.classList.add("hidden");
    startGame();
}

function togglePause() {
    if (!gameStarted || gameOver) return;
    
    isPaused = !isPaused;
    pauseScreen.classList.toggle("hidden", !isPaused);
    pauseBtn.textContent = isPaused ? "Continuar" : "Pausar";
}

function resumeGame() {
    isPaused = false;
    pauseScreen.classList.add("hidden");
    pauseBtn.textContent = "Pausar";
}

// Controles
document.addEventListener("keydown", (event) => {
    if (!gameStarted || isPaused || gameOver) return;
    
    switch (event.key) {
        case "ArrowDown":
            currentPiece.moveDown();
            break;
        case "ArrowLeft":
            currentPiece.moveLeft();
            break;
        case "ArrowRight":
            currentPiece.moveRight();
            break;
        case "ArrowUp":
            currentPiece.rotate();
            break;
        case " ":
            while (!currentPiece.moveDown());
            break;
    }
    draw();
});

// Adiciona variáveis para controle de toque
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;
let lastTouchTime = 0;

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchMoved = false;
    lastTouchTime = Date.now();
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!gameStarted || isPaused || gameOver) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) currentPiece.moveRight();
        else currentPiece.moveLeft();
        touchMoved = true;
        touchStartX = touch.clientX;
    } else if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) {
        if (dy > 0) currentPiece.moveDown();
        touchMoved = true;
        touchStartY = touch.clientY;
    }
    draw();
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (!gameStarted || isPaused || gameOver) return;
    
    const currentTime = Date.now();
    if (!touchMoved && (currentTime - lastTouchTime) < 300) {
        currentPiece.rotate();
        draw();
    }
}, { passive: false });

// Event listeners para botões
startBtn.addEventListener("click", function() {
    // Sempre reinicia o jogo ao clicar
    if (!gameOverScreen.classList.contains("hidden")) {
        gameOverScreen.classList.add("hidden");
    }
    startGame();
});

pauseBtn.addEventListener("click", togglePause);

// Inicialização
updateHighScoresList();
draw();
