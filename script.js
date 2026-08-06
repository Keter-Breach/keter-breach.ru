// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И СОСТОЯНИЕ ИГРЫ
// ==========================================

let gameState = {
    currentBlock: 'block-menu',
    xp: 0,
    rank: 'Подопытный D-9341',
    unlockedArchive: [] // Массив ID разблокированных SCP (например, ['scp999', 'scp173'])
};

// Правильные ответы для каждого терминала
const ANSWERS = {
    'block-d': '3',
    'block-0': 'медик',
    'block-2': 'обезопасить удержать сохранить',
    'block-3': 'брайт',
    'block-4': ['а', 'a', 'f'], // Принимает русскую "а", английскую "a" и "f"
    'keter': 'девятихвостая лиса-1',
    'chaos': 'гидра'
};

// При загрузке страницы восстанавливаем прогресс и вешаем слушатели
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    updateUI();
});

// ==========================================
// 2. УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ И НАВИГАЦИЕЙ
// ==========================================

// Переключение видимого терминала/экрана
function showBlock(blockId) {
    // Скрываем все терминалы
    const allBlocks = document.querySelectorAll('.terminal');
    allBlocks.forEach(b => b.classList.add('hidden'));

    // Показываем целевой блок
    const targetBlock = document.getElementById(blockId);
    if (targetBlock) {
        targetBlock.classList.remove('hidden');
        gameState.currentBlock = blockId;
        saveProgress();
    }

    // Верхняя панель видна всегда, кроме Главного меню и Энциклопедии из меню
    const topPanel = document.getElementById('player-panel');
    if (blockId === 'block-menu' || blockId === 'block-encyclopedia') {
        topPanel.classList.add('hidden');
    } else {
        topPanel.classList.remove('hidden');
    }
}

// Запуск игры из меню
function startGame() {
    showBlock(gameState.currentBlock === 'block-menu' ? 'block-d' : gameState.currentBlock);
}

// Начисление XP и обновление ранга
function addXP(amount) {
    gameState.xp += amount;
    
    // Обновление ранга по мере накопления XP
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

// Обновление верха экрана и состояния карт в архиве
function updateUI() {
    const rankEl = document.getElementById('player-rank');
    const xpEl = document.getElementById('player-xp');
    
    if (rankEl) rankEl.textContent = gameState.rank;
    if (xpEl) xpEl.textContent = gameState.xp;

    // Обновляем карточки в энциклопедии
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
// 4. ЛОГИКА ПРОВЕРКИ И ПЕРЕХОДОВ ПО УРОВНЯМ
// ==========================================

// Универсальная функция проверки текстовых паролей
function verifyCode(blockId, nextLevel) {
    const input = document.getElementById(`input-${blockId}`);
    if (!input) return;

    const userVal = input.value.trim().toLowerCase();
    const correctAns = ANSWERS[blockId];
    
    // Проверяем, совпадает ли ответ (учитывая, что correctAns может быть массивом)
    const isCorrect = Array.isArray(correctAns) ? correctAns.includes(userVal) : userVal === correctAns;

    if (isCorrect) {
        alert("ДОСТУП ВОССТАНОВЛЕН. ПАМЯТЬ ОБНОВЛЕНА.");
        input.value = '';
        addXP(50);
        
        // Разблокировка SCP при прохождении
        if (blockId === 'block-d') unlockArchiveCard('scp173');
        if (blockId === 'block-0') unlockArchiveCard('scp999');
        if (blockId === 'block-2') unlockArchiveCard('scp076');
        if (blockId === 'block-3') unlockArchiveCard('scp682');

        // Карта переходов между уровнями
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

// Уровень 1: Интерактивный выбор при встрече с SCP-096
function quizLevel2(choice) {
    unlockArchiveCard('scp096');

    if (choice === 'close_eyes') {
        alert("ВЫ ЗАКРЫЛИ ГЛАЗА И УПАЛИ НА ПОЛ.\n\nSCP-096 пробегает мимо, разрывая дверь серверной. Вы выжили!");
        addXP(50);
        showBlock('block-2');
    } else if (choice === 'run') {
        triggerHorrorEffect();
        alert("ОШИБКА ВЫЖИВАНИЯ:\n\nВы побежали по коридору, создав шум. SCP-096 услышал вас и нагнал через 3 секунды. Вы погибли.");
    } else if (choice === 'look') {
        triggerHorrorEffect();
        alert("КРИТИЧЕСКАЯ ОШИБКА:\n\nВы посмотрели прямо в лицо SCP-096. Никакое оружие вам не помогло. Вы разодраны на куски.");
    }
}

// Переход в Сектор Кэтер из Уровня 5
function goToKeterSector() {
    showBlock('block-keter');
}

// Финал: Тест в Секторе Кэтер (МОГ)
function quizKeter() {
    const input = document.getElementById('input-block-keter');
    if (!input) return;

    const val = input.value.trim().toLowerCase();

    if (val === ANSWERS['keter']) {
        addXP(100);
        alert("ПРОТОКОЛ ВЫПОЛНЕН!\n\nМОГ «Девятихвостая лиса» прибыла вовремя. SCP-682 заблокирован в кислотном баке. Вы спасли Зону 19 и заняли место в Совете O5!\n\nПОБЕДА (КОНЦОВКА ФОНДА).");
        resetProgress();
    } else {
        // Ошибка перенаправляет к Повстанцам Хаоса
        triggerHorrorEffect();
        alert("ОШИБКА СДЕРЖИВАНИЯ!\n\nСистема не распознала позывной. Защита заслонки отключена. SCP-682 пробивает стену!\n\nСВЯЗЬ ПЕРЕХВАТАНА ПОВСТАНЦАМИ ХАОСА...");
        input.value = '';
        showBlock('block-chaos');
    }
}

// Финал: Ветка Повстанцев Хаоса
function quizChaos() {
    const input = document.getElementById('input-block-chaos');
    if (!input) return;

    const val = input.value.trim().toLowerCase();

    if (val === ANSWERS['chaos']) {
        addXP(100);
        alert("ШИФР ДЕТОНАЦИИ ПРИНЯТ!\n\nПодземные заряды активированы. Зона 19 уничтожена вместе со всеми объектами и Советом O5. Вы эвакуированы вертолетом Повстанцев.\n\nПОБЕДА (КОНЦОВКА ХАОСА).");
        resetProgress();
    } else {
        triggerHorrorEffect();
        alert("НЕВЕРНЫЙ ШИФР!\n\nДельта-Командование оборвало связь, посчитав вас двойным агентом. Вы сгорели в пламени комплекса.");
    }
}

// ==========================================
// 5. ВПОМОГАТЕЛЬНЫЕ И ХОРРОР ЭФФЕКТЫ
// ==========================================

// Визуальный сбой экрана и воспроизведение звука
function triggerHorrorEffect() {
    // Звук глитча
    const audio = document.getElementById('snd-glitch');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {}); // Игнорируем блокировку автовоспроизведения браузером
    }

    // Вспышка красным цветом
    document.body.style.backgroundColor = '#500';
    document.body.style.filter = 'invert(1)';
    
    setTimeout(() => {
        document.body.style.backgroundColor = '';
        document.body.style.filter = '';
    }, 200);
}

// Рандомные пугающие сообщения при неправильном вводе
function showCreepyError() {
    const messages = [
        "ОШИБКА: Ментальная инфекция прогрессирует. Вы уверены, что это ваши мысли?",
        "СИСТЕМА: SCP-173 за вашей спиной. Не моргайте.",
        "ВНИМАНИЕ: Зафиксирован разрыв тканей реальности.",
        "ОШИБКА: {ДАННЫЕ УДАЛЕНЫ}. Субъект теряет человеческую форму...",
        "ГОЛОС В ДИНАМИКЕ: Вы никогда отсюда не выйдете."
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    alert(randomMsg);
}

// Выход из игры в Главное меню
function exitGame() {
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
            console.error("Ошибка чтения сохранения, сброс...", e);
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
    updateUI();
    showBlock('block-menu');
}
