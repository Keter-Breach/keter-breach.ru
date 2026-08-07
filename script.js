// === 1. АУДИОСИСТЕМА (Звуковые эффекты) ===
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

// === 3. ПРОЦЕДУРНЫЕ ТЕКСТУРЫ И ВЫПУКЛОСТИ (BUMP MAPS) ===
function generateWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#222'; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, 512, 512);

  // Желто-черная опасная разметка
  ctx.fillStyle = '#b38f00'; ctx.fillRect(0, 440, 512, 72);
  ctx.fillStyle = '#111';
  for (let i = -100; i < 600; i += 50) {
    ctx.beginPath(); ctx.moveTo(i, 512); ctx.lineTo(i + 25, 512);
    ctx.lineTo(i + 50, 440); ctx.lineTo(i + 25, 440); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

function generateFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#080808'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 256, 256);

  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(Math.random()*256, Math.random()*256, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 16);
  return tex;
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
  scene.fog = new THREE.FogExp2(0x050508, 0.04);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, -8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  flashlight = new THREE.SpotLight(0xddeeff, 4.0, 25, Math.PI / 4, 0.4, 1);
  flashlight.position.set(0.2, -0.2, 0);
  camera.add(flashlight);
  flashlight.target = camera;
  scene.add(camera);

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
  flashlight.intensity = flashlightOn ? 4.0 : 0;
  playSound('click');
}

// === 5. ПОСТРОЕНИЕ 10 ЗОН ===
function build10ZonesMap() {
  walls = []; interactiveItems = [];
  const wallMat = new THREE.MeshStandardMaterial({ map: generateWallTexture(), roughness: 0.6 });
  const floorMat = new THREE.MeshStandardMaterial({ map: generateFloorTexture(), roughness: 0.4 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 30);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 3.2, 30);
  scene.add(ceiling);

  scene.add(new THREE.AmbientLight(0x111122, 0.6));

  function addW(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z); scene.add(m); walls.push(m);
  }

  // Зона 1: Спавн D-12
  addW(8, 3.2, 0.5, 0, 1.6, -10); addW(0.5, 3.2, 12, -4, 1.6, -4); addW(0.5, 3.2, 12, 4, 1.6, -4);
  // Зона 2: Главный Коридор
  addW(0.5, 3.2, 20, -4, 1.6, 12); addW(0.5, 3.2, 20, 4, 1.6, 12);
  // Зона 3: Офис (Слева)
  addW(12, 3.2, 0.5, -10, 1.6, 6); addW(12, 3.2, 0.5, -10, 1.6, 18); addW(0.5, 3.2, 12, -16, 1.6, 12);
  // Зона 4: Склад (Справа)
  addW(12, 3.2, 0.5, 10, 1.6, 6); addW(12, 3.2, 0.5, 10, 1.6, 18); addW(0.5, 3.2, 12, 16, 1.6, 12);
  // Зона 5: Шлюз L1
  addW(3, 3.2, 0.5, -2.5, 1.6, 22); addW(3, 3.2, 0.5, 2.5, 1.6, 22);
  // Зона 6: Серверная
  addW(0.5, 3.2, 20, -6, 1.6, 32); addW(0.5, 3.2, 20, 6, 1.6, 32);
  // Зона 7: Лаборатории
  addW(16, 3.2, 0.5, -8, 1.6, 42); addW(16, 3.2, 0.5, 8, 1.6, 42); addW(0.5, 3.2, 16, -16, 1.6, 50); addW(0.5, 3.2, 16, 16, 1.6, 50);
  // Зона 8: Шлюз L2
  addW(14, 3.2, 0.5, -9, 1.6, 58); addW(14, 3.2, 0.5, 9, 1.6, 58);
  // Зона 9: Пост Охраны
  addW(0.5, 3.2, 20, -4, 1.6, 68); addW(0.5, 3.2, 20, 4, 1.6, 68);
  // Зона 10: Выход
  addW(3.2, 3.2, 0.5, -2.4, 1.6, 78); addW(3.2, 3.2, 0.5, 2.4, 1.6, 78);

  // Двери
  doors.doorL1 = createDoor(0, 1.4, 22, 0xff9900);
  doors.doorL2 = createDoor(0, 1.4, 58, 0xff9900);
  doors.doorExit = createDoor(0, 1.4, 78, 0xff0000);

  // Предметы
  spawnItem(-12, 0.9, 12, 0x00ffff, 'keycardL1');
  spawnItem(12, 0.8, 12, 0x00ff00, 'battery');
  spawnItem(-4, 0.9, 34, 0xbf00ff, 'keycardL2');
}

function createDoor(x, y, z, colorHex) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.2), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 }));
  m.position.set(x, y, z); scene.add(m); walls.push(m);
  return m;
}

function spawnItem(x, y, z, colorHex, type) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: colorHex }));
  m.position.set(x, y, z); m.userData = { type: type };
  scene.add(m); interactiveItems.push(m);
}

// === 6. ИНВЕНТАРЬ И ВЗАИМОДЕЙСТВИЕ ===
function updateInventoryHUD() {
  const items = [];
  if (window.playerState.keycardL1) items.push("<span style='color:#00ffff;'>[Карта L-1]</span>");
  if (window.playerState.keycardL2) items.push("<span style='color:#bf00ff;'>[Карта L-2]</span>");
  document.getElementById("inv-items").innerHTML = items.length ? items.join(" ") : "Пусто";
}

function interact3D() {
  const p = camera.position;

  for (let i = interactiveItems.length - 1; i >= 0; i--) {
    const item = interactiveItems[i];
    if (p.distanceTo(item.position) < 2.2) {
      playSound('pickup');
      if (item.userData.type === 'keycardL1') {
        window.playerState.keycardL1 = true;
        doors.doorL1.material.color.setHex(0x00ff66);
      } else if (item.userData.type === 'keycardL2') {
        window.playerState.keycardL2 = true;
        doors.doorL2.material.color.setHex(0x00ff66);
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
    else alert("Нужна Ключ-карта L-1 из Офиса!");
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

// === 7. ОТРИСОВКА МИНИ-КАРТЫ (РАДАР) ===
function drawMinimap() {
  const canvas = document.getElementById("minimap-canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 120, 120);

  // Масштабирование координат под холст
  const scale = 1.2;
  const cx = 60, cy = 20;

  ctx.fillStyle = '#00ff66';
  // Игрок
  const px = cx + camera.position.x * scale;
  const pz = cy + camera.position.z * scale;
  ctx.beginPath();
  ctx.arc(px, pz, 3, 0, Math.PI * 2);
  ctx.fill();

  // Двери на радаре
  ctx.fillStyle = '#ffaa00';
  Object.values(doors).forEach(d => {
    if (d.position.y < 2.0) { // если не открыта
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
    battery -= delta * (isSprinting ? 0.4 : 0.15);
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
