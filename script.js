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
// ИНИЦИАЛИЗАЦИЯ И УПРАВЛЕНИЕ ENTER
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

// Слушатель клавиши ENTER
document.addEventListener('keydown', function(event) {
    if (event.code === 'Enter') {
        const overlay = document.getElementById('start-overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            initAudioAndApp();
            return;
        }

        const menuBlock = document.getElementById('block-menu');
        if (menuBlock && !menuBlock.classList.contains('hidden') && !isGame3DActive) {
            startGame3D();
        }
    }
});

// ==========================================
// ГЕНЕРАТОРЫ ПРОЦЕДУРНЫХ ТЕКСТУР ДЛЯ СТЕН И ПОЛА
// ==========================================

function createTilesTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1c241c';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#0a0f0a';
    ctx.lineWidth = 8;

    const tileSize = 64;
    for (let x = 0; x <= 512; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
    }
    for (let y = 0; y <= 512; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }

    for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function createMetalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2a332a';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#151d15';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 492);
    ctx.strokeRect(20, 20, 472, 472);

    ctx.fillStyle = '#445544';
    const rivets = [[30, 30], [482, 30], [30, 482], [482, 482]];
    rivets.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    for (let i = 0; i < 800; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.15)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 20, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// ==========================================
// 3D ДВИЖОК, МАТЕРИАЛЫ И КАРТА
// ==========================================

let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let isGame3DActive = false;
let terminalMesh, scp173Group;
let isNearTerminal = false;

let tilesMaterial, metalMaterial;
let colliders = [];

function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020502);
    scene.fog = new THREE.FogExp2(0x020502, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 12);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    setupProceduralMaterials();

    // ОСВЕЩЕНИЕ
    const ambientLight = new THREE.AmbientLight(0x334433, 0.7);
    scene.add(ambientLight);

    // КАРТА
    buildBaseMap();

    // ТЕРМИНАЛ
    const termGeo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x003311 });
    terminalMesh = new THREE.Mesh(termGeo, termMat);
    terminalMesh.position.set(-11, 1, -12);
    scene.add(terminalMesh);

    // SCP-173 (СОЗДАНИЕ С ТЕКСТУРОЙ)
    createSCP173();

    // СОБЫТИЯ УПРАВЛЕНИЯ
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

function setupProceduralMaterials() {
    const tilesTexture = createTilesTexture();
    tilesTexture.repeat.set(4, 4);
    tilesMaterial = new THREE.MeshStandardMaterial({
        map: tilesTexture,
        roughness: 0.4,
        metalness: 0.2
    });

    const metalTexture = createMetalTexture();
    metalTexture.repeat.set(2, 1);
    metalMaterial = new THREE.MeshStandardMaterial({
        map: metalTexture,
        roughness: 0.5,
        metalness: 0.7
    });
}

// ==========================================
// СОЗДАНИЕ МОДЕЛИ SCP-173 С ТЕКСТУРОЙ
// ==========================================

function createSCP173() {
    scp173Group = new THREE.Group();

    const textureLoader = new THREE.TextureLoader();
    // Загрузка текстуры развёрстки
    const scpTexture = textureLoader.load('SCP-173.jpg', 
        undefined, 
        undefined, 
        function() {
            // Фолбэк, если файл не найден в корне
            scpTexture.image = textureLoader.load('textures/SCP-173.jpg');
        }
    );

    const scpMaterial = new THREE.MeshStandardMaterial({
        map: scpTexture,
        roughness: 0.7,
        metalness: 0.1
    });

    // ТУЛОВИЩЕ И НОГИ
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.4, 0.6);
    const body = new THREE.Mesh(bodyGeo, scpMaterial);
    body.position.y = 1.0;
    scp173Group.add(body);

    // ГОЛОВА С ЕСТЕСТВЕННЫМ НАЛОЖЕНИЕМ ЛИЦА
    const headGeo = new THREE.BoxGeometry(0.7, 0.8, 0.7);
    const head = new THREE.Mesh(headGeo, scpMaterial);
    head.position.y = 2.0;
    scp173Group.add(head);

    // РУКИ
    const armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const leftArm = new THREE.Mesh(armGeo, scpMaterial);
    leftArm.position.set(-0.5, 1.1, 0);
    scp173Group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, scpMaterial);
    rightArm.position.set(0.5, 1.1, 0);
    scp173Group.add(rightArm);

    scp173Group.position.set(12, 0, -8);
    scene.add(scp173Group);
}

// ==========================================
// ПОСТРОЕНИЕ КАРТЫ И КОЛЛИЗИИ
// ==========================================

function createWall(x, z, width, depth, height = 4) {
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(wallGeo, metalMaterial);
    wall.position.set(x, height / 2, z);
    scene.add(wall);

    const box = new THREE.Box3().setFromObject(wall);
    colliders.push(box);
}

function createFloor(x, z, width, depth) {
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeo, tilesMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    scene.add(floor);
}

function createLight(x, y, z, color = 0xffaa00, intensity = 2.0) {
    const light = new THREE.PointLight(color, intensity, 14);
    light.position.set(x, y, z);
    scene.add(light);
}

function buildBaseMap() {
    colliders = [];

    // ГЛАВНЫЙ КОРИДОР
    createFloor(0, 0, 6, 30);
    createWall(-3.2, 0, 0.4, 30);
    createWall(3.2, 5, 0.4, 20);
    createWall(0, 15, 6.8, 0.4);
    createLight(0, 3.5, 8);
    createLight(0, 3.5, -2);

    // КАМЕРА SCP-173
    createFloor(10, -8, 14, 10);
    createWall(10, -13, 14, 0.4);
    createWall(10, -3, 14, 0.4);
    createWall(17, -8, 0.4, 10);
    createLight(10, 3.5, -8, 0xff1111, 2.5);

    // КОМНАТА УПРАВЛЕНИЯ
    createFloor(-10, -10, 14, 14);
    createWall(-10, -17, 14, 0.4);
    createWall(-17, -10, 0.4, 14);
    createWall(-10, -3, 14, 0.4);
    createWall(-3.2, -14, 0.4, 6);
    createLight(-10, 3.5, -10, 0x00ff66, 2.0);

    // ШЛЮЗ
    createWall(0, -15, 6.8, 0.4);
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

    const stepDistance = 2.2;
    const directionToPlayer = new THREE.Vector3();
    directionToPlayer.subVectors(camera.position, scp173Group.position).normalize();

    const nextPos = scp173Group.position.clone().add(directionToPlayer.multiplyScalar(stepDistance));

    const scpRadius = 0.6;
    const scpBox = new THREE.Box3(
        new THREE.Vector3(nextPos.x - scpRadius, 0, nextPos.z - scpRadius),
        new THREE.Vector3(nextPos.x + scpRadius, 3, nextPos.z + scpRadius)
    );

    let hitsWall = false;
    for (let i = 0; i < colliders.length; i++) {
        if (scpBox.intersectsBox(colliders[i])) {
            hitsWall = true;
            break;
        }
    }

    if (!hitsWall) {
        scp173Group.position.copy(nextPos);
    } else {
        const slidePosX = scp173Group.position.clone().add(new THREE.Vector3(directionToPlayer.x * stepDistance, 0, 0));
        const slideBoxX = new THREE.Box3(
            new THREE.Vector3(slidePosX.x - scpRadius, 0, slidePosX.z - scpRadius),
            new THREE.Vector3(slidePosX.x + scpRadius, 3, slidePosX.z + scpRadius)
        );

        let hitX = false;
        for (let i = 0; i < colliders.length; i++) {
            if (slideBoxX.intersectsBox(colliders[i])) { hitX = true; break; }
        }

        if (!hitX) {
            scp173Group.position.copy(slidePosX);
        } else {
            const slidePosZ = scp173Group.position.clone().add(new THREE.Vector3(0, 0, directionToPlayer.z * stepDistance));
            const slideBoxZ = new THREE.Box3(
                new THREE.Vector3(slidePosZ.x - scpRadius, 0, slidePosZ.z - scpRadius),
                new THREE.Vector3(slidePosZ.x + scpRadius, 3, slidePosZ.z + scpRadius)
            );

            let hitZ = false;
            for (let i = 0; i < colliders.length; i++) {
                if (slideBoxZ.intersectsBox(colliders[i])) { hitZ = true; break; }
            }

            if (!hitZ) {
                scp173Group.position.copy(slidePosZ);
            }
        }
    }

    scp173Group.lookAt(camera.position.x, scp173Group.position.y, camera.position.z);

    const audio = document.getElementById('snd-glitch');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

// ==========================================
// ПРОВЕРКА СТОЛКНОВЕНИЙ И ИГРОВОЙ ЦИКЛ
// ==========================================

function checkCollisions(newPosition) {
    const playerRadius = 0.5;
    const playerBox = new THREE.Box3(
        new THREE.Vector3(newPosition.x - playerRadius, 0, newPosition.z - playerRadius),
        new THREE.Vector3(newPosition.x + playerRadius, 3, newPosition.z + playerRadius)
    );

    for (let i = 0; i < colliders.length; i++) {
        if (playerBox.intersectsBox(colliders[i])) {
            return true;
        }
    }
    return false;
}

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

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 22.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 22.0 * delta;

    const oldPosition = camera.position.clone();
    
    camera.translateX(-velocity.x * delta);
    camera.translateZ(velocity.z * delta);
    camera.position.y = 1.6;

    if (checkCollisions(camera.position)) {
        camera.position.copy(oldPosition);
    }

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
