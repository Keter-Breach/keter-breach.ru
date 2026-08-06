// ==========================================
// ИГРОВОЕ СОСТОЯНИЕ И ЛОГИКА
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

// ==========================================
// ИНИЦИАЛИЗАЦИЯ И ЗВУКИ ПРИ ЗАГРУЗКЕ
// ==========================================

function initAudioAndApp() {
    // Скрываем оверлей активации
    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.classList.add('hidden');

    // Запускаем эмбиент сразу после клика пользователем
    startAmbientSound();

    // Показываем меню
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
// 3D ДВИЖОК И ВЬЮ ОТ ПЕРВОГО ЛИЦА (THREE.JS)
// ==========================================

let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let isGame3DActive = false;
let terminalMesh;
let isNearTerminal = false;

function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    
    // Создаем сцену и камеру
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020802);
    scene.fog = new THREE.FogExp2(0x020802, 0.15);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5); // Спавн персонажа (высота глаз ~1.6м)

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Освещение (красный аварийный свет)
    const ambientLight = new THREE.AmbientLight(0x113311, 0.5);
    scene.add(ambientLight);

    const redLight = new THREE.PointLight(0xff0000, 1.5, 15);
    redLight.position.set(0, 3, 0);
    scene.add(redLight);

    // Помещение (Коридор D-Блока)
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x112211, wireframe: true });
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x051505 });

    // Пол
    const floorGeo = new THREE.PlaneGeometry(20, 30);
    const floor = new THREE.Mesh(floorGeo, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Терминал задач в конце коридора
    const termGeo = new THREE.BoxGeometry(1, 1.5, 0.5);
    const termMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    terminalMesh = new THREE.Mesh(termGeo, termMat);
    terminalMesh.position.set(0, 1, -8);
    scene.add(terminalMesh);

    // События мыши и клавиатуры
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

// Поворот камеры мышью
let yaw = 0, pitch = 0;
function onMouseMove(event) {
    if (document.pointerLockElement !== document.getElementById('game-canvas')) return;

    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;

    pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));

    camera.rotation.heading = yaw;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'KeyE':
            if (isNearTerminal) {
                openTerminalTask();
            }
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

    // Замедление движения
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 25.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 25.0 * delta;

    camera.translateX(-velocity.x * delta);
    camera.translateZ(velocity.z * delta);
    camera.position.y = 1.6; // Фиксированная высота глаз

    // Проверка расстояния до терминала задач
    const dist = camera.position.distanceTo(terminalMesh.position);
    const prompt = document.getElementById('interaction-prompt');

    if (dist < 2.5) {
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
// ЗАПУСК ИГРЫ И ИНТЕРФЕЙС
// ==========================================

function startGame3D() {
    document.getElementById('block-menu').classList.add('hidden');
    document.getElementById('game-canvas').classList.remove('hidden');
    document.getElementById('crosshair').classList.remove('hidden');
    document.getElementById('player-panel').classList.remove('hidden');

    if (!scene) {
        init3DWorld();
    }

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
    showBlock(''); // Скрываем терминал
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
        alert("КОД ПРИНЯТ. ДВЕРЬ СЕКТОРА D РАЗБЛОКИРОВАНА!");
        addXP(50);
        unlockArchiveCard('scp173');
        closeTerminal();
    } else {
        alert("ОШИБКА ДОСТУПА!");
    }
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

function openArchiveFromMenu() {
    showBlock('block-encyclopedia');
}

function toggleArchiveView() {
    const enc = document.getElementById('block-encyclopedia');
    enc.classList.toggle('hidden');
}

function saveProgress() {
    localStorage.setItem('project_keter_state', JSON.stringify(gameState));
}

function loadProgress() {
    const saved = localStorage.getItem('project_keter_state');
    if (saved) {
        try { gameState = JSON.parse(saved); } catch (e) {}
    }
}

function resetProgress() {
    localStorage.removeItem('project_keter_state');
    location.reload();
}

function exitGame() {
    location.reload();
}
