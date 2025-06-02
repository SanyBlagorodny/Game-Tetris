// Константы игры
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#00f0f0', // I
    '#0000f0', // J
    '#f0a000', // L
    '#f0f000', // O
    '#00f000', // S
    '#a000f0', // T
    '#f00000'  // Z
];

// Формы тетромино
const SHAPES = [
    null,
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
    [[0, 4, 4], [0, 4, 4], [0, 0, 0]],                         // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
];

// Система подсчета очков
const SCORES = {
    1: 100,
    2: 300,
    3: 500,
    4: 800
};

// Переменные игры
let canvas, ctx;
let nextCanvas, nextCtx;
let board = createMatrix(COLS, ROWS);
let piece, nextPiece;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId;

// Элементы DOM
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const gameOverElement = document.getElementById('game-over');
const pauseScreenElement = document.getElementById('pause-screen');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const rotateBtn = document.getElementById('rotate-btn');
const softDropBtn = document.getElementById('soft-drop-btn');
const hardDropBtn = document.getElementById('hard-drop-btn');

// Инициализация игры
function init() {
    canvas = document.getElementById('game-board');
    ctx = canvas.getContext('2d');
    
    nextCanvas = document.getElementById('next-piece');
    nextCtx = nextCanvas.getContext('2d');
    
    // Масштабирование canvas для экранов с высоким DPI
    scaleCanvas(canvas, ctx);
    scaleCanvas(nextCanvas, nextCtx);
    
    // Обработчики событий
    document.addEventListener('keydown', handleKeyPress);
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', resetGame);
    leftBtn.addEventListener('click', () => movePiece(-1));
    rightBtn.addEventListener('click', () => movePiece(1));
    rotateBtn.addEventListener('click', rotatePiece);
    softDropBtn.addEventListener('click', () => movePiece(0, 1));
    hardDropBtn.addEventListener('click', hardDrop);
    
    // Отрисовка начального пустого поля
    drawBoard();
    drawNextPiece();
}

// Масштабирование canvas для экранов с высоким DPI
function scaleCanvas(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
}

// Создание 2D матрицы
function createMatrix(width, height) {
    const matrix = [];
    while (height--) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

// Создание фигуры тетромино
function createPiece(type) {
    const shape = SHAPES[type];
    const piece = {
        position: {x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0},
        shape: shape,
        type: type
    };
    return piece;
}

// Отрисовка игрового поля
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка сетки
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                ctx.fillStyle = COLORS[board[y][x]];
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
    
    // Отрисовка текущей фигуры
    if (piece) {
        drawPiece(piece);
        
        // Отрисовка "призрачной" фигуры (предпросмотр места)
        const ghost = calculateGhostPosition();
        drawPiece(ghost, true);
    }
}

// Отрисовка фигуры тетромино
function drawPiece(p, isGhost = false) {
    p.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                if (isGhost) {
                    ctx.fillStyle = COLORS[p.type] + '80';
                } else {
                    ctx.fillStyle = COLORS[p.type];
                }
                
                ctx.fillRect(
                    (p.position.x + x) * BLOCK_SIZE,
                    (p.position.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE, BLOCK_SIZE
                );
                
                if (!isGhost) {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.strokeRect(
                        (p.position.x + x) * BLOCK_SIZE,
                        (p.position.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE, BLOCK_SIZE
                    );
                }
            }
        });
    });
}

// Расчет позиции "призрачной" фигуры (где фигура окажется при падении)
function calculateGhostPosition() {
    const ghost = {
        position: {x: piece.position.x, y: piece.position.y},
        shape: piece.shape,
        type: piece.type
    };
    
    while (!collision(ghost)) {
        ghost.position.y++;
    }
    
    ghost.position.y--;
    return ghost;
}

// Отрисовка следующей фигуры (превью)
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const blockSize = 25;
        const offsetX = (nextCanvas.width / 4 - (nextPiece.shape[0].length * blockSize) / 2) / 4;
        const offsetY = (nextCanvas.height / 4 - (nextPiece.shape.length * blockSize) / 2) / 4;
        
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    nextCtx.fillStyle = COLORS[nextPiece.type];
                    nextCtx.fillRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize, blockSize
                    );
                    
                    nextCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                    nextCtx.strokeRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize, blockSize
                    );
                }
            });
        });
    }
}

// Проверка на столкновения
function collision(p) {
    for (let y = 0; y < p.shape.length; y++) {
        for (let x = 0; x < p.shape[y].length; x++) {
            if (p.shape[y][x] !== 0 &&
                (board[p.position.y + y] === undefined ||
                 board[p.position.y + y][p.position.x + x] === undefined ||
                 board[p.position.y + y][p.position.x + x] !== 0)) {
                return true;
            }
        }
    }
    return false;
}

// Поворот текущей фигуры
function rotatePiece() {
    if (gameOver || paused) return;
    
    const originalShape = piece.shape;
    const originalPosition = {...piece.position};
    
    // Транспонирование матрицы
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    const newShape = createMatrix(cols, rows);
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            newShape[x][y] = piece.shape[y][x];
        }
    }
    
    // Реверс каждой строки для поворота по часовой стрелке
    piece.shape = newShape.map(row => row.reverse());
    
    // "Wall kick" - если поворот вызывает столкновение, попробуем скорректировать позицию
    if (collision(piece)) {
        // Попробуем сдвинуть влево
        piece.position.x -= 1;
        if (collision(piece)) {
            // Попробуем сдвинуть вправо
            piece.position.x += 2;
            if (collision(piece)) {
                // Попробуем сдвинуть еще правее
                piece.position.x += 1;
                if (collision(piece)) {
                    // Возвращаем исходную позицию и форму
                    piece.position.x = originalPosition.x;
                    piece.shape = originalShape;
                    return;
                }
            }
        }
    }
    
    drawBoard();
}

// Перемещение текущей фигуры
function movePiece(offsetX, offsetY = 0) {
    if (gameOver || paused) return;
    
    piece.position.x += offsetX;
    piece.position.y += offsetY;
    
    if (collision(piece)) {
        piece.position.x -= offsetX;
        piece.position.y -= offsetY;
        
        // Если движение вниз вызвало столкновение, фиксируем фигуру
        if (offsetY > 0) {
            lockPiece();
            return;
        }
        
        return false;
    }
    
    drawBoard();
    return true;
}

// Мгновенное падение - фигура сразу падает вниз
function hardDrop() {
    if (gameOver || paused) return;
    
    // Сохраняем исходную позицию
    const originalY = piece.position.y;
    
    // Продолжаем движение вниз до столкновения
    while (movePiece(0, 1)) {
        // Пустое тело цикла - все действия в условии while
    }
    
    // Если фигура не переместилась (уже была на дне), не фиксируем ее снова!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    if (piece.position.y > originalY) {
        lockPiece();
    }
}

// Фиксация текущей фигуры и проверка заполненных линий
function lockPiece() {
    // Добавление фигуры на поле
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[y + piece.position.y][x + piece.position.x] = piece.type;
            }
        });
    });
    
    // Проверка заполненных линий
    const linesCleared = checkLines();
    if (linesCleared > 0) {
        updateScore(linesCleared);
        drawBoard();
        
        // Анимация мигания для очищенных линий
        const linesToFlash = [];
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                linesToFlash.push(y);
            }
        }
        
        flashLines(linesToFlash);
    }
    
    // Получение следующей фигуры
    piece = nextPiece;
    nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
    drawNextPiece();
    
    // Проверка на окончание игры только если новая фигура сразу сталкивается
    if (collision(piece)) {
        gameOver = true;
        gameOverElement.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
        cancelAnimationFrame(animationId);
    }
}

// Проверка заполненных линий
function checkLines() {
    let linesCleared = 0;
    
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        // Удаление линии
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        linesCleared++;
        y++; // Проверяем ту же строку снова (теперь с новым содержимым)
    }
    
    return linesCleared;
}

// Анимация мигания для очищенных линий
function flashLines(lines) {
    const originalColors = [];
    
    // Сохраняем исходные цвета
    lines.forEach(y => {
        originalColors[y] = [];
        for (let x = 0; x < COLS; x++) {
            originalColors[y][x] = board[y][x];
            board[y][x] = 8; // Цвет мигания
        }
    });
    
    // Отрисовка с цветом мигания
    drawBoard();
    
    // После задержки восстанавливаем исходные цвета
    setTimeout(() => {
        lines.forEach(y => {
            for (let x = 0; x < COLS; x++) {
                board[y][x] = originalColors[y][x];
            }
        });
        drawBoard();
    }, 200);
}

// Обновление счета на основе очищенных линий
function updateScore(linesCleared) {
    score += SCORES[linesCleared] * level;
    lines += linesCleared;
    
    // Повышение уровня каждые 10 линий
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        levelElement.textContent = level;
    }
    
    scoreElement.textContent = score;
    linesElement.textContent = lines;
}

// Игровой цикл
function update(time = 0) {
    if (gameOver || paused) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        movePiece(0, 1);
        dropCounter = 0;
    }
    
    drawBoard();
    animationId = requestAnimationFrame(update);
}

// Обработка нажатий клавиш
function handleKeyPress(e) {
    if (gameOver) return;
    
    switch (e.keyCode) {
        case 37: // Стрелка влево
            movePiece(-1);
            break;
        case 39: // Стрелка вправо
            movePiece(1);
            break;
        case 40: // Стрелка вниз
            movePiece(0, 1);
            break;
        case 38: // Стрелка вверх
            rotatePiece();
            break;
        case 32: // Пробел
            hardDrop();
            break;
        case 80: // P
            togglePause();
            break;
    }
}

// Начало новой игры
function startGame() {
    if (!gameOver && piece) return; // Игра уже идет
    
    resetGame();
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    update();
}

// Переключение паузы
function togglePause() {
    paused = !paused;
    
    if (paused) {
        pauseScreenElement.classList.remove('hidden');
        cancelAnimationFrame(animationId);
    } else {
        pauseScreenElement.classList.add('hidden');
        lastTime = performance.now();
        dropCounter = 0;
        update();
    }
}

// Сброс состояния игры
function resetGame() {
    board = createMatrix(COLS, ROWS);
    piece = createPiece(Math.floor(Math.random() * 7) + 1);
    nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    paused = false;
    dropInterval = 1000;
    
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
    
    gameOverElement.classList.add('hidden');
    pauseScreenElement.classList.add('hidden');
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    
    drawBoard();
    drawNextPiece();
}

// Инициализация игры при загрузке страницы
window.addEventListener('load', init);