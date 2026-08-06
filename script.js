
// Инициализация аудиоконтекста браузера
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Синтезатор аналоговых звуков (Без внешних аудиофайлов)
function playTerminalSound(type) {
    try {
        initAudio();
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain); 
        gain.connect(audioCtx.destination);

        if (type === 'click') { 
            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime); 
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.04);
            osc.start(); 
            osc.stop(audioCtx.currentTime + 0.04);
        } else if (type === 'alarm') { 
            osc.type = 'sawtooth'; 
            osc.frequency.setValueAtTime(180, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime); 
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
            osc.start(); 
            osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch(e) { 
        console.log("Аудио-система терминала временно недоступна"); 
    }
}

// Первоначальный запуск интерфейса после загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
    let headers = document.querySelectorAll("h2");
    headers.forEach(h => { h.innerHTML += '<span class="warning-flash" style="animation: blink 0.8s infinite; color: inherit;">_</span>'; });
    
    document.querySelectorAll('button').forEach(b => { 
        b.addEventListener('click', () => {
            initAudio(); 
            playTerminalSound('click');
        }); 
    });
    updateArchiveStorage(); 
    updateXPDisplay(); 
    checkAccess();
});
// Начисление опыта за правильные ответы
function addXP(amount) {
    let currentXP = parseInt(localStorage.getItem("scp_user_xp") || "0");
    currentXP += amount;
    localStorage.setItem("scp_user_xp", currentXP.toString());
    updateXPDisplay();
}

// Обновление панели рангов сотрудника Зоны 19
function updateXPDisplay() {
    let xp = parseInt(localStorage.getItem("scp_user_xp") || "0");
    let rankText = "Класс D (Расходник)";
    let rankColor = "#ff4444";

    if (xp >= 150 && xp < 300) { rankText = "Уровень 0 (Техник базы)"; rankColor = "#33ccff"; }
    else if (xp >= 300 && xp < 450) { rankText = "Уровень 1 (Лаборант)"; rankColor = "#33ff33"; }
    else if (xp >= 450 && xp < 600) { rankText = "Уровень 2 (Исследователь)"; rankColor = "#ffaa00"; }
    else if (xp >= 600 && xp < 750) { rankText = "Уровень 3 (Старший ученый)"; rankColor = "#ff00ff"; }
    else if (xp >= 750 && xp < 900) { rankText = "Уровень 4 (Директор Зоны)"; rankColor = "#e6b800"; }
    else if (xp >= 900) { rankText = "Уровень 5 (Смотритель O5)"; rankColor = "#ffffff"; }

    let xpElement = document.getElementById("player-xp");
    let rankElement = document.getElementById("player-rank");
    
    if (xpElement) xpElement.innerText = xp;
    if (rankElement) {
        rankElement.innerText = rankText;
        rankElement.style.color = rankColor;
    }
}

// Открытие и закрытие справочника объектов
let isArchiveOpen = false;
function toggleArchiveView() {
    let mainElements = ['block-d', 'block-0', 'block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-keter', 'block-chaos'];
    let archiveBtn = document.getElementById('archive-toggle-btn');
    if (!isArchiveOpen) {
        mainElements.forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); });
        document.getElementById('block-encyclopedia').classList.remove('hidden');
        if (archiveBtn) archiveBtn.innerText = "[ВЕРНУТЬСЯ В ТЕРМИНАЛ]"; 
        isArchiveOpen = true; 
        renderArchiveData();
    } else {
        document.getElementById('block-encyclopedia').classList.add('hidden');
        if (archiveBtn) archiveBtn.innerText = "[ОТКРЫТЬ АРХИВ ОБЪЕКТОВ]"; 
        isArchiveOpen = false; 
        checkAccess();
    }
}
// Проверка разблокированных карточек в энциклопедии
function renderArchiveData() {
    let monsters = ['scp173', 'scp049', 'scp999', 'scp096', 'scp076', 'scp682'];
    monsters.forEach(m => {
        let isUnlocked = localStorage.getItem("unlocked_" + m) === "true";
        let cardOpen = document.getElementById("card-" + m);
        let cardClose = document.getElementById("card-" + m + "-locked");
        if (isUnlocked && cardOpen && cardClose) {
            cardOpen.style.display = "block";
            cardClose.style.display = "none";
        } else if (cardOpen && cardClose) {
            cardOpen.style.display = "none";
            cardClose.style.display = "block";
        }
    });
}

// Автоматический сбор карточек аномалий на этапах сюжета
function updateArchiveStorage() {
    let currentLevel = localStorage.getItem("scp_secure_level") || "Class_D";
    if (currentLevel === "Level_0") localStorage.setItem("unlocked_scp999", "true");
    else if (currentLevel === "Level_1") { localStorage.setItem("unlocked_scp173", "true"); localStorage.setItem("unlocked_scp049", "true"); }
    else if (currentLevel === "Level_2") { localStorage.setItem("unlocked_scp096", "true"); localStorage.setItem("unlocked_scp076", "true"); }
    else if (currentLevel === "Level_Keter") localStorage.setItem("unlocked_scp682", "true");
}

// Менеджер экранов и фонового освещения бункера
function checkAccess() {
    if (isArchiveOpen) return; 
    updateArchiveStorage();
    let mainElements = ['block-d', 'block-0', 'block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-keter', 'block-chaos'];
    mainElements.forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); });

    let currentLevel = localStorage.getItem("scp_secure_level") || "Class_D";
    let pPanel = document.getElementById('player-panel');
    if(pPanel) pPanel.style.display = (currentLevel === "Level_Chaos") ? "none" : "flex";

    if (currentLevel === "Class_D") { document.getElementById('block-d').classList.remove('hidden'); document.body.style.backgroundColor = "#100202"; }
    else if (currentLevel === "Level_0") { document.getElementById('block-0').classList.remove('hidden'); document.body.style.backgroundColor = "#020a12"; }
    else if (currentLevel === "Level_1") { document.getElementById('block-1').classList.remove('hidden'); document.body.style.backgroundColor = "#021204"; }
    else if (currentLevel === "Level_2") { document.getElementById('block-2').classList.remove('hidden'); document.body.style.backgroundColor = "#1a1102"; }
    else if (currentLevel === "Level_3") { document.getElementById('block-3').classList.remove('hidden'); document.body.style.backgroundColor = "#15021a"; }
    else if (currentLevel === "Level_4" && document.getElementById('block-4')) { document.getElementById('block-4').classList.remove('hidden'); document.body.style.backgroundColor = "#1c1701"; }
    else if (currentLevel === "Level_5" && document.getElementById('block-5')) { document.getElementById('block-5').classList.remove('hidden'); document.body.style.backgroundColor = "#000000"; }
    else if (currentLevel === "Level_Keter" && document.getElementById('block-keter')) { document.getElementById('block-keter').classList.remove('hidden'); document.body.style.backgroundColor = "#2a0101"; }
    else if (currentLevel === "Level_Chaos" && document.getElementById('block-chaos')) { document.getElementById('block-chaos').classList.remove('hidden'); document.body.style.backgroundColor = "#040d02"; }
}
// Задача экрана Класса D. Ответ: 3
function quizLevel0() {
    let answer = prompt("Сколько выживших сотрудников класса D осталось внутри камеры?");
    if (answer && answer.trim() === "3") {
        addXP(150); 
        fakeLoad("Level_0", () => { localStorage.setItem("scp_secure_level", "Level_0"); checkAccess(); });
    } else {
        triggerGlitch(); alert("НЕВЕРНО. Защитные турели активированы. Ликвидация."); resetProgress();
    }
}

// Тест на Уровне 1 (Скромник). Вариант В
function quizLevel2(choice) {
    if (choice === 'закрыть глаза') {
        addXP(150);
        fakeLoad("Level_2", () => { localStorage.setItem("scp_secure_level", "Level_2"); alert("ВЫ СВЕРНУЛИ ЗА УГОЛ И ЗАКРЫЛИ ГЛАЗА. SCP-096 пробежал мимо. Допуск повышен."); checkAccess(); });
    } else {
        triggerGlitch(); alert("КРИТИЧЕСКАЯ ОШИБКА. SCP-096 разорвал вас на части."); resetProgress();
    }
}

// Испытание Сектора Кэтер. Ответ: эпсилон-11
function quizKeter() {
    let mogAnswer = prompt("Введите позывной МОГ для усмирения Кэтеров:");
    if (mogAnswer && (mogAnswer.toLowerCase().trim().replace(/ё/g, "е") === "эпсилон-11")) {
        addXP(200); alert("СИГНАЛ ПРИНЯТ. Бак залит кислотой. Вы прошли финал Фонда!"); resetProgress();
    } else {
        triggerGlitch(); alert("ОШИБКА. SCP-682 уничтожил терминал вместе с вами."); resetProgress();
    }
}

// Финал Повстанцев Хаоса. Ответ: гидра
function quizChaos() {
    let chaosAnswer = prompt("Введите кодовое название ударной ячейки Хаоса:");
    if (chaosAnswer && chaosAnswer.toLowerCase().trim() === "гидра") {
        alert("КОД ПОДТВЕРЖДЕН. Повстанцы Хаоса взрывают Зону 19! Секретный финал пройден!"); resetProgress();
    } else {
        triggerGlitch(); alert("ВСПЫШКА КВАНТОВОЙ ЗАЩИТЫ. Терминал уничтожен."); resetProgress();
    }
}

// Искажение экрана (Глитч) при неверных кодах
function triggerGlitch() {
    playTerminalSound('alarm'); 
    document.body.style.transform = "skewX(15deg) scaleY(1.1)"; 
    document.body.style.filter = "hue-rotate(90deg) invert(1)";
    setTimeout(() => { document.body.style.transform = "none"; document.body.style.filter = "none"; }, 150);
}

// Универсальная система сверки паролей и пасхалка "хаос"
function verifyCode(correctCode, targetLevel) {
    let userCode = prompt("Введите секретный ключ терминала:");
    if (!userCode) return;
    let cleanedInput = userCode.toLowerCase().trim().replace(/ё/g, "е");
    
    if (cleanedInput === "хаос") {
        fakeLoad("Level_Chaos", () => { localStorage.setItem("scp_secure_level", "Level_Chaos"); checkAccess(); }); return;
    }
    if (cleanedInput === correctCode.toLowerCase().trim().replace(/ё/g, "е")) {
        addXP(150);
        fakeLoad(targetLevel, () => { localStorage.setItem("scp_secure_level", targetLevel); checkAccess(); });
    } else {
        triggerGlitch(); alert("ОТКАЗ В ДОСТУПЕ. Неверная сигнатура ключа.");
    }
}

// Полное обнуление прогресса при гибели
function resetProgress() {
    localStorage.setItem("scp_user_xp", "0"); 
    updateXPDisplay();
    fakeLoad("Class_D", () => { localStorage.setItem("scp_secure_level", "Class_D"); checkAccess(); });
}

// Имитация шкалы загрузки в процентах
function fakeLoad(targetLevel, callback) {
    let mainElements = ['block-d', 'block-0', 'block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-keter', 'block-chaos', 'block-encyclopedia'];
    mainElements.forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); });
    
    let screen = document.getElementById('loading-screen');
    let bar = document.getElementById('p-bar'); 
    let text = document.getElementById('p-text');
    
    if (targetLevel === "Level_0") screen.className = "terminal status-0";
    if (targetLevel === "Level_1") screen.className = "terminal status-1";
    if (targetLevel === "Level_2") screen.className = "terminal status-2";
    if (targetLevel === "Level_3") screen.className = "terminal status-3";
    if (targetLevel === "Level_4") screen.className = "terminal status-4";
    if (targetLevel === "Level_5") screen.className = "terminal status-5";
    if (targetLevel === "Level_Keter") screen.className = "terminal status-keter";
    if (targetLevel === "Level_Chaos") screen.className = "terminal";
    if (targetLevel === "Class_D") screen.className = "terminal status-d";

    screen.style.display = "block"; 
    let width = 0;
    let interval = setInterval(() => {
        if (width >= 100) { clearInterval(interval); screen.style.display = "none"; callback(); }
        else { width += 5; bar.style.width = width + '%'; text.innerText = width + '%'; }
    }, 20);
}
