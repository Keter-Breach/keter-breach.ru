// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И СОСТОЯНИЕ ИГРЫ
// ==========================================

let gameState = {
    currentBlock: 'block-menu',
    xp: 0,
    rank: 'Подопытный D-9341',
    unlockedArchive: [] // Хранит ID открытых SCP (например, ['scp173', 'scp049'])
};

// Правильные ответы для каждого терминала
const ANSWERS = {
    'block-d': '3',
    'block-0': 'медик',
    'block-2': 'обезопасить удержать сохранить',
    'block-3': 'брайт',
    'block-4': ['а', 'a', 'f'], // Вариативность языков и клавиш
    'keter': 'девятихвостая лиса-1',
    'chaos': 'гидра'
};

// Загрузка при открытии страницы
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    updateUI();
});

// ==========================================
// 2. УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ И НАВИГАЦИЕЙ
// ==========================================

// Переключение экранов терминала
function showBlock(blockId) {
    const allBlocks = document.querySelectorAll('.terminal');
    allBlocks.forEach(b => b.classList.add('hidden'));

    const targetBlock = document.getElementById(blockId);
    if (targetBlock) {
        targetBlock.classList.remove('hidden');
        gameState.currentBlock = blockId;
        saveProgress();
    }

    // Верхняя панель видна только во время игры
    const topPanel = document.getElementById('player-panel');
    if (topPanel) {
        if (blockId === 'block-menu' || blockId === 'block-encyclopedia') {
            topPanel.classList.add('hidden');
        } else {
            topPanel.classList.remove('hidden');
        }
    }
}

// Запуск игры из меню
function startGame() {
    startAmbientSound(); // Включаем фоновый VHS-шум
    
    // Если игрок был в меню, запускаем с первого уровня (или сохраненного)
    const targetBlock = (gameState.currentBlock === 'block-menu') ? 'block-d' : gameState.currentBlock;
    showBlock(targetBlock);
}

// Начисление XP и рост ранга
function addXP(amount) {
    gameState.xp += amount;
    
    if (gameState.xp >= 300) {
        gameState.rank = 'Бывший Директор Зоны';
    } else if (gameState.xp >= 150) {
        gameState.rank = 'Спецагент Фонда';
    } else if (gameState.xp >= 50) {
        gameState.rank = 'Ученый без памяти';
    }

    saveProgress();
    updateUI();
}

// Обновление верха экрана и карточек архива
function updateUI() {
    const rankEl = document.getElementById('player-rank');
    const xpEl = document.getElementById('player-xp');
    
    if (rankEl) rankEl.textContent = gameState.rank;
    if (xpEl) xpEl.textContent = gameState.xp;

    // Синхронизация открытых карточек SCP
    const allScpKeys = ['scp173', 'scp049', 'scp999', 'scp096', 'scp076', 'scp682'];
    
    allScpKeys.forEach(scp => {
        const activeCard = document.getElementById(`card-${scp}`);
        const lockedCard = document.getElementById(`card-${scp}-locked`);
        
        if (activeCard && lockedCard) {
            if (gameState.unlockedArchive.includes(scp)) {
                activeCard.classList.remove('hidden');
                lockedCard.classList.add('hidden');
            } else {
                activeCard.classList.add('hidden');
                lockedCard.classList.remove('hidden');
            }
        }
    });
}

// ==========================================
// 3. ЭНЦИКЛОПЕДИЯ / АРХИВ
// ==========================================

function openArchiveFromMenu() {
    showBlock('block-encyclopedia');
}

function toggleArchiveView() {
    const enc = document.getElementById('block-encyclopedia');
    if (!enc) return;

    if (enc.classList.contains('hidden')) {
        enc.classList.remove('hidden');
    } else {
        enc.classList.add('hidden');
    }
}

function unlockArchiveCard(scpId) {
    if (!gameState.unlockedArchive.includes(scpId)) {
        gameState.unlockedArchive.push(scpId);
        saveProgress();
        updateUI();
    }
}

// ==========================================
// 4. ЛОГИКА УРОВНЕЙ И ТЕСТОВ
// ==========================================

function verifyCode(blockId) {
    const input = document.getElementById(`input-${blockId}`);
    if (!input) return;

    const userVal = input.value.trim().toLowerCase();
    const correctAns = ANSWERS[blockId];
    
    const isCorrect = Array.isArray(correctAns) ? correctAns.includes(userVal) : userVal === correctAns;

    if (isCorrect) {
        alert("ДОСТУП ВОССТАНОВЛЕН. ПАМЯТЬ ОБНОВЛЕНА.");
        input.value = '';
        addXP(50);
        
        // Разблокировка объектов
        if (blockId === 'block-d') unlockArchiveCard('scp173');
        if (blockId === 'block-0') { unlockArchiveCard('scp049'); unlockArchiveCard('scp999'); }
        if (blockId === 'block-2') unlockArchiveCard('scp076');
        if (blockId === 'block-3') unlockArchiveCard('scp682');

        // Маршрут движения по секторам
        const nextMap = {
            'block-d': 'block-0',
            'block-0': 'block-1',
            'block-2': 'block-3',
            'block-3': 'block-4',
            'block-4': 'block-5'
        };
        
        showBlock(nextMap[blockId]);
    } else {
        triggerHorrorEffect();
        showCreepyError();
    }
}

// Уровень 1: SCP-096 (Выбор действий)
function quizLevel2(choice) {
    unlockArchiveCard('scp096');

    if (choice === 'close_eyes') {
        alert("ВЫ ЗАКРЫЛИ ГЛАЗА И УПАЛИ НА ПОЛ.\n\nSCP-096 пробегает мимо, разрывая дверь серверной. Вы выжили!");
        addXP(50);
        showBlock('block-2');
    } else if (choice === 'run') {
        triggerHorrorEffect();
        alert("ОШИБКА ВЫЖИВАНИЯ:\n\nВы побежали по коридору. SCP-096 услышал шум и нагнал вас за 3 секунды. Вы погибли.");
    } else if (choice === 'look') {
        triggerHorrorEffect();
        alert("КРИТИЧЕСКАЯ ОШИБКА:\n\nВы посмотрели на лицо SCP-096. Никакое оружие не помогло. Вы разодраны на куски.");
    }
}

function goToKeterSector() {
    showBlock('block-keter');
}

// Концовка Фонда
function quizKeter() {
    const input = document.getElementById('input-block-keter');
    if (!input) return;

    if (input.value.trim().toLowerCase() === ANSWERS['keter']) {
        addXP(100);
        alert("ПРОТОКОЛ ВЫПОЛНЕН!\n\nМОГ «Девятихвостая лиса» прибыла вовремя. SCP-682 заблокирован в кислотном баке. Вы спасли Зону 19!\n\nПОБЕДА (КОНЦОВКА ФОНДА).");
        resetProgress();
    } else {
        triggerHorrorEffect();
        alert("ОШИБКА СДЕРЖИВАНИЯ!\n\nСистема не распознала позывной. SCP-682 пробивает стену!\n\nСВЯЗЬ ПЕРЕХВАТАНА ПОВСТАНЦАМИ ХАОСА...");
        input.value = '';
        showBlock('block-chaos');
    }
}

// Концовка Повстанцев Хаоса
function quizChaos() {
    const input = document.getElementById('input-block-chaos');
    if (!input) return;

    if (input.value.trim().toLowerCase() === ANSWERS['chaos']) {
        addXP(100);
        alert("ШИФР ДЕТОНАЦИИ ПРИНЯТ!\n\nПодземные заряды активированы. Зона 19 уничтожена. Вы эвакуированы вертолетом Повстанцев.\n\nПОБЕДА (КОНЦОВКА ХАОСА).");
        resetProgress();
    } else {
        triggerHorrorEffect();
        alert("НЕВЕРНЫЙ ШИФР!\n\nДельта-Командование оборвало связь. Вы сгорели в пламени комплекса.");
    }
}

// ==========================================
// 5. ЗВУКОВЫЕ И ХОРРОР ЭФФЕКТЫ
// ==========================================

// Запуск постоянного эмбиента (белый шум + VHS)
function startAmbientSound() {
    const staticSnd = document.getElementById('snd-static');
    const vhsSnd = document.getElementById('snd-vhs');

    if (staticSnd && vhsSnd) {
        staticSnd.volume = 0.12; // Тихий белый шум
        vhsSnd.volume = 0.20;    // Гул магнитофона

        staticSnd.play().catch(() => {});
        vhsSnd.play().catch(() => {});
    }
}

// Резкое усиление шума при ошибке
function boostStaticNoise() {
    const staticSnd = document.getElementById('snd-static');
    if (staticSnd) {
        staticSnd.volume = 0.55;
        setTimeout(() => {
            staticSnd.volume = 0.12;
        }, 600);
    }
}

// Остановка звука
function stopAmbientSound() {
    const staticSnd = document.getElementById('snd-static');
    const vhsSnd = document.getElementById('snd-vhs');

    if (staticSnd) staticSnd.pause();
    if (vhsSnd) vhsSnd.pause();
}

// Визуальные сбои и глитч-звук при ошибке
function triggerHorrorEffect() {
    boostStaticNoise();

    const audio = document.getElementById('snd-glitch');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    document.body.style.backgroundColor = '#500';
    document.body.style.filter = 'invert(1)';
    
    setTimeout(() => {
        document.body.style.backgroundColor = '';
        document.body.style.filter = '';
    }, 200);
}

// Случайные пугающие ошибки
function showCreepyError() {
    const messages = [
        "ОШИБКА: Ментальная инфекция прогрессирует. Вы уверены, что это ваши мысли?",
        "СИСТЕМА: SCP-173 за вашей спиной. Не моргайте.",
        "ВНИМАНИЕ: Зафиксирован разрыв тканей реальности.",
        "ОШИБКА: {ДАННЫЕ УДАЛЕНЫ}. Субъект теряет человеческую форму...",
        "ГОЛОС В ДИНАМИКЕ: Вы никогда отсюда не выйдете."
    ];
    alert(messages[Math.floor(Math.random() * messages.length)]);
}

// Выход в Главное меню
function exitGame() {
    stopAmbientSound();
    showBlock('block-menu');
}

// ==========================================
// 6. СОХРАНЕНИЕ И СБРОС ПРОГРЕССА
// ==========================================

function saveProgress() {
    localStorage.setItem('keter_game_state', JSON.stringify(gameState));
}

function loadProgress() {
    const saved = localStorage.getItem('keter_game_state');
    if (saved) {
        try {
            gameState = JSON.parse(saved);
        } catch (e) {
            console.error("Ошибка чтения сохранения", e);
        }
    }
}

function resetProgress() {
    localStorage.removeItem('keter_game_state');
    gameState = {
        currentBlock: 'block-menu',
        xp: 0,
        rank: 'Подопытный D-9341',
        unlockedArchive: []
    };
    stopAmbientSound();
    updateUI();
    showBlock('block-menu');
}
