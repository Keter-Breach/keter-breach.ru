// === УПРАВЛЕНИЕ ГЛАВНЫМ МЕНЮ И УДАЛЕННЫЙ ТЕРМИНАЛ ===
let openedFromMenu = false;

function startGame() {
    document.getElementById('block-menu').classList.add('hidden');
    localStorage.setItem("scp_in_game", "true"); 
    checkAccess();
}

function openArchiveFromMenu() {
    openedFromMenu = true;
    document.getElementById('block-menu').classList.add('hidden');
    document.getElementById('block-encyclopedia').classList.remove('hidden');
    document.getElementById('archive-close-btn').innerText = "Назад в меню";
    renderArchiveData();
}

function exitGame() {
    if(confirm("Вы уверены, что хотите закрыть терминал и очистить текущую сессию СБ?")) {
        localStorage.removeItem("scp_in_game");
        localStorage.setItem("scp_secure_level", "Class_D");
        localStorage.setItem("scp_user_xp", "0");
        updateXPDisplay();
        location.reload();
    }
}
function addXP(amount) {
    let currentXP = parseInt(localStorage.getItem("scp_user_xp") || "0");
    currentXP += amount;
    localStorage.setItem("scp_user_xp", currentXP.toString());
    updateXPDisplay();
}

function toggleArchiveView() {
    let mainElements = ['block-d', 'block-0', 'block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-keter', 'block-chaos'];
    let archiveBtn = document.getElementById('archive-toggle-btn');
    
    if (!isArchiveOpen) {
        mainElements.forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); });
        document.getElementById('block-encyclopedia').classList.remove('hidden');
        if(archiveBtn) archiveBtn.innerText = "[ВЕРНУТЬСЯ В ТЕРМИНАЛ]"; 
        isArchiveOpen = true; 
        openedFromMenu = false;
        renderArchiveData();
    } else {
        document.getElementById('block-encyclopedia').classList.add('hidden');
        if(archiveBtn) archiveBtn.innerText = "[ОТКРЫТЬ АРХИВ ОБЪЕКТОВ]"; 
        isArchiveOpen = false; 
        
        if (openedFromMenu) {
            document.getElementById('block-menu').classList.remove('hidden');
        } else {
            checkAccess();
        }
    }
}
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

function updateArchiveStorage() {
    let currentLevel = localStorage.getItem("scp_secure_level") || "Class_D";
    if (currentLevel === "Level_0") localStorage.setItem("unlocked_scp999", "true");
    else if (currentLevel === "Level_1") { localStorage.setItem("unlocked_scp173", "true"); localStorage.setItem("unlocked_scp049", "true"); }
    else if (currentLevel === "Level_2") { localStorage.setItem("unlocked_scp096", "true"); localStorage.setItem("unlocked_scp076", "true"); }
    else if (currentLevel === "Level_Keter") localStorage.setItem("unlocked_scp682", "true");
}
function checkAccess() {
    if (isArchiveOpen) return; 
    
    if (localStorage.getItem("scp_in_game") !== "true") {
        document.getElementById('block-menu').classList.remove('hidden');
        document.getElementById('player-panel').classList.add('hidden');
        let mainElements = ['block-d', 'block-0', 'block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-keter', 'block-chaos'];
        mainElements.forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); });
        document.body.style.backgroundColor = "#030405";
        return;
    }

    updateArchiveStorage();
    let mainElements = ['block-d', 'block-0', 'block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-keter', 'block-chaos'];
    mainElements.forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); });
    document.getElementById('block-menu').classList.add('hidden');

    let currentLevel = localStorage.getItem("scp_secure_level") || "Class_D";
    let pPanel = document.getElementById('player-panel');
    if(pPanel) pPanel.style.display = (currentLevel === "Level_Chaos") ? "none" : "flex";
    if(pPanel && currentLevel !== "Level_Chaos") pPanel.classList.remove('hidden');

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
function quizLevel0() {
    let answer = prompt("Сколько выживших сотрудников класса D осталось внутри камеры?");
    if (answer && answer.trim() === "3") {
        addXP(150); 
        fakeLoad("Level_0", () => { localStorage.setItem("scp_secure_level", "Level_0"); checkAccess(); });
    } else {
        triggerGlitch(); alert("НЕВЕРНО. Защитные турели активированы. Ликвидация."); resetProgress();
    }
}

// Тест на Уровне 1 (Скромник)
function quizLevel2(choice) {
    if (choice === 'закрыть глаза') {
        addXP(150);
        fakeLoad("Level_2", () => { localStorage.setItem("scp_secure_level", "Level_2"); alert("ВЫ СВЕРНУЛИ ЗА УГОЛ И ЗАКРЫЛИ ГЛАЗА. SCP-096 пробежал мимо. Допуск повышен."); checkAccess(); });
    } else {
        triggerGlitch(); alert("КРИТИЧЕСКАЯ ОШИБКА. SCP-096 разорвал вас на части."); resetProgress();
    }
}
function quizKeter() {
    let mogAnswer = prompt("Введите позывной МОГ для усмирения Кэтеров:");
    if (mogAnswer && (mogAnswer.toLowerCase().trim().replace(/ё/g, "е") === "эпсилон-11")) {
        addXP(200); alert("СИГНАЛ ПРИНЯТ. Бак залит кислотой. Вы прошли финал Фонда!"); resetProgress();
    } else {
        triggerGlitch(); alert("ОШИБКА. SCP-682 уничтожил терминал вместе с вами."); resetProgress();
    }
}

function quizChaos() {
    let chaosAnswer = prompt("Введите кодовое название ударной ячейки Хаоса:");
    if (chaosAnswer && chaosAnswer.toLowerCase().trim() === "гидра") {
        alert("КОД ПОДТВЕРЖДЕН. Повстанцы Хаоса взрывают Зону 19! Секретный финал пройден!"); resetProgress();
    } else {
        triggerGlitch(); alert("ВСПЫШКА КВАНТОВОЙ ЗАЩИТЫ. Терминал уничтожен."); resetProgress();
    }
}
function triggerGlitch() {
    playTerminalSound('alarm'); 
    document.body.style.transform = "skewX(15deg) scaleY(1.1)"; document.body.style.filter = "hue-rotate(90deg) invert(1)";
    setTimeout(() => { document.body.style.transform = "none"; document.body.style.filter = "none"; }, 150);
}

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

function resetProgress() {
    localStorage.removeItem("scp_in_game"); 
    localStorage.setItem("scp_user_xp", "0"); 
    updateXPDisplay();
    fakeLoad("Class_D", () => { localStorage.setItem("scp_secure_level", "Class_D"); checkAccess(); });
}

function fakeLoad(targetLevel, callback) {
    let mainElements = ['block-d', 'block-0', 'block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-keter', 'block-chaos', 'block-encyclopedia', 'block-menu'];
    mainElements.forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); });
    
    let screen = document.getElementById('loading-screen');
    let bar = document.getElementById('p-bar'); let text = document.getElementById('p-text');
    
    if (targetLevel === "Level_0") screen.className = "terminal status-0";
    if (targetLevel === "Level_1") screen.className = "terminal status-1";
    if (targetLevel === "Level_2") screen.className = "terminal status-2";
    if (targetLevel === "Level_3") screen.className = "terminal status-3";
    if (targetLevel === "Level_4") screen.className = "terminal status-4";
    if (targetLevel === "Level_5") screen.className = "terminal status-5";
    if (targetLevel === "Level_Keter") screen.className = "terminal status-keter";
    if (targetLevel === "Level_Chaos") screen.className = "terminal";
    if (targetLevel === "Class_D") screen.className = "terminal status-d";

    screen.style.display = "block"; let width = 0;
    let interval = setInterval(() => {
        if (width >= 100) { clearInterval(interval); screen.style.display = "none"; callback(); }
        else { width += 5; bar.style.width = width + '%'; text.innerText = width + '%'; }
    }, 20);
}
