// Инициализация общего состояния игры
let gameState = {
    currentBlock: 'block-menu',
    xp: 0,
    rank: 'Класс D',
    unlockedArchive: []
};

// Хранилище правильных ответов
const ANSWERS = {
    'block-d': '3',
    'block-0': 'медик',
    'block-2': 'обезопасить удержать сохранить',
    'block-3': 'брайт',
    'block-4': 'f',
    'keter': 'девятихвостая лиса-1',
    'chaos': 'гидра'
};

// Загрузка состояния при запуске
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    updateUI();
});

// Вызов хоррор-эффекта и вспышки крови при ошибках
function triggerHorrorEffect() {
    const snd = document.getElementById('snd-glitch');
    if (snd) { 
        snd.currentTime = 0; 
        snd.play().catch(() => {}); 
    }
    
    document.body.classList.add('screen-damage');
    setTimeout(() => {
        document.body.classList.remove('screen-damage');
    }, 350);
}

// Запуск игрового процесса
function startGame() {
    hideAllBlocks();
    document.getElementById('player-panel').classList.remove('hidden');
    showBlock('block-d');
    addXP(10);
}

// Управление видимостью терминальных блоков
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

// Проверка текстовых ответов
function verifyCode(blockId, nextLevel) {
    const input = document.getElementById(`input-${blockId}`);
    if (!input) return;

    const userVal = input.value.trim().toLowerCase();

    if (userVal === ANSWERS[blockId]) {
        alert("АВТОРИЗАЦИЯ УСПЕШНА. ДОСТУП ПРЕДОСТАВЛЕН.");
        input.value = '';
        addXP(50);
        
        if (blockId === 'block-0') unlockArchiveCard('scp999');
        if (blockId === 'block-2') unlockArchiveCard('scp076');
        
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
        const creepyMessages = [
            "ОШИБКА: Объект SCP-173 находится прямо за вами. Не моргайте.",
            "СИСТЕМА: Потеря био-сигнала оператора. Кто вводит данные?",
            "ВНИМАНИЕ: Неуязвимая рептилия пробила изоляцию сектора.",
            "ОШИБКА: {ДАННЫЕ УДАЛЕНЫ}. Слышны шаги в вентиляции..."
        ];
        alert(creepyMessages[Math.floor(Math.random() * creepyMessages.length)]);
    }
}

// Выбор действий на Уровне 1
function quizLevel2(choice) {
    if (choice === 'close_eyes') {
        alert("Вы закрыли глаза и отвернулись. Скромник пробежал мимо, игнорируя вас!");
        addXP(100);
        unlockArchiveCard('scp096');
        showBlock('block-2');
    } else {
        triggerHorrorEffect();
        alert("КРИТИЧЕСКАЯ ОШИБКА: SCP-096 вошел в состояние ярости. Вы уничтожены.");
        resetProgress();
    }
}

// Эвакуация в Сектор Кэтер
function goToKeterSector() {
    unlockArchiveCard('scp682');
    showBlock('block-keter');
}

// Финальные проверки
function quizKeter() {
    const input = document.getElementById('input-block-keter');
    const val = input ? input.value.trim().toLowerCase() : '';

    if (val === ANSWERS['keter']) {
        alert("ГИДРОХЛОРИДНАЯ КИСЛОТА ПОДАНА. SCP-682 УСЫПЛЕН. ЗОНА 19 СПАСЕНА!");
        addXP(500);
        location.reload();
    } else {
        triggerHorrorEffect();
        alert("ОШИБКА СИСТЕМЫ: SCP-682 пробил защитный барьер...");
        showBlock('block-chaos');
    }
}

function quizChaos() {
    const input = document.getElementById('input-block-chaos');
    const val = input ? input.value.trim().toLowerCase() : '';

    if (val === ANSWERS['chaos']) {
        alert("ЗАРЯДЫ АКТИВИРОВАНЫ. ЗОНА 19 УНИЧТОЖЕНА. ВЫ ВЫБРАЛИ ПУТЬ ХАОСА.");
        resetProgress();
    } else {
        triggerHorrorEffect();
        alert("НЕВЕРНЫЙ ШИФР: Система безопасности Фонда успела выжечь терминал.");
        resetProgress();
    }
}

// Управление Архивом с перезагрузкой при закрытии
function toggleArchiveView() {
    const enc = document.getElementById('block-encyclopedia');
    
    // Если Архив уже открыт — при нажатии "Вернуться" перезагружаем страницу
    if (!enc.classList.contains('hidden')) {
        location.reload(); 
    } else {
        hideAllBlocks();
        enc.classList.remove('hidden');
    }
}

function openArchiveFromMenu() {
    hideAllBlocks();
    document.getElementById('block-encyclopedia').classList.remove('hidden');
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

// Система опыта
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

// LocalStorage операции
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
    alert("Память очищена. Перезапуск системы...");
    location.reload();
}

function exitGame() {
    alert("Выход из системы. До встречи, агент.");
    resetProgress();
}
