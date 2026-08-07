// === 0. ПРЕДЗАГРУЗКА И НАСТРОЙКА ТЕКСТУР ===
const textureLoader = new THREE.TextureLoader();

function loadCustomMaterial(url, repeatX = 1, repeatY = 1, roughness = 0.8) {
  const mat = new THREE.MeshStandardMaterial({ roughness: roughness });
  if (url) {
    mat.map = textureLoader.load(url, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
    });
  }
  return mat;
}

// === 1. АУДИОСИСТЕМА ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  // Добавляем фильтр для "глухого" VHS-звука
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  const t = audioCtx.currentTime;

  if (type === 'click') {
    osc.frequency.setValueAtTime(600, t);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.start(); osc.stop(t + 0.04);
  } else if (type === 'step') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(60 + Math.random() * 15, t);
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(); osc.stop(t + 0.08);
  } else if (type === 'pickup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(); osc.stop(t + 0.12);
  } else if (type === 'door') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(); osc.stop(t + 0.4);
  }
}

// === 2. СОСТОЯНИЕ ИГРОКА И СЮЖЕТ ===
window.playerState = { keycardL1: false, keycardL2: false };
let currentChapter = 1, loopCount = 1;

const storyData = {
  1: {
    title: "ГЛАВА 1: НАРУШЕНИЕ СОДЕРЖАНИЯ",
    location: "Сектор D-12",
    desc: "Аварийные сирены ревут. Комплекс погрузился во тьму. Найдите пропускные карты и выберитесь на поверхность, пока не поздно.",
    choices: [{ text: "Войти в комплекс (3D)", nextChapter: 2 }]
  },
  2: { title: "3D КОМПЛЕКС", is3D: true, nextChapter: 3 },
  3: {
    title: "ПОБЕГ УСПЕШЕН",
    location: "Поверхность",
    desc: "Вы преодолели все отсеки сдерживания! Команда эвакуации забирает вас.",
    choices: [{ text: "Начать заново", nextChapter: 'RESET' }]
  }
};

function renderChapter(chapNum) {
  if (chapNum === 'RESET') {
    loopCount++;
    window.playerState = { keycardL1: false, keycardL2: false };
    chapNum = 1;
  }
  currentChapter = chapNum;
  const data = storyData[chapNum];

  if (data.is3D) { init3DMode(); return; }

  document.getElementById("chapter-title").textContent = data.title;
  document.getElementById("current-location").textContent = data.location || "SCP Facility";
  document.getElementById("description").textContent = data.desc;
  document.getElementById("loop-count").textContent = `#${loopCount}`;

  const container = document.getElementById("buttons-container");
  container.innerHTML = "";
  data.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.textContent = choice.text;
    btn.onclick = () => { playSound('click'); renderChapter(choice.nextChapter); };
    container.appendChild(btn);
  });
}

function generateKeycardTexture(levelStr, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorHex; ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = '#111'; ctx.fillRect(0, 20, 256, 30);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Courier New';
  ctx.fillText("SCP SECURITY", 20, 85);
  ctx.font = 'bold 18px Courier New';
  ctx.fillText(`LEVEL ${levelStr}`, 20, 125);
  return new THREE.CanvasTexture(canvas);
}

// === 3. 3D ДВИЖОК ===
let scene, camera, renderer, flashlight;
let flashlightOn = true, battery = 100;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
let headBobTimer = 0;

let walls = [];
let interactiveItems = [];
let doors = {};

let wallMaterial, floorMaterial, doorMaterial, tableMaterial, serverMaterial;

function init3DMode() {
  document.getElementById("text-game").classList.add("hidden");
  const container = document.getElementById("three-container");
  container.classList.remove("hidden");

  // Применяем мрачный VHS-стиль через CSS к контейнеру игры
  container.style.filter = "contrast(1.3) brightness(0.85) sepia(0.2) saturate(0.8)";

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020305);
  scene.fog = new THREE.FogExp2(0x020305, 0.035); // Густой темный туман

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, -8);

  // Отключаем antialias для пленочной зернистости
  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Исправленный тайлинг текстур под размеры объектов
  wallMaterial = loadCustomMaterial('textures/damaged_concrete.jpg', 4, 2, 0.8);
  floorMaterial = loadCustomMaterial('textures/MetalPlates006.png', 12, 16, 0.4);
  doorMaterial = loadCustomMaterial('textures/Paint002.png', 1, 1, 0.5);
  tableMaterial = loadCustomMaterial('textures/dark_wood_diff_1k.jpg', 1, 1, 0.7);
  serverMaterial = loadCustomMaterial('textures/Metal041B.png', 1, 1, 0.3);

  // Фонарик строго по центру взгляда (нагрудный)
  flashlight = new THREE.SpotLight(0xddeeff, 5.0, 35, Math.PI / 3, 0.4, 1.5);
  flashlight.position.set(0, 0, 0);
  flashlight.target.position.set(0, 0, 1);
  camera.add(flashlight);
  camera.add(flashlight.target);
  scene.add(camera);

  // Минимальный фоновый свет (почти полная темнота)
  const ambientLight = new THREE.AmbientLight(0x111622, 0.4);
  scene.add(ambientLight);

  build10ZonesMap();
  updateInventoryHUD();

  container.addEventListener('click', () => document.body.requestPointerLock());
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('keydown', (e) => onKey(e.code, true));
  document.addEventListener('keyup', (e) => onKey(e.code, false));

  animate3D();
}

function onMouseMove(e) {
  if (document.pointerLockElement === document.body) {
    camera.rotation.y -= e.movementX * 0.002;
    camera.rotation.x -= e.movementY * 0.002;
    camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, camera.rotation.x));
  }
}

function onKey(code, state) {
  switch (code) {
    case 'KeyW': moveForward = state; break;
    case 'KeyS': moveBackward = state; break;
    case 'KeyA': moveLeft = state; break;
    case 'KeyD': moveRight = state; break;
    case 'ShiftLeft': isSprinting = state; break;
    case 'KeyF': if (state) toggleFlashlight(); break;
    case 'KeyE': if (state) interact3D(); break;
  }
}

function toggleFlashlight() {
  if (battery <= 0) return;
  flashlightOn = !flashlightOn;
  flashlight.intensity = flashlightOn ? 5.0 : 0;
  playSound('click');
}

// === 4. ПОСТРОЕНИЕ 10 ЗОН И МЕБЕЛИ ===
function build10ZonesMap() {
  walls = []; interactiveItems = [];
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.9 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 30);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 3.2, 30);
  scene.add(ceiling);

  function addW(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
    m.position.set(x, y, z); scene.add(m); walls.push(m);
  }

  function addPointLight(x, z, color = 0xffa040) {
    const light = new THREE.PointLight(color, 1.8, 15);
    light.position.set(x, 2.8, z);
    scene.add(light);
    
    const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.3), new THREE.MeshBasicMaterial({ color: 0xffeeaa }));
    lampMesh.position.set(x, 3.1, z);
    scene.add(lampMesh);
  }

  // Геометрия коридоров комплекса
  addW(8, 3.2, 0.5, 0, 1.6, -10); addW(0.5, 3.2, 12, -4, 1.6, -4); addW(0.5, 3.2, 12, 4, 1.6, -4);
  addW(0.5, 3.2, 20, -4, 1.6, 12); addW(0.5, 3.2, 20, 4, 1.6, 12);
  addW(12, 3.2, 0.5, -10, 1.6, 6); addW(12, 3.2, 0.5, -10, 1.6, 18); addW(0.5, 3.2, 12, -16, 1.6, 12);
  addW(12, 3.2, 0.5, 10, 1.6, 6); addW(12, 3.2, 0.5, 10, 1.6, 18); addW(0.5, 3.2, 16, 16, 1.6, 12);
  addW(3, 3.2, 0.5, -2.5, 1.6, 22); addW(3, 3.2, 0.5, 2.5, 1.6, 22);
  addW(0.5, 3.2, 20, -6, 1.6, 32); addW(0.5, 3.2, 20, 6, 1.6, 32);
  addW(16, 3.2, 0.5, -8, 1.6, 42); addW(16, 3.2, 0.5, 8, 1.6, 42); addW(0.5, 3.2, 16, -16, 1.6, 50); addW(0.5, 3.2, 16, 16, 1.6, 50);
  addW(14, 3.2, 0.5, -9, 1.6, 58); addW(14, 3.2, 0.5, 9, 1.6, 58);
  addW(0.5, 3.2, 20, -4, 1.6, 68); addW(0.5, 3.2, 20, 4, 1.6, 68);
  addW(3.2, 3.2, 0.5, -2.4, 1.6, 78); addW(3.2, 3.2, 0.5, 2.4, 1.6, 78);

  addPointLight(0, -4);
  addPointLight(0, 12, 0xff3322); // Аварийный красный свет в центре
  addPointLight(-10, 12, 0x40a0ff);
  addPointLight(0, 32);
  addPointLight(0, 50, 0xff3322);
  addPointLight(0, 68);

  doors.doorL1 = createDoor(0, 1.4, 22);
  doors.doorL2 = createDoor(0, 1.4, 58);
  doors.doorExit = createDoor(0, 1.4, 78);

  createTable(-10, 0, 12);
  createServerRack(-4, 0, 32);
  createServerRack(-4, 0, 35);

  spawnKeycard(-10, 0.82, 12, '1', '#00aaff', 'keycardL1');
  spawnKeycard(-4, 0.82, 35, '2', '#aa00ff', 'keycardL2');
  spawnBattery(12, 0.3, 12);
}

function createDoor(x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.2), doorMaterial);
  m.position.set(x, y, z); scene.add(m); walls.push(m);
  return m;
}

function createTable(x, y, z) {
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.2), tableMaterial);
  top.position.set(x, y + 0.75, z); scene.add(top); walls.push(top);
  
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), tableMaterial);
  leg1.position.set(x - 1.1, y + 0.375, z - 0.5); scene.add(leg1);
  const leg2 = leg1.clone(); leg2.position.set(x + 1.1, y + 0.375, z - 0.5); scene.add(leg2);
  const leg3 = leg1.clone(); leg3.position.set(x - 1.1, y + 0.375, z + 0.5); scene.add(leg3);
  const leg4 = leg1.clone(); leg4.position.set(x + 1.1, y + 0.375, z + 0.5); scene.add(leg4);
}

function createServerRack(x, y, z) {
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.8), serverMaterial);
  rack.position.set(x, y + 1.2, z); scene.add(rack); walls.push(rack);

  const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), ledMat);
  led.position.set(x + 0.61, y + 1.8, z); scene.add(led);
}

function spawnKeycard(x, y, z, level, colorHex, type) {
  const cardMat = new THREE.MeshBasicMaterial({ map: generateKeycardTexture(level, colorHex) });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.22), cardMat);
  m.position.set(x, y, z); m.userData = { type: type };
  scene.add(m); interactiveItems.push(m);
}

function spawnBattery(x, y, z) {
  const batMat = new THREE.MeshStandardMaterial({ color: 0x00ff66, roughness: 0.3 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12), batMat);
  m.position.set(x, y, z); m.userData = { type: 'battery' };
  scene.add(m); interactiveItems.push(m);
}

// === 5. ИНВЕНТАРЬ И ВЗАИМОДЕЙСТВИЕ ===
function updateInventoryHUD() {
  const items = [];
  if (window.playerState.keycardL1) items.push("<span style='color:#00aaff;'>[Карта L-1]</span>");
  if (window.playerState.keycardL2) items.push("<span style='color:#aa00ff;'>[Карта L-2]</span>");
  document.getElementById("inv-items").innerHTML = items.length ? items.join(" ") : "Пусто";
}

function interact3D() {
  const p = camera.position;

  for (let i = interactiveItems.length - 1; i >= 0; i--) {
    const item = interactiveItems[i];
    if (p.distanceTo(item.position) < 2.5) {
      playSound('pickup');
      if (item.userData.type === 'keycardL1') {
        window.playerState.keycardL1 = true;
      } else if (item.userData.type === 'keycardL2') {
        window.playerState.keycardL2 = true;
      } else if (item.userData.type === 'battery') {
        battery = Math.min(100, battery + 50);
      }
      scene.remove(item); interactiveItems.splice(i, 1);
      updateInventoryHUD();
      return;
    }
  }

  if (p.distanceTo(doors.doorL1.position) < 2.5) {
    if (window.playerState.keycardL1) openDoor(doors.doorL1);
    else alert("Нужна Ключ-карта L-1 со стола в Офисе!");
  } else if (p.distanceTo(doors.doorL2.position) < 2.5) {
    if (window.playerState.keycardL2) openDoor(doors.doorL2);
    else alert("Нужна Ключ-карта L-2 из Серверной!");
  } else if (p.distanceTo(doors.doorExit.position) < 2.5) {
    if (window.playerState.keycardL2) {
      document.exitPointerLock();
      document.getElementById("three-container").classList.add("hidden");
      document.getElementById("text-game").classList.remove("hidden");
      renderChapter(3);
    }
  }
}

function openDoor(m) {
  playSound('door');
  m.position.y += 3.0;
  const idx = walls.indexOf(m);
  if (idx > -1) walls.splice(idx, 1);
}

// === 6. МИНИ-КАРТА ===
function drawMinimap() {
  const canvas = document.getElementById("minimap-canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 120, 120);

  const scale = 1.2;
  const cx = 60, cy = 20;

  ctx.fillStyle = '#00ff66';
  const px = cx + camera.position.x * scale;
  const pz = cy + camera.position.z * scale;
  ctx.beginPath();
  ctx.arc(px, pz, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffaa00';
  Object.values(doors).forEach(d => {
    if (d.position.y < 2.0) {
      ctx.fillRect(cx + d.position.x * scale - 4, cy + d.position.z * scale, 8, 2);
    }
  });
}

// === 7. ИГРОВОЙ ЦИКЛ ===
function checkCollision(newPos) {
  const r = 0.4;
  for (let i = 0; i < walls.length; i++) {
    const box = new THREE.Box3().setFromObject(walls[i]);
    const pBox = new THREE.Box3(
      new THREE.Vector3(newPos.x - r, 0, newPos.z - r),
      new THREE.Vector3(newPos.x + r, 3.0, newPos.z + r)
    );
    if (box.intersectsBox(pBox)) return true;
  }
  return false;
}

function animate3D() {
  if (document.getElementById("three-container").classList.contains("hidden")) return;
  requestAnimationFrame(animate3D);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (flashlightOn && battery > 0) {
    battery -= delta * (isSprinting ? 0.3 : 0.08);
    document.getElementById("battery-level").textContent = `${Math.max(0, Math.round(battery))}%`;
    if (battery <= 0) { flashlightOn = false; flashlight.intensity = 0; }
  }

  const speed = isSprinting ? 38.0 : 20.0;
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  const dirZ = Number(moveForward) - Number(moveBackward);
  const dirX = Number(moveRight) - Number(moveLeft);

  if (moveForward || moveBackward) velocity.z -= dirZ * speed * delta;
  if (moveLeft || moveRight) velocity.x -= dirX * speed * delta;

  const oldPos = camera.position.clone();
  camera.translateX(-velocity.x * delta);
  if (checkCollision(camera.position)) camera.position.x = oldPos.x;

  camera.translateZ(velocity.z * delta);
  if (checkCollision(camera.position)) camera.position.z = oldPos.z;

  if (moveForward || moveBackward || moveLeft || moveRight) {
    headBobTimer += delta * (isSprinting ? 14 : 9);
    camera.position.y = 1.6 + Math.sin(headBobTimer) * 0.04;
    if (Math.sin(headBobTimer) < -0.9) playSound('step');
  }

  // Легкий пленочный дрифт камеры по оси Z
  camera.rotation.z += (Math.random() - 0.5) * 0.0003;

  drawMinimap();
  prevTime = time;
  renderer.render(scene, camera);
}

// Запуск текстовой части при старте
renderChapter(1);
