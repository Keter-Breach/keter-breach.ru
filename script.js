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
// 3D ДВИЖОК, СТЕНЫ И КАРТА
// ==========================================

let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let isGame3DActive = false;
let terminalMesh, scp173Group;
let isNearTerminal = false;

// Массив физических границ (коллизий) стен
let colliders = [];

function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020502);
    scene.fog = new THREE.FogExp2(0x020502, 0.06);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 12); // Спавн игрока в Главном Коридоре

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // ОСВЕЩЕНИЕ
    const ambientLight = new THREE.AmbientLight(0x223322, 0.5);
    scene.add(ambientLight);

    // ГЕНЕРАЦИЯ БАЗОВОЙ КАРТЫ КОМПЛЕКСА
    buildBaseMap();

    // ТЕРМИНАЛ ЗАДАЧ
    const termGeo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
    const termMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    terminalMesh = new THREE.Mesh(termGeo, termMat);
    terminalMesh.position.set(-11, 1, -12); // В комнате управления
    scene.add(terminalMesh);

    // SCP-173
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

// ==========================================
// ПОСТРОЕНИЕ КАРТЫ ЗОНЫ 19
// ==========================================

function createWall(x, z, width, depth, height = 4) {
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x112211, wireframe: true });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, height / 2, z);
    scene.add(wall);

    // Добавляем стену в массив для проверки столкновений
    const box = new THREE.Box3().setFromObject(wall);
    colliders.push(box);
}

function createFloor(x, z, width, depth) {
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x050a05 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    scene.add(floor);
}

function createLight(x, y, z, color = 0xffaa00, intensity = 1.5) {
    const light = new THREE.PointLight(color, intensity, 12);
    light.position.set(x, y, z);
    scene.add(light);
}

function buildBaseMap() {
    colliders = []; // Очистка коллизий

    // --- 1. ГЛАВНЫЙ КОРИДОР ---
    createFloor(0, 0, 6, 30);
    createWall(-3.2, 0, 0.4, 30); // Левая стена
    createWall(3.2, 5, 0.4, 20);  // Правая стена (с проходом)
    createWall(0, 15, 6.8, 0.4);  // Задняя стена
    createLight(0, 3.5, 8);
    createLight(0, 3.5, -2);

    // --- 2. КАМЕРА СОДЕРЖАНИЯ SCP-173 (СПРАВА) ---
    createFloor(10, -8, 14, 10);
    createWall(10, -13, 14, 0.4); // Север
    createWall(10, -3, 14, 0.4);  // Юг
    createWall(17, -8, 0.4, 10);  // Восток
    createLight(10, 3.5, -8, 0xff0000, 2); // Красный свет опасности

    // --- 3. КОМНАТА УПРАВЛЕНИЯ И ТЕРМИНАЛА (СЛЕВА) ---
    createFloor(-10, -10, 14, 14);
    createWall(-10, -17, 14, 0.4); // Север
    createWall(-17, -10, 0.4, 14); // Запад
    createWall(-10, -3, 14, 0.4);  // Юг
    createWall(-3.2, -14, 0.4, 6); // Часть стены перехода
    createLight(-10, 3.5, -10, 0x00ff66, 1.5); // Зеленый свет консоли

    // --- 4. ПЕРЕДНИЙ СЕКТОР (ТУПИК / ШЛЮЗ) ---
    createWall(0, -15, 6.8, 0.4);
}

function createSCP173() {
    scp173Group = new THREE.Group();

    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xddbb99 });
    const paintMat = new THREE.MeshBasicMaterial({ color: 0x990000 });

    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.8, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    scp173Group.add(body);

    const headGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.0;
    head.scale.set(1, 1.2, 0.9);
    scp173Group.add(head);

    const facePaintGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const facePaint = new THREE.Mesh(facePaintGeo, paintMat);
    facePaint.position.set(0, 2.0, 0.35);
    scp173Group.add(facePaint);

    // Начальная позиция SCP-173 в его камере содержания
    scp173Group.position.set(12, 0, -8);
    scene.add(scp173Group);
}

// ==========================================
// МЕХАНИКА МОРГАНИЯ И ИИ SCP-173
// ==========================================

function updateBlink(delta) {
    if (!isGame3DActive) return;

    if (isBlinking) {
        blinkMeter += delta * 300;
        if (blinkMeter >= 100) {
            blinkMeter = 100;
            isBlinking = false;
        }
    } else {
        blinkMeter -= delta * 18;
        if (blinkMeter <= 0) triggerBlink();
    }

    const innerBar = document.getElementById('blink-bar-inner');
    if (innerBar) innerBar.style.width = `${Math.max(0, blinkMeter)}%`;
}

function triggerBlink() {
    isBlinking = true;
    moveSCP173();
}

function isPlayerLookingAt173() {
    if (!scp173Group || isBlinking) return false;

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    const toSCP = new THREE.Vector3().subVectors(scp173Group.position, camera.position).normalize();
    const dot = camDir.dot(toSCP);
    return dot > 0.35;
}

function moveSCP173() {
    if (!scp173Group) return;

    const dist = camera.position.distanceTo(scp173Group.position);

    if (dist < 1.8) {
        triggerHorrorEffect();
        alert("SCP-173 СЛОМАЛ ВАМ ШЕЙНЫЕ ПОЗВОНКИ.\n\nНельзя разрывать зрительный контакт!");
        location.reload();
        return;
    }

    const targetPos = new THREE.Vector3();
    targetPos.subVectors(camera.position, scp173Group.position).normalize();
    
    scp173Group.position.add(targetPos.multiplyScalar(2.2));
    scp173Group.lookAt(camera.position.x, scp173Group.position.y, camera.position.z);

    const audio = document.getElementById('snd-glitch');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

// ==========================================
// ПРОВЕРКА СТОЛКНОВЕНИЙ СО СТЕНАМИ
// ==========================================

function checkCollisions(newPosition) {
    const playerRadius = 0.5;
    const playerBox = new THREE.Box3(
        new THREE.Vector3(newPosition.x - playerRadius, 0, newPosition.z - playerRadius),
        new THREE.Vector3(newPosition.x + playerRadius, 3, newPosition.z + playerRadius)
    );

    for (let i = 0; i < colliders.length; i++) {
        if (playerBox.intersectsBox(colliders[i])) {
            return true; // Есть столкновение!
        }
    }
    return false;
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

    updateBlink(delta);

    if (!isPlayerLookingAt173() && Math.random() < 0.02) {
        moveSCP173();
    }

    // Движение и расчет коллизий
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 22.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 22.0 * delta;

    // Расчет новой предполагаемой позиции
    const oldPosition = camera.position.clone();
    
    camera.translateX(-velocity.x * delta);
    camera.translateZ(velocity.z * delta);
    camera.position.y = 1.6;

    // Если врезались в стену — возвращаем старые координаты
    if (checkCollisions(camera.position)) {
        camera.position.copy(oldPosition);
    }

    // Проверка расстояния до Терминала
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
// ИНТЕРФЕЙС
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
