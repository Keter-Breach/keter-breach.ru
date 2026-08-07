// === 1. АУДИОСИСТЕМА ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const t = audioCtx.currentTime;

  if (type === 'click') {
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.start(); osc.stop(t + 0.05);
  } else if (type === 'step') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(70 + Math.random() * 20, t);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(); osc.stop(t + 0.08);
  } else if (type === 'pickup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.12);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(); osc.stop(t + 0.12);
  } else if (type === 'door') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(); osc.stop(t + 0.4);
  }
}

// === 2. СОСТОЯНИЕ ИГРОКА ===
window.playerState = { keycardL1: false, keycardL2: false };
let currentChapter = 1, loopCount = 1;

const storyData = {
  1: {
    title: "ГЛАВА 1: НАРУШЕНИЕ СОДЕРЖАНИЯ",
    location: "Сектор D-12",
    desc: "Аварийные сирены ревут. Вы находитесь внутри 10-зонального комплекса сдерживания. Найдите пропускные карты и выберитесь на поверхность.",
    choices: [{ text: "Войти в 3D-комплекс", nextChapter: 2 }]
  },
  2: { title: "3D КОМПЛЕКС", is3D: true, nextChapter: 3 },
  3: {
    title: "ПОБЕГ УСПЕШЕН",
    location: "Поверхность",
    desc: "Вы преодолели все 10 отсеков комплекса! Повстанцы Хаоса эвакуировали вас.",
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

// === 3. ПРОЦЕДУРНЫЕ ТЕКСТУРЫ ===

// Текстура стены
function generateWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2b3038'; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#1a1d22'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, 512, 512);

  // Желто-черная опасная разметка
  ctx.fillStyle = '#d4a017'; ctx.fillRect(0, 420, 512, 92);
  ctx.fillStyle = '#111';
  for (let i = -100; i < 600; i += 50) {
    ctx.beginPath(); ctx.moveTo(i, 512); ctx.lineTo(i + 25, 512);
    ctx.lineTo(i + 50, 420); ctx.lineTo(i + 25, 420); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

// Текстура пола
function generateFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#22252a'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#111317'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 16);
  return tex;
}

// Текстура гермодвери SCP
function generateDoorTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3a3f47'; ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, 256, 512);
  
  // Металлические панели
  ctx.fillStyle = '#2d3138';
  ctx.fillRect(20, 30, 216, 200);
  ctx.fillRect(20, 260, 216, 220);

  // Окошко / Индикатор
  ctx.fillStyle = '#00ff66';
  ctx.fillRect(98, 50, 60, 20);

  // Текст на двери
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 140);

  return new THREE.CanvasTexture(canvas);
}

// Текстура карт доступа
function generateKeycardTexture(levelStr, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = colorHex; ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = '#111'; ctx.fillRect(0, 20, 256, 30); // Магнитная полоса
  
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Courier New';
  ctx.fillText("SCP SECURITY", 20, 85);
  ctx.font = 'bold 18px Courier New';
  ctx.fillText(`LEVEL ${levelStr}`, 20, 125);

  return new THREE.CanvasTexture(canvas);
}

// === 4. 3D ДВИЖОК ===
let scene, camera, renderer, flashlight;
let flashlightOn = true, battery = 100;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
let headBobTimer = 0;

let walls = [];
let interactiveItems = [];
let doors = {};

function init3DMode() {
  document.getElementById("text-game").classList.add("hidden");
  const container = document.getElementById("three-container");
  container.classList.remove("hidden");

  scene = new THREE.Scene();
  // 🔥 Исправлен туман: сделан намного дальше и светлее, чтобы всё было видно
  scene.fog = new THREE.FogExp2(0x0f1218, 0.015);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, -8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // 🔥 Мощный яркий фонарь
  flashlight = new THREE.SpotLight(0xffffff, 8.0, 40, Math.PI / 3.5, 0.5, 1);
  flashlight.position.set(0.2, -0.2, 0);
  camera.add(flashlight);
  flashlight.target = camera;
  scene.add(camera);

  // 🔥 Усиленное фоновое освещение всей станции
  const ambientLight = new THREE.AmbientLight(0x556677, 1.2);
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
  flashlight.intensity = flashlightOn ? 8.0 : 0;
  playSound('click');
}

// === 5. ПОСТРОЕНИЕ 10 ЗОН И МЕБЕЛИ ===
function build10ZonesMap() {
  walls = []; interactiveItems = [];
  const wallMat = new THREE.MeshStandardMaterial({ map: generateWallTexture(), roughness: 0.5 });
  const floorMat = new THREE.MeshStandardMaterial({ map: generateFloorTexture(), roughness: 0.3 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x181a20 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 30);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 3.2, 30);
  scene.add(ceiling);

  function addW(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z); scene.add(m); walls.push(m);
  }

  // Лампы под потолком для дополнительного света
  function addPointLight(x, z, color = 0xffe0a0) {
    const light = new THREE.PointLight(color, 2.5, 18);
    light.position.set(x, 2.8, z);
    scene.add(light);
    
    const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lampMesh.position.set(x, 3.1, z);
    scene.add(lampMesh);
  }

  // 10 Зон
  addW(8, 3.2, 0.5, 0, 1.6, -10); addW(0.5, 3.2, 12, -4, 1.6, -4); addW(0.5, 3.2, 12, 4, 1.6, -4); // Зона 1
  addW(0.5, 3.2, 20, -4, 1.6, 12); addW(0.5, 3.2, 20, 4, 1.6, 12); // Зона 2
  addW(12, 3.2, 0.5, -10, 1.6, 6); addW(12, 3.2, 0.5, -10, 1.6, 18); addW(0.5, 3.2, 12, -16, 1.6, 12); // Зона 3 (Офис)
  addW(12, 3.2, 0.5, 10, 1.6, 6); addW(12, 3.2, 0.5, 10, 1.6, 18); addW(0.5, 3.2, 16, 16, 1.6, 12); // Зона 4 (Склад)
  addW(3, 3.2, 0.5, -2.5, 1.6, 22); addW(3, 3.2, 0.5, 2.5, 1.6, 22); // Зона 5
  addW(0.5, 3.2, 20, -6, 1.6, 32); addW(0.5, 3.2, 20, 6, 1.6, 32); // Зона 6
  addW(16, 3.2, 0.5, -8, 1.6, 42); addW(16, 3.2, 0.5, 8, 1.6, 42); addW(0.5, 3.2, 16, -16, 1.6, 50); addW(0.5, 3.2, 16, 16, 1.6, 50); // Зона 7
  addW(14, 3.2, 0.5, -9, 1.6, 58); addW(14, 3.2, 0.5, 9, 1.6, 58); // Зона 8
  addW(0.5, 3.2, 20, -4, 1.6, 68); addW(0.5, 3.2, 20, 4, 1.6, 68); // Зона 9
  addW(3.2, 3.2, 0.5, -2.4, 1.6, 78); addW(3.2, 3.2, 0.5, 2.4, 1.6, 78); // Зона 10

  // Расстановка потолочных источников света
  addPointLight(0, -4);
  addPointLight(0, 12);
  addPointLight(-10, 12, 0x90e0ff); // Синеватый свет в офисе
  addPointLight(0, 32);
  addPointLight(0, 50);
  addPointLight(0, 68);

  // Двери с текстурой
  doors.doorL1 = createDoor(0, 1.4, 22, "ZONE-05");
  doors.doorL2 = createDoor(0, 1.4, 58, "ZONE-08");
  doors.doorExit = createDoor(0, 1.4, 78, "EXIT");

  // Мебель: Офисный стол
  createTable(-10, 0, 12);
  // Мебель: Серверные стойки
  createServerRack(-4, 0, 32);
  createServerRack(-4, 0, 35);

  // Предметы (Карты и Батарейки)
  spawnKeycard(-10, 0.82, 12, '1', '#00aaff', 'keycardL1');
  spawnKeycard(-4, 0.82, 35, '2', '#aa00ff', 'keycardL2');
  spawnBattery(12, 0.3, 12);
}

function createDoor(x, y, z, label) {
  const doorMat = new THREE.MeshStandardMaterial({ map: generateDoorTexture(label), roughness: 0.4 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.2), doorMat);
  m.position.set(x, y, z); scene.add(m); walls.push(m);
  return m;
}

function createTable(x, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x333a42, roughness: 0.6 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.2), mat);
  top.position.set(x, y + 0.75, z); scene.add(top); walls.push(top);
  
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), mat);
  leg1.position.set(x - 1.1, y + 0.375, z - 0.5); scene.add(leg1);
  const leg2 = leg1.clone(); leg2.position.set(x + 1.1, y + 0.375, z - 0.5); scene.add(leg2);
  const leg3 = leg1.clone(); leg3.position.set(x - 1.1, y + 0.375, z + 0.5); scene.add(leg3);
  const leg4 = leg1.clone(); leg4.position.set(x + 1.1, y + 0.375, z + 0.5); scene.add(leg4);
}

function createServerRack(x, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.3 });
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.8), mat);
  rack.position.set(x, y + 1.2, z); scene.add(rack); walls.push(rack);

  // Светодиоды на сервере
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

// === 6. ИНВЕНТАРЬ И ВЗАИМОДЕЙСТВИЕ ===
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

// === 7. МИНИ-КАРТА ===
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

// === 8. ИГРОВОЙ ЦИКЛ ===
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
    battery -= delta * (isSprinting ? 0.3 : 0.1);
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

  drawMinimap();
  prevTime = time;
  renderer.render(scene, camera);
}

renderChapter(1);
