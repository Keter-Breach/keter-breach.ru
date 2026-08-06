// Инициализация состояния
let gameState = {
    currentBlock: 'block-menu',
    xp: 0,
    rank: 'Подопытный D-9341',
    unlockedArchive: []
};

// Хранилище ответов (с учетом возможного ввода английской "a")
const ANSWERS = {
    'block-d': '3',
    'block-0': 'медик',
    'block-2': 'обезопасить удержать сохранить',
    'block-3': 'брайт',
    'block-4': ['а', 'a', 'f'], // Принимает варианты
    'keter': 'девятихвостая лиса-1',
    'chaos': 'гидра'
};

// Проверка текстовых ответов
function verifyCode(blockId, nextLevel) {
    const input = document.getElementById(`input-${blockId}`);
    if (!input) return;

    const userVal = input.value.trim().toLowerCase();
    const correctAns = ANSWERS[blockId];
    
    // Проверка (поддерживает как строки, так и массивы ответов)
    const isCorrect = Array.isArray(correctAns) ? correctAns.includes(userVal) : userVal === correctAns;

    if (isCorrect) {
        alert("ДОСТУП ВОССТАНОВЛЕН. ПАМЯТЬ ОБНОВЛЕНА.");
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
            "ОШИБКА: Ментальная инфекция прогрессирует. Вы уверены, что это ваши мысли?",
            "СИСТЕМА: SCP-173 за вашей спиной. Не моргайте.",
            "ВНИМАНИЕ: Зафиксирован разрыв тканей реальности.",
            "ОШИБКА: {ДАННЫЕ УДАЛЕНЫ}. Субъект теряет человеческую форму..."
        ];
        alert(creepyMessages[Math.floor(Math.random() * creepyMessages.length)]);
    }
}

// Система динамических рангов в зависимости от опыта
function addXP(amount) {
    gameState.xp += amount;
    if (gameState.xp >= 300) gameState.rank = 'Бывший Директор Зоны';
    else if (gameState.xp >= 150) gameState.rank = 'Спецагент Фонда';
    else if (gameState.xp >= 50) gameState.rank = 'Ученый без памяти';
    
    saveProgress();
    updateUI();
}
