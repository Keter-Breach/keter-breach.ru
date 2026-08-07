// ====================================================================
// SCP: ZONE 19 - MODERN GRAPHICS & GAMEPLAY ENGINE
// ====================================================================

// --- Синтезатор звука (Web Audio API) ---
class SoundManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
    }

    playFootstep() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playFlashlightClick() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.03);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    }

    playSCPConcreteMove() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }
}

const sounds = new SoundManager();

// --- Состояние игры ---
let scene, camera, renderer;
let flashlight, flashlightTarget;
let isFlashlightOn = true;

// Физика игрока
const player = {
    position: new THREE.Vector3(0, 1.6, 12),
    stamina: 100,
    isSprinting: false,
    headBobTimer: 0,
    height: 1.6
};

// Управление
let keys = {};
let yaw = 0, pitch = 0;
let isPointerLocked = false;

// Моргание
let blinkMeter = 100;
let isBlinking = false;

// Объект терминала и коллизии
const colliders = [];
let terminalMesh;
let isNearTerminal = false;

// SCP-173
let scp173Group;
let raycaster;

// PBR Материалы
function createPBRMaterials() {
    // Текстура бетона (Стены)
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 512; wallCanvas.height = 512;
    const wCtx = wallCanvas.getContext('2d');
    wCtx.fillStyle = '#222522';
    wCtx.fillRect(0,0,512,512);

    for(let i=0; i<8000; i++) {
        const val = Math.floor(Math.random() * 40);
        wCtx.fillStyle = `rgb(${25+val},${30+val},${25+val})`;
        wCtx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
    }
    wCtx.strokeStyle = '#111511';
    wCtx.lineWidth = 4;
    wCtx.strokeRect(0,0,512,512);

    const wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;

    // Плитка пола
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512; floorCanvas.height = 512;
    const fCtx = floorCanvas.getContext('2d');
    fCtx.fillStyle = '#111611';
    fCtx.fillRect(0,0,512,512);

    fCtx.strokeStyle = '#050a05';
    fCtx.lineWidth = 6;
    for(let i=0; i<=512; i+=64) {
        fCtx.beginPath(); fCtx.moveTo(i,0); fCtx.lineTo(i,512); fCtx.stroke();
        fCtx.beginPath(); fCtx.moveTo(0,i); fCtx.lineTo(512,i); fCtx.stroke();
    }

    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;

    return {
        wall: new THREE.MeshStandardMaterial({
            map: wallTex,
            roughness: 0.85,
            metalness: 0.1
        }),
        floor: new THREE.MeshStandardMaterial({
            map: floorTex,
            roughness: 0.4,
            metalness: 0.5
        }),
        ceiling: new THREE.MeshStandardMaterial({
            color: 0x182018,
            roughness: 0.9
        })
    };
}

let materials;

// --- Инициализация 3D-мира ---
function initGame() {
    document.getElementById('start-overlay').classList.add('hidden');
    sounds.init();

    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Мягкие тени и HDR Тонемаппинг
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010401);
    scene.fog = new THREE.FogExp2(0x010401, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.rotation.order = 'YXZ';

    materials = createPBRMaterials();
    raycaster = new THREE.Raycaster();

    // Фоновый рассеянный свет
    const ambientLight = new THREE.AmbientLight(0x081208, 0.4);
    scene.add(ambientLight);

    setupFlashlight();
    buildComplexMap();
    createSCP173Model();

    // Слушатели событий
    canvas.addEventListener('click', () => {
        if (!isPointerLocked) canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = (document.pointerLockElement === canvas);
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', (e) => handleKey(e, true));
    document.addEventListener('keyup', (e) => handleKey(e, false));
    window.addEventListener('resize', onWindowResize);

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// --- Ручной Динамический Фонарик ---
function setupFlashlight() {
    flashlight = new THREE.SpotLight(0xffffff, 4.0, 22, Math.PI / 6, 0.4, 1.5);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;

    flashlightTarget = new THREE.Object3D();
    scene.add(flashlightTarget);
    flashlight.target = flashlightTarget;

    scene.add(flashlight);
}

// --- Построение карты ---
function buildComplexMap() {
    // 1. Центральный Коридор
    createRoom(0, 0, 6, 40, 4);
    
    // Источники света с динамическими тенями
    addLightFixture(0, 12, 0xffaa44, 2.0);
    addLightFixture(0, 0, 0xffaa44, 2.0);
    addLightFixture(0, -12, 0xffaa44, 2.0);

    // 2. Операторская
    createRoom(-10, -10, 14, 14, 4);
    addLightFixture(-10, -10, 0x00ff66, 2.5);

    // Интерактивный Терминал
    const termGeo = new THREE.BoxGeometry(0.8, 1.4, 0.5);
    const termMat = new THREE.MeshStandardMaterial({
        color: 0x00ff66,
        emissive: 0x004411,
        emissiveIntensity: 0.8
    });
    terminalMesh = new THREE.Mesh(termGeo, termMat);
    terminalMesh.position.set(-11, 0.7, -12);
    terminalMesh.castShadow = true;
    scene.add(terminalMesh);

    // 3. Камера SCP-173
    createRoom(10, -8, 14, 10, 4);
    addLightFixture(10, -8, 0xff2222, 3.0);

    // Декоративные ящики
    createCrate(2, 8, 1.2);
    createCrate(-13, -12, 1.4);
}

function createRoom(x, z, width, depth, height) {
    materials.floor.map.repeat.set(width / 4, depth / 4);
    materials.wall.map.repeat.set(width / 4, height / 4);

    // Пол
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    floor.receiveShadow = true;
    scene.add(floor);

    // Потолок
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), materials.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(x, height, z);
    scene.add(ceiling);

    // Стены
    const hw = width / 2;
    const hd = depth / 2;

    addWall(x - hw, z, 0.3, depth, height);
    addWall(x + hw, z, 0.3, depth, height);
    addWall(x, z - hd, width, 0.3, height);
    addWall(x, z + hd, width, 0.3, height);
}

function addWall(x, z, w, d, h) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.wall);
    wall.position.set(x, h / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    colliders.push(new THREE.Box3().setFromObject(wall));
}

function addLightFixture(x, z, color, intensity) {
    const light = new THREE.PointLight(color, intensity, 12);
    light.position.set(x, 3.7, z);
    light.castShadow = true;
    scene.add(light);

    const lampMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 1.0
    });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), lampMat);
    lamp.position.set(x, 3.9, z);
    scene.add(lamp);
}

function createCrate(x, z, size) {
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), crateMat);
    crate.position.set(x, size / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);

    colliders.push(new THREE.Box3().setFromObject(crate));
}

// --- Трехмерная модель SCP-173 ---
function createSCP173Model() {
    scp173Group = new THREE.Group();

    const concreteMat = new THREE.MeshStandardMaterial({
        color: 0xaaaa99,
        roughness: 0.9
    });

    const faceMat = new THREE.MeshStandardMaterial({
        color: 0x883322,
        roughness: 0.7
    });

    // Тело
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.5, 12), concreteMat);
    body.position.y = 0.9;
    body.castShadow = true;
    scp173Group.add(body);

    // Голова
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), concreteMat);
    head.position.y = 1.8;
    head.scale.set(1, 1.2, 0.9);
    head.castShadow = true;
    scp173Group.add(head);

    // Лицо
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), faceMat);
    face.position.set(0, 1.85, 0.35);
    scp173Group.add(face);

    // Руки
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9);
    const leftArm = new THREE.Mesh(armGeo, concreteMat);
    leftArm.position.set(-0.45, 1.1, 0.1);
    leftArm.rotation.z = Math.PI / 6;
    scp173Group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, concreteMat);
    rightArm.position.set(0.45, 1.1, 0.1);
    rightArm.rotation.z = -Math.PI / 6;
    scp173Group.add(rightArm);

    scp173Group.position.set(10, 0, -8);
    scene.add(scp173Group);
}

// --- Управление ---
function handleMouseMove(e) {
    if (!isPointerLocked) return;

    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;

    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
}

function handleKey(e, isDown) {
    keys[e.code] = isDown;

    if (isDown) {
        if (e.code === 'KeyF') toggleFlashlight();
        if (e.code === 'Space') triggerBlink();
        if (e.code === 'KeyE' && isNearTerminal) openTerminal();
    }
}

function toggleFlashlight() {
    isFlashlightOn = !isFlashlightOn;
    flashlight.visible = isFlashlightOn;
    sounds.playFlashlightClick();
    document.getElementById('flashlight-state').textContent = isFlashlightOn ? '[ВКЛ]' : '[ВЫКЛ]';
    document.getElementById('flashlight-state').style.color = isFlashlightOn ? '#00ff66' : '#ff4444';
}

// --- Рейкастинг прямой видимости SCP-173 ---
function canPlayerSee173() {
    if (isBlinking || !scp173Group) return false;

    // 1. Проверка конуса обзора
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    const toSCP = new THREE.Vector3().subVectors(scp173Group.position, camera.position).normalize();
    const dot = camDir.dot(toSCP);

    if (dot < 0.4) return false; // За пределами поля зрения

    // 2. Проверка препятствий лучом (Raycast)
    raycaster.set(camera.position, toSCP);
    const intersects = raycaster.intersectObjects(scene.children, true);

    for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        if (obj.parent === scp173Group || obj === scp173Group) {
            return true; // В прямой видимости
        }
        if (obj.type === "Mesh" && obj !== scp173Group) {
            return false; // Препятствие (стена/ящик)
        }
    }

    return false;
}

// --- ИИ SCP-173 ---
function updateSCP173() {
    if (!scp173Group) return;

    const isSeen = canPlayerSee173();

    if (!isSeen) {
        const dist = camera.position.distanceTo(scp173Group.position);

        if (dist < 1.8) {
            alert("SCP-173 СЛОМАЛ ВАМ ШЕЙНЫЕ ПОЗВОНКИ!");
            location.reload();
            return;
        }

        const dir = new THREE.Vector3().subVectors(camera.position, scp173Group.position);
        dir.y = 0;
        dir.normalize();

        scp173Group.position.add(dir.multiplyScalar(0.18));
        scp173Group.lookAt(camera.position.x, scp173Group.position.y, camera.position.z);

        if (Math.random() < 0.1) sounds.playSCPConcreteMove();
    }
}

// --- Физика игрока ---
let lastTime = 0;
let footstepTimer = 0;

function updatePlayer(delta) {
    if (!isPointerLocked) return;

    const moveDir = new THREE.Vector3();
    if (keys['KeyW']) moveDir.z -= 1;
    if (keys['KeyS']) moveDir.z += 1;
    if (keys['KeyA']) moveDir.x -= 1;
    if (keys['KeyD']) moveDir.x += 1;
    moveDir.normalize();

    // Спринт и выносливость
    player.isSprinting = keys['ShiftLeft'] && moveDir.length() > 0 && player.stamina > 0;
    const speed = player.isSprinting ? 6.5 : 3.2;

    if (player.isSprinting) {
        player.stamina = Math.max(0, player.stamina - delta * 25);
    } else {
        player.stamina = Math.min(100, player.stamina + delta * 15);
    }
    document.getElementById('stamina-fill').style.width = `${player.stamina}%`;
    document.getElementById('stamina-val').textContent = `${Math.round(player.stamina)}%`;

    // Вращение и перемещение
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = pitch;
    euler.y = yaw;
    camera.quaternion.setFromEuler(euler);

    const moveVector = moveDir.clone().applyQuaternion(camera.quaternion);
    moveVector.y = 0;
    moveVector.normalize().multiplyScalar(speed * delta);

    // Коллизии
    const newPos = player.position.clone().add(moveVector);
    const playerBox = new THREE.Box3().setFromCenterAndSize(newPos, new THREE.Vector3(0.6, 1.6, 0.6));

    let collided = false;
    for (let c of colliders) {
        if (playerBox.intersectsBox(c)) {
            collided = true;
            break;
        }
    }

    if (!collided) {
        player.position.copy(newPos);
    }

    // Покачивание головы при ходьбе (Head Bobbing)
    if (moveDir.length() > 0 && !collided) {
        player.headBobTimer += delta * (player.isSprinting ? 14 : 9);
        const bobOffset = Math.sin(player.headBobTimer) * 0.05;
        camera.position.set(player.position.x, player.height + bobOffset, player.position.z);

        footstepTimer += delta;
        if (footstepTimer > (player.isSprinting ? 0.28 : 0.45)) {
            sounds.playFootstep();
            footstepTimer = 0;
        }
    } else {
        camera.position.set(player.position.x, player.height, player.position.z);
    }

    // Привязка фонарика
    flashlight.position.copy(camera.position);
    const targetPos = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
    flashlightTarget.position.copy(targetPos);

    // Дистанция взаимодействия с терминалом
    if (terminalMesh) {
        const dist = camera.position.distanceTo(terminalMesh.position);
        isNearTerminal = (dist < 2.2);
        
        const prompt = document.getElementById('interaction-prompt');
        const crosshair = document.getElementById('crosshair');
        
        if (isNearTerminal) {
            prompt.classList.add('visible');
            crosshair.classList.add('interactable');
        } else {
            prompt.classList.remove('visible');
            crosshair.classList.remove('interactable');
        }
    }
}

// --- Система моргания ---
function triggerBlink() {
    isBlinking = true;
    document.getElementById('blink-overlay').style.opacity = '1';
    
    setTimeout(() => {
        document.getElementById('blink-overlay').style.opacity = '0';
        isBlinking = false;
        blinkMeter = 100;
    }, 150);
}

function updateBlink(delta) {
    if (!isBlinking) {
        blinkMeter -= delta * 12;
        if (blinkMeter <= 0) triggerBlink();
    }
    document.getElementById('blink-fill').style.width = `${Math.max(0, blinkMeter)}%`;
    document.getElementById('blink-val').textContent = `${Math.round(Math.max(0, blinkMeter))}%`;
}

// --- Терминал ---
function openTerminal() {
    document.exitPointerLock();
    document.getElementById('terminal-modal').classList.remove('hidden');
}

function closeTerminal() {
    document.getElementById('terminal-modal').classList.add('hidden');
    document.getElementById('game-canvas').requestPointerLock();
}

function verifyTerminalCode() {
    const val = document.getElementById('terminal-input').value.trim();
    if (val === '3') {
        alert("АВТОРИЗАЦИЯ УСПЕШНА. ШЛЮЗ РАЗБЛОКИРОВАН!");
        closeTerminal();
    } else {
        alert("ОШИБКА ДОСТУПА! ОТКАЗАНО.");
    }
}

// --- Изменение размера окна ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Игровой цикл ---
function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    updatePlayer(delta);
    updateBlink(delta);
    updateSCP173();

    renderer.render(scene, camera);
}
const gameMap = {
  // Новая точка спавна игрока
  spawnPoint: "class_d_cells",

  locations: {
    // Зона спавна
    class_d_cells: {
      id: "class_d_cells",
      title: "Камеры содержания персонала класса D",
      description: "Минималистичный блок с несколькими нарами и тяжелой гермодверью.",
      exits: { north: "heavy_hallway_1" },
      items: ["карта_доступа_1"]
    },

    // Новые локации
    heavy_hallway_1: {
      id: "heavy_hallway_1",
      title: "Главный коридор сектора D",
      description: "Длинный коридор с мигающим люминесцентным освещением.",
      exits: { south: "class_d_cells", east: "security_checkpoint", west: "cafeteria" }
    },

    security_checkpoint: {
      id: "security_checkpoint",
      title: "КПП охраны",
      description: "Заблокированный пост с бронированным стеклом и пультами управления.",
      exits: { west: "heavy_hallway_1", north: "research_sector_a" },
      items: ["аптечка", "рация"]
    },

    cafeteria: {
      id: "cafeteria",
      title: "Столовая персонала",
      description: "Перевернутые столы и разбросанная подносы. Похоже, здесь была спешная эвакуация.",
      exits: { east: "heavy_hallway_1", south: "storage_room" },
      items: ["фонарик"]
    },

    storage_room: {
      id: "storage_room",
      title: "Склад снабжения",
      description: "Тесное помещение со стеллажами и ящиками.",
      exits: { north: "cafeteria" },
      items: ["батарейка"]
    },

    research_sector_a: {
      id: "research_sector_a",
      title: "Исследовательский блок A",
      description: "Лаборатории с терминалами и разбитыми пробирками.",
      exits: { south: "security_checkpoint", north: "scp_containment_173" }
    },

    scp_containment_173: {
      id: "scp_containment_173",
      title: "Камера содержания SCP",
      description: "Массивная герметичная камера с системой наблюдения.",
      exits: { south: "research_sector_a" }
    }
  }
};

// Инициализация игрока на новом спавне
let player = {
  currentLocation: gameMap.spawnPoint,
  inventory: []
};
