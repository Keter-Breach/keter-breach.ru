// ==========================================
// PROJECT: KETER — ИГРОВАЯ ЛОГИКА И ЛОР
// ==========================================

let gameState = {
    currentBlock: 'block-menu',
    xp: 0,
    rank: 'Агент C-492',
    unlockedArchive: []
};

// Ответы для ключевых терминалов
const ANSWERS = {
    'block-d': '3',
    'block-0': 'медик',
    'block-2': 'обезопасить удержать сохранить',
    'block-3': 'брайт',
    'block-4': ['а', 'a', 'f'],
    'keter': 'девятихвостая лиса-1',
    'chaos': 'гидра'
};

document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    updateUI();
});

// ==========================================
// ПЕРЕКЛЮЧЕНИЕ ИНТЕРФЕЙСА
// ==========================================

function showBlock(blockId) {
    const allBlocks = document.querySelectorAll('.terminal');
    allBlocks.forEach(b => b.classList.add('hidden'));

    const targetBlock = document.getElementById(blockId);
    if (targetBlock) {
        targetBlock.classList.remove('hidden');
        gameState.currentBlock = blockId;
        saveProgress();
    }

    const topPanel = document.getElementById('player-panel');
    if (topPanel) {
        if (blockId === 'block-menu' || blockId === 'block-encyclopedia') {
            topPanel.classList.add('hidden');
        } else {
            topPanel.classList.remove('hidden');
        }
    }
}

function startGame() {
    startAmbientSound();
    const targetBlock = (gameState.currentBlock === 'block-menu') ? 'block-d' : gameState.currentBlock;
    showBlock(targetBlock);
}

function addXP(amount) {
    gameState.xp += amount;
    
    if (gameState.xp >= 300) {
        gameState.rank = 'Спецагент O5';
    } else if (gameState.xp >= 150) {
        gameState.rank = 'Спецагент KETER';
    } else if (gameState.xp >= 50) {
        gameState.rank = 'Исследователь Z-19';
    }

    saveProgress();
    updateUI();
}

function updateUI() {
    const rankEl = document.getElementById('player-rank');
    const xpEl = document.getElementById('player-xp');
    
    if (rankEl) rankEl.textContent = gameState.rank;
    if (xpEl) xpEl.textContent = gameState.xp;

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
// БАЗА ДАННЫХ ОБЪЕКТОВ
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
// ЛОГИКА УРОВНЕЙ И ВЫБОРОВ
// ==========================================

function verifyCode(blockId) {
    const input = document.getElementById(`input-${blockId}`);
    if (!input) return;

    const userVal = input.value.trim().toLowerCase();
    const correctAns = ANSWERS[blockId];
    
    const isCorrect = Array.isArray(correctAns) ? correctAns.includes(userVal) : userVal === correctAns;

    if (isCorrect) {
        alert("PROJECT: KETER — ДОСТУП РАЗРЕШЕН. ФАЙЛ ОБНОВЛЕН.");
        input.value = '';
        addXP(50);
        
        if (blockId === 'block-d') unlockArchiveCard('scp173');
        if (blockId === 'block-0') { unlockArchiveCard('scp049'); unlockArchiveCard('scp999'); }
        if (blockId === 'block-2') unlockArchiveCard('scp076');
        if (blockId === 'block-3') unlockArchiveCard('scp682');

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

function quizLevel2(choice) {
    unlockArchiveCard('scp096');

    if (choice === 'close_eyes') {
        alert("ВЫ УТКНУЛИСЬ ЛИЦОМ В ПОЛ.\n\nSCP-096 пробегает в сантиметрах от вас, ломая стены коридора. Вы выжили благодаря знанию протокола!");
        addXP(50);
        showBlock('block-2');
    } else if (choice === 'run') {
        triggerHorrorEffect();
        alert("ОШИБКА ВЫЖИВАНИЯ:\n\nВы побежали. SCP-096 услышал эхо шагов, догнал вас за секунду и разорвал на куски.");
    } else if (choice === 'look') {
        triggerHorrorEffect();
        alert("КРИТИЧЕСКАЯ ОШИБКА:\n\nВы посмотрели ему в лицо. Никакой огнестрел не способен остановить SCP-096 в состоянии ярости.");
    }
}

function goToKeterSector() {
    showBlock('block-keter');
}

function quizKeter() {
    const input = document.getElementById('input-block-keter');
    if (!input) return;

    if (input.value.trim().toLowerCase() === ANSWERS['keter']) {
        addXP(100);
        alert("ПРОТОКОЛ «ОМЕГА» АКТИВИРОВАН!\n\nМОГ «Девятихвостая лиса» сдерживает SCP-682. Зона 19 спасена. Агент C-492 восстановлен в правах.\n\nПОБЕДА (КОНЦОВКА ФОНДА SCP).");
        resetProgress();
    } else {
        triggerHorrorEffect();
        alert("ОШИБКА СДЕРЖИВАНИЯ!\n\nСистема не распознала позывной. SCP-682 уничтожает купол!\n\nСВЯЗЬ ПЕРЕХВАТАНА ПОВСТАНЦАМИ ХАОСА...");
        input.value = '';
        showBlock('block-chaos');
    }
}

function quizChaos() {
    const input = document.getElementById('input-block-chaos');
    if (!input) return;

    if (input.value.trim().toLowerCase() === ANSWERS['chaos']) {
        addXP(100);
        alert("КОД ПОДРЫВА ПРИНЯТ!\n\nЗаряды уничтожают Зону 19. Вы эвакуированы вертолетом Повстанцев вместе с аномальными объектами.\n\nПОБЕДА (КОНЦОВКА ПОВСТАНЦЕВ ХАОСА).");
        resetProgress();
    } else {
        triggerHorrorEffect();
        alert("НЕВЕРНЫЙ ШИФР!\n\nДельта-Командование считает вас предателем. Вы сгорели при автодетонации комплексов.");
    }
}

// ==========================================
// ЗВУК И ЭФФЕКТЫ
// ==========================================

function startAmbientSound() {
    const staticSnd = document.getElementById('snd-static');
    const vhsSnd = document.getElementById('snd-vhs');

    if (staticSnd && vhsSnd) {
        staticSnd.volume = 0.12;
        vhsSnd.volume = 0.20;

        staticSnd.play().catch(() => {});
        vhsSnd.play().catch(() => {});
    }
}

function boostStaticNoise() {
    const staticSnd = document.getElementById('snd-static');
    if (staticSnd) {
        staticSnd.volume = 0.55;
        setTimeout(() => {
            staticSnd.volume = 0.12;
        }, 600);
    }
}

function stopAmbientSound() {
    const staticSnd = document.getElementById('snd-static');
    const vhsSnd = document.getElementById('snd-vhs');

    if (staticSnd) staticSnd.pause();
    if (vhsSnd) vhsSnd.pause();
}

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

function showCreepyError() {
    const messages = [
        "PROJECT: KETER — Ошибка восстановления памяти.",
        "СИСТЕМА: Вы чувствуете чей-то взгляд на затылке...",
        "ВНИМАНИЕ: Зафиксирован мем-импульс высокого уровня.",
        "ОШИБКА: {ДАННЫЕ УДАЛЕНЫ}. Не верьте объекту SCP-035.",
        "ГОЛОС В СВЯЗИ: Агент C-492, ты не тот, кем себя считаешь..."
    ];
    alert(messages[Math.floor(Math.random() * messages.length)]);
}

function exitGame() {
    stopAmbientSound();
    showBlock('block-menu');
}

// ==========================================
// СОХРАНЕНИЯ
// ==========================================

function saveProgress() {
    localStorage.setItem('project_keter_state', JSON.stringify(gameState));
}

function loadProgress() {
    const saved = localStorage.getItem('project_keter_state');
    if (saved) {
        try {
            gameState = JSON.parse(saved);
        } catch (e) {
            console.error("Ошибка сохранения", e);
        }
    }
}

function resetProgress() {
    localStorage.removeItem('project_keter_state');
    gameState = {
        currentBlock: 'block-menu',
        xp: 0,
        rank: 'Агент C-492',
        unlockedArchive: []
    };
    stopAmbientSound();
    updateUI();
    showBlock('block-menu');
}
