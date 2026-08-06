// ==========================================
// ИГРОВОЕ СОСТОЯНИЕ И НАСТРОЙКИ
// ==========================================

let gameState = {
    currentBlock: 'block-menu',
    xp: 0,
    rank: 'Агент C-492',
    unlockedArchive: []
};

const ANSWERS = {
    'block-d': '3'
};

// МОРГАНИЕ
let blinkMeter = 100;
let isBlinking = false;

// ==========================================
// ИНИЦИАЛИЗАЦИЯ И ЗВУКИ
// ==========================================

function initAudioAndApp() {
    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.classList.add('hidden');

    startAmbientSound();
    document.getElementById('block-menu').classList.remove('hidden');
    loadProgress();
    updateUI();
}

function startAmbientSound() {
    const staticSnd = document.getElementById('snd-static');
    const vhsSnd = document.getElementById('snd-vhs');

    if (staticSnd && vhsSnd) {
        staticSnd.volume = 0.15;
        vhsSnd.volume = 0.20;
        staticSnd.play().catch(() => {});
        vhsSnd.play().catch(() => {});
    }
}

// ==========================================
// 3D ДВИЖОК С SCP-173 И ОКУРУЖЕНИЕМ
// ==========================================

let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let isGame3DActive = false;
let terminalMesh, scp173Group;
let flickeringLight;
let isNearTerminal = false;

function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020502);
    scene.fog = new THREE.FogExp2(0x020502, 0.08);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 8);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // ОСВЕЩЕНИЕ ЗОНЫ 19
    const ambientLight = new THREE.AmbientLight(0x223322, 0.4);
    scene.add(ambientLight);

    flickeringLight = new THREE.PointLight(0xffaa00, 1.8, 18);
    flickeringLight.position.set(0, 3.5, 0);
    scene.add(flickeringLight);

    // --- УЛУЧШЕННОЕ ОКРУЖЕНИЕ (КОРИДОР) ---
    createCorridor();

    // --- ТЕРМИНАЛ УПРАВЛЕНИЯ ---
    const termGeo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
    const termMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    terminalMesh = new THREE.Mesh(termGeo, termMat);
    terminalMesh.position.set(2.5, 1, -12);
    scene.add(terminalMesh);

    // --- SCP-173 (СКУЛЬПТУРА) ---
    createSCP173();

    // СОБЫТИЯ
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('click', () => {
        if (isGame3DActive && !document.pointerLockElement) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
}

// Создание визуального стиля коридора Зоны 19
function createCorridor() {
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x112211, wireframe: true });
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x050a05 });
    const ceilingMat = new THREE.MeshBasicMaterial({ color: 0x081008 });

    // Пол
    const floorGeo = new THREE.PlaneGeometry(8, 30);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -5;
    scene.add(floor);

    // Потолок
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 4, -5);
    scene.add(ceiling);

    // Стены
    const wallGeo = new THREE.PlaneGeometry(30, 4);
    
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-4, 2, -5);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(4, 2, -5);
    scene.add(rightWall);

    // Гермодверь в конце
    const doorGeo = new THREE.BoxGeometry(7.8, 3.8, 0.2);
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x224422 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.9, -14.8);
    scene.add(door);
}

// Построение фигуры SCP-173
function createSCP173() {
    scp173Group = new THREE.Group();

    // Материал бетона с красной и черной краской
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xddbb99 });
    const paintMat = new THREE.MeshBasicMaterial({ color: 0x990000 }); // "Лицо"

    // Туловище (каплевидное/конусное)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.8, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    scp173Group.add(body);

    // Голова
    const headGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.0;
    head.scale.set(1, 1.2, 0.9);
    scp173Group.add(head);

    // Краска на лице
    const facePaintGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const facePaint = new THREE.Mesh(facePaintGeo, paintMat);
    facePaint.position.set(0, 2.0, 0.35);
    scp173Group.add(facePaint);

    // Позиция появления SCP-173 в конце коридора
    scp173Group.position.set(0, 0, -10);
    scene.add(scp173Group);
}

// ==========================================
// МЕХАНИКА МОРГАНИЯ И ИИ SCP-173
// ==========================================

function updateBlink(delta) {
    if (!isGame3DActive) return;

    if (isBlinking) {
        blinkMeter += delta * 300; // Быстрое восстановление при моргании
        if (blinkMeter >= 100) {
            blinkMeter = 100;
            isBlinking = false;
        }
    } else {
        blinkMeter -= delta * 18; // Постепенное утомление глаз
        if (blinkMeter <= 0) {
            triggerBlink();
        }
    }

    const innerBar = document.getElementById('blink-bar-inner');
    if (innerBar) innerBar.style.width = `${Math.max(0, blinkMeter)}%`;
}

function triggerBlink() {
    isBlinking = true;

    // Пока игрок моргает — SCP-173 мгновенно перемещается к нему!
    moveSCP173();
}

function isPlayerLookingAt173() {
    if (!scp173Group || isBlinking) return false;

    // Вектор направления взгляда
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    // Вектор от камеры к SCP-173
    const toSCP = new THREE.Vector3().subVectors(scp173Group.position, camera.position).normalize();

    // Угол между взглядом и объектом
    const dot = camDir.dot(toSCP);
    return dot > 0.4; // Если объект в поле зрения
}

function moveSCP173() {
    if (!scp173Group) return;

    const dist = camera.position.distanceTo(scp173Group.position);

    // Если SCP-173 совсем близко — скример и смерть
    if (dist < 2.0) {
        triggerHorrorEffect();
        alert("SCP-173 СЛОМАЛ ВАМ ШЕЙНЫЕ ПОЗВОНКИ.\n\nНельзя разрывать зрительный контакт!");
        location.reload();
        return;
    }

    // Движение к игроку
    const targetPos = new THREE.Vector3();
    targetPos.subVectors(camera.position, scp173Group.position).normalize();
    
    // Перемещаем на 2.5 метра ближе
    scp173Group.position.add(targetPos.multiplyScalar(2.5));
    scp173Group.lookAt(camera.position.x, scp173Group.position.y, camera.position.z);

    // Звук скрежета бетона при движении
    const audio = document.getElementById('snd-glitch');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

// ==========================================
// УПРАВЛЕНИЕ И АНИМАЦИЯ
// ==========================================

let yaw = 0, pitch = 0;
function onMouseMove(event) {
    if (document.pointerLockElement !== document.getElementById('game-canvas')) return;

    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;
    pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));

    camera.rotation.set(pitch, yaw, 0, 'YXZ');
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': triggerBlink(); break;
        case 'KeyE':
            if (isNearTerminal) openTerminalTask();
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function animate3D() {
    if (!isGame3DActive) return;

    requestAnimationFrame(animate3D);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Мигание лампы
    if (flickeringLight && Math.random() < 0.05) {
        flickeringLight.intensity = Math.random() * 2;
    }

    // Обновление моргания
    updateBlink(delta);

    // Если игрок НЕ смотрит на SCP-173 — скульптура медленно ползет даже без моргания
    if (!isPlayerLookingAt173() && Math.random() < 0.02) {
        moveSCP173();
    }

    // Движение игрока
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 22.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 22.0 * delta;

    camera.translateX(-velocity.x * delta);
    camera.translateZ(velocity.z * delta);
    camera.position.y = 1.6;

    // Проверка расстояния до консоли
    const dist = camera.position.distanceTo(terminalMesh.position);
    const prompt = document.getElementById('interaction-prompt');

    if (dist < 2.2) {
        isNearTerminal = true;
        prompt.classList.remove('hidden');
    } else {
        isNearTerminal = false;
        prompt.classList.add('hidden');
    }

    prevTime = time;
    renderer.render(scene, camera);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// ИНТЕРФЕЙС И ТЕРМИНАЛЫ
// ==========================================

function startGame3D() {
    document.getElementById('block-menu').classList.add('hidden');
    document.getElementById('game-canvas').classList.remove('hidden');
    document.getElementById('crosshair').classList.remove('hidden');
    document.getElementById('player-panel').classList.remove('hidden');
    document.getElementById('blink-container').classList.remove('hidden');

    if (!scene) init3DWorld();

    isGame3DActive = true;
    prevTime = performance.now();
    document.getElementById('game-canvas').requestPointerLock();
    animate3D();
}

function openTerminalTask() {
    document.exitPointerLock();
    document.getElementById('interaction-prompt').classList.add('hidden');
    showBlock('block-d');
}

function closeTerminal() {
    showBlock('');
    document.getElementById('game-canvas').requestPointerLock();
}

function showBlock(blockId) {
    const allBlocks = document.querySelectorAll('.terminal');
    allBlocks.forEach(b => b.classList.add('hidden'));

    if (blockId) {
        const targetBlock = document.getElementById(blockId);
        if (targetBlock) targetBlock.classList.remove('hidden');
    }
}

function verifyCode(blockId) {
    const input = document.getElementById(`input-${blockId}`);
    if (!input) return;

    if (input.value.trim() === ANSWERS[blockId]) {
        alert("ГЕРМОДВЕРЬ ОТКРЫТА. SCP-173 ЗАБЛОКИРОВАН В СЕКТОРЕ!");
        addXP(50);
        unlockArchiveCard('scp173');
        closeTerminal();
    } else {
        triggerHorrorEffect();
        alert("НЕВЕРНЫЙ КОД! SCP-173 ПРИБЛИЖАЕТСЯ!");
    }
}

function triggerHorrorEffect() {
    const audio = document.getElementById('snd-glitch');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
    document.body.style.backgroundColor = '#500';
    setTimeout(() => { document.body.style.backgroundColor = ''; }, 200);
}

function addXP(amount) {
    gameState.xp += amount;
    saveProgress();
    updateUI();
}

function updateUI() {
    document.getElementById('player-rank').textContent = gameState.rank;
    document.getElementById('player-xp').textContent = gameState.xp;
}

function unlockArchiveCard(scpId) {
    if (!gameState.unlockedArchive.includes(scpId)) {
        gameState.unlockedArchive.push(scpId);
        saveProgress();
    }
}

function openArchiveFromMenu() { showBlock('block-encyclopedia'); }
function toggleArchiveView() { document.getElementById('block-encyclopedia').classList.toggle('hidden'); }
function saveProgress() { localStorage.setItem('project_keter_state', JSON.stringify(gameState)); }
function loadProgress() {
    const saved = localStorage.getItem('project_keter_state');
    if (saved) { try { gameState = JSON.parse(saved); } catch (e) {} }
}
function resetProgress() { localStorage.removeItem('project_keter_state'); location.reload(); }
function exitGame() { location.reload(); }
