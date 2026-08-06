// Состояние игры по умолчанию
let gameState = {
    currentBlock: 'block-menu',
    xp: 0,
    rank: 'Класс D',
    unlockedArchive: []
};

// Правильные ответы для текстовых ввода (хранятся в JS, а не в HTML)
const ANSWERS = {
    'block-d': '3',
    'block-0': 'медик',
    'block-2': 'обезопасить удержать сохранить',
    'block-3': 'брайт',
    'block-4': 'f', // Каноничный амнезиак полной очистки
    'keter': 'девятихвостая лиса-1',
    'chaos': 'гидра'
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    updateUI();
});

// Начать игру
function startGame() {
    hideAllBlocks();
    showBlock('block-d');
    addXP(10);
}

// Переключение блоков
function showBlock(blockId) {
    hideAllBlocks();
    const target = document.getElementById(blockId);
    if (target) {
        target.classList.remove('hidden');
        gameState.currentBlock = blockId;
        saveProgress();
    }
}

function hideAllBlocks() {
    const blocks = document.querySelectorAll('.terminal');
    blocks.forEach(b => b.classList.add('hidden'));
}

// Система проверки текстовых ответов
function verifyCode(blockId, nextLevel) {
    const input = document.getElementById(`input-${blockId}`);
    if (!input) return;

    const userVal = input.value.trim().toLowerCase();

    if (userVal === ANSWERS[blockId]) {
        alert("АВТОРИЗАЦИЯ УСПЕШНА. ДОСТУП ПРЕДОСТАВЛЕН.");
        input.value = '';
        addXP(50);
        
        // Разблокировка объектов в Архиве
        if (blockId === 'block-0') unlockArchiveCard('scp999');
        if (blockId === 'block-2') unlockArchiveCard('scp076');
        
        // Переход дальше
        const nextMap = {
            'block-d': 'block-0',
            'block-0': 'block-1',
            'block-2': 'block-3',
            'block-3': 'block-4',
            'block-4': 'block-5'
        };
        showBlock(nextMap[blockId]);
    } else {
        alert("ОШИБКА ДОСТУПА: Неверный код или пароль!");
    }
}

// Вопрос выбора на Уровне 1 (SCP-096)
function quizLevel2(choice) {
    if (choice === 'close_eyes') {
        alert("Вы закрыли глаза и отвернулись. Скромник пробежал мимо, игнорируя вас!");
        addXP(100);
        unlockArchiveCard('scp096');
        showBlock('block-2');
    } else {
        alert("КРИТИЧЕСКАЯ ОШИБКА: SCP-096 вошел в состояние ярости. Вы уничтожены.");
        resetProgress();
    }
}

// Переход в Сектор Кэтер
function goToKeterSector() {
    unlockArchiveCard('scp682');
    showBlock('block-keter');
}

// Финал: Заливка кислотой
function quizKeter() {
    const input = document.getElementById('input-block-keter');
    const val = input ? input.value.trim().toLowerCase() : '';

    if (val === ANSWERS['keter']) {
        alert("ГИДРОХЛОРИДНАЯ КИСЛОТА ПОДАНА. SCP-682 УСЫПЛЕН. ЗОНА 19 СПАСЕНА!");
        addXP(500);
        showBlock('block-menu');
    } else {
        alert("ОШИБКА СИСТЕМЫ: SCP-682 пробил защитный барьер...");
        showBlock('block-chaos'); // При ошибке перехватывают Повстанцы
    }
}

// Финал: Повстанцы Хаоса
function quizChaos() {
    const input = document.getElementById('input-block-chaos');
    const val = input ? input.value.trim().toLowerCase() : '';

    if (val === ANSWERS['chaos']) {
        alert("ЗАРЯДЫ АКТИВИРОВАНЫ. ЗОНА 19 УНИЧТОЖЕНА. ВЫ ВЫБРАЛИ ПУТЬ ХАОСА.");
        resetProgress();
    } else {
        alert("НЕВЕРНЫЙ ШИФР: Система безопасности Фонда успела выжечь терминал.");
        resetProgress();
    }
}

// Управление архивом
function toggleArchiveView() {
    const enc = document.getElementById('block-encyclopedia');
    if (enc.classList.contains('hidden')) {
        enc.classList.remove('hidden');
    } else {
        enc.classList.add('hidden');
    }
}

function openArchiveFromMenu() {
    showBlock('block-encyclopedia');
}

function unlockArchiveCard(scpId) {
    if (!gameState.unlockedArchive.includes(scpId)) {
        gameState.unlockedArchive.push(scpId);
        saveProgress();
        updateArchiveUI();
    }
}

function updateArchiveUI() {
    gameState.unlockedArchive.forEach(scpId => {
        const lockedCard = document.getElementById(`card-${scpId}-locked`);
        const openCard = document.getElementById(`card-${scpId}`);
        if (lockedCard) lockedCard.style.display = 'none';
        if (openCard) openCard.style.display = 'block';
    });
}

// Опыт и ранги
function addXP(amount) {
    gameState.xp += amount;
    if (gameState.xp >= 500) gameState.rank = 'Смотритель O5';
    else if (gameState.xp >= 200) gameState.rank = 'Уровень 4 (Администратор)';
    else if (gameState.xp >= 100) gameState.rank = 'Уровень 2 (Исследователь)';
    
    saveProgress();
    updateUI();
}

function updateUI() {
    const xpEl = document.getElementById('player-xp');
    const rankEl = document.getElementById('player-rank');
    if (xpEl) xpEl.textContent = gameState.xp;
    if (rankEl) rankEl.textContent = gameState.rank;
    updateArchiveUI();
}

// Сохранение и сброс (LocalStorage)
function saveProgress() {
    localStorage.setItem('scp_game_state', JSON.stringify(gameState));
}

function loadProgress() {
    const saved = localStorage.getItem('scp_game_state');
    if (saved) {
        gameState = JSON.parse(saved);
    }
}

function resetProgress() {
    localStorage.removeItem('scp_game_state');
    gameState = { currentBlock: 'block-menu', xp: 0, rank: 'Класс D', unlockedArchive: [] };
    alert("Память очищена (Сброс). Перезапуск терминала...");
    showBlock('block-menu');
    updateUI();
}

function exitGame() {
    alert("Выход из системы. До встречи, агент.");
    resetProgress();
}
