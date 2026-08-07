// --- АУДИОДВИЖОК (Web Audio API - звуки без файлов) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'click') {
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
  } else if (type === 'step') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'hum') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
    osc.start();
  }
}

// Постоянный фоновый гул комплекса
let ambientSound = null;

// --- ТЕКСТОВАЯ ЧАСТЬ ---
const map = {
  d_cell: {
    name: "Камера D-Class",
    desc: "Вы пришли в себя. Голова раскалывается. Экран перед глазами мигает, слышен гул трансформаторов.",
    exits: { "Выйти в коридор": "d_hallway" }
  },
  d_hallway: {
    name: "Коридор блока D",
    desc: "Лампы тускло освещают серые стены. Впереди находится пункт наблюдения.",
    exits: { "Войти в пункт наблюдения": "security_room" }
  },
  security_room: {
    name: "Пункт наблюдения",
    desc: "Экран терминала шипит. Из динамика раздается голос:\n\n«ГОТОВ ЛИ ТЫ УВИДЕТЬ, ЧТО НАХОДИТСЯ В ТЕМНОТЕ?»",
    exits: {
      "«Да»": "START_3D",
      "«Включить фонарик и осмотреться»": "START_3D"
    }
  }
};

let currentRoomKey = "d_cell";

function renderTextGame() {
  const room = map[currentRoomKey];
  document.getElementById("current-location").textContent = room.name;
  document.getElementById("description").textContent = room.desc;
  
  const container = document.getElementById("buttons-container");
  container.innerHTML = "";
  
  for (const [text, target] of Object.entries(room.exits)) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.onclick = () => {
      playSound('click');
      if (target === "START_3D") {
        init3DMode();
      } else {
        currentRoomKey = target;
        renderTextGame();
      }
    };
    container.appendChild(btn);
  }
}

renderTextGame();

// --- ГЕНЕРАТОР ТЕКСТУР (Canvas) ---
function generateTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (type === 'wall') {
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#1f1f1f';
    for (let i = 0; i < 500; i++) ctx.fillRect(Math.random()*256, Math.random()*256, 2, 2);
    ctx.strokeStyle = '#151515'; ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256); // Плиточные швы
  } else if (type === 'floor') {
    ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#222222';
    for (let i = 0; i < 256; i += 32) {
      ctx.fillRect(i, 0, 1, 256); ctx.fillRect(0, i, 256, 1);
    }
  }
  return new THREE.CanvasTexture(canvas);
}

// --- 3D ДВИЖОК И ФОНАРИК ---
let scene, camera, renderer, flashlight;
let flashlightOn = true;
let battery = 100;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
let stepTimer = 0;

function init3DMode() {
  document.getElementById("text-game").classList.add("hidden");
  const container = document.getElementById("three-container");
  container.classList.remove("hidden");

  playSound('hum');

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020202, 0.12);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Фонарик игрока
  flashlight = new THREE.SpotLight(0xddffff, 3, 18, Math.PI / 5, 0.4, 1);
  flashlight.position.set(0.2, -0.2, 0); // Чуть правее и ниже глаз
  camera.add(flashlight);
  flashlight.target = camera;
  scene.add(camera);

  // Тусклый свет комплекса
  const ambientLight = new THREE.AmbientLight(0x050d05);
  scene.add(ambientLight);

  buildFacilityMap();

  // Управление
  container.addEventListener('click', () => document.body.requestPointerLock());

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= e.movementX * 0.002;
      camera.rotation.x -= e.movementY * 0.002;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
  });

  document.addEventListener('keydown', (e) => {
    onKey(e.code, true);
    if (e.code === 'KeyF') toggleFlashlight();
  });
  document.addEventListener('keyup', (e) => onKey(e.code, false));

  animate();
}

function toggleFlashlight() {
  if (battery <= 0) return;
  flashlightOn = !flashlightOn;
  flashlight.intensity = flashlightOn ? 3 : 0;
  playSound('click');
}

function onKey(code, state) {
  switch (code) {
    case 'KeyW': moveForward = state; break;
    case 'KeyS': moveBackward = state; break;
    case 'KeyA': moveLeft = state; break;
    case 'KeyD': moveRight = state; break;
  }
}

// Генерация разветвленной карты комплекса
function buildFacilityMap() {
  const wallTex = generateTexture('wall');
  wallTex.wrapS = THREE.RepeatWrapping; wallTex.wrapT = THREE.RepeatWrapping;
  const floorTex = generateTexture('floor');
  
  const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });

  // Пол
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Потолок
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), wallMat);
  ceiling.position.y = 3.5;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // Карта коридоров (Сетка лабиринта)
  const grid = [
    [1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1]
  ];

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 1) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 4), wallMat);
        wall.position.set((c - 4) * 4, 1.75, (r - 3) * 4);
        scene.add(wall);
      }
    }
  }

  // Аварийная лампочка вдали
  const redLight = new THREE.PointLight(0xff0033, 1.5, 8);
  redLight.position.set(0, 2.5, -12);
  scene.add(redLight);
}

// Игровой цикл
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  // Расход батареи фонарика
  if (flashlightOn && battery > 0) {
    battery -= delta * 0.5; // Батарея садится постепенно
    document.getElementById("battery-level").textContent = `${Math.max(0, Math.round(battery))}%`;
    if (battery <= 0) {
      flashlightOn = false;
      flashlight.intensity = 0;
    }
  }

  // Движение
  velocity.x -= velocity.x * 8.0 * delta;
  velocity.z -= velocity.z * 8.0 * delta;

  const moveDirZ = Number(moveForward) - Number(moveBackward);
  const moveDirX = Number(moveRight) - Number(moveLeft);

  if (moveForward || moveBackward) velocity.z -= moveDirZ * 30.0 * delta;
  if (moveLeft || moveRight) velocity.x -= moveDirX * 30.0 * delta;

  camera.translateX(-velocity.x * delta);
  camera.translateZ(velocity.z * delta);
  camera.position.y = 1.6;

  // Звук шагов
  if (moveForward || moveBackward || moveLeft || moveRight) {
    stepTimer += delta;
    if (stepTimer > 0.45) {
      playSound('step');
      stepTimer = 0;
    }
  }

  prevTime = time;
  renderer.render(scene, camera);
}
