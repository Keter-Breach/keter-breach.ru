// === 0. ТЕКСТУРЫ ===
const textureLoader = new THREE.TextureLoader();

function loadCustomMaterial(url, repeatX = 1, repeatY = 1, roughness = 0.8) {
  const mat = new THREE.MeshStandardMaterial({ roughness });
  if (url) {
    mat.map = textureLoader.load(
      url,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.encoding = THREE.sRGBEncoding;
        mat.needsUpdate = true;
      },
      undefined,
      () => console.warn('Не удалось загрузить текстуру:', url)
    );
  }
  return mat;
}

// === 1. АУДИО (контекст создаётся лениво, после первого клика) ===
let audioCtx = null;

const SOUNDS = {
  click:  { type: 'sine',     f0: 600, f1: 0,   dur: 0.04, vol: 0.04 },
  step:   { type: 'triangle', f0: 60,  f1: 0,   dur: 0.08, vol: 0.03, rand: 15 },
  pickup: { type: 'sine',     f0: 250, f1: 700, dur: 0.12, vol: 0.06 },
  door:   { type: 'sawtooth', f0: 120, f1: 30,  dur: 0.4,  vol: 0.06 },
  deny:   { type: 'square',   f0: 150, f1: 90,  dur: 0.15, vol: 0.04 }
};

function playSound(name) {
  const s = SOUNDS[name];
  if (!s) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter(); // глухой VHS-звук
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  osc.type = s.type;
  osc.frequency.setValueAtTime(s.f0 + Math.random() * (s.rand || 0), t);
  if (s.f1) osc.frequency.exponentialRampToValueAtTime(s.f1, t + s.dur);
  gain.gain.setValueAtTime(s.vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + s.dur);

  osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + s.dur);
}

// === 2. СЮЖЕТ И СОСТОЯНИЕ ===
const freshState = () => ({ keycardL1: false, keycardL2: false });
window.playerState = freshState();
let loopCount = 1;

const storyData = {
  1: {
    title: "ГЛАВА 1: НАРУШЕНИЕ СОДЕРЖАНИЯ",
    location: "Сектор D-12",
    desc: "Аварийные сирены ревут. Комплекс погрузился во тьму. Найдите пропускные карты и выберитесь на поверхность, пока не поздно.",
    choices: [{ text: "Войти в комплекс (3D)", nextChapter: 2 }]
  },
  2: { title: "3D КОМПЛЕКС", is3D: true },
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
    window.playerState = freshState();
    chapNum = 1;
  }
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

// === 3. 3D ДВИЖОК ===
let scene, camera, renderer, flashlight, world, hintEl, toastEl;
let initialized = false;
let flashlightOn = true, battery = 100;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
let headBobTimer = 0, stepReady = true, toastTimer = null;

let walls = [];            // { mesh, box } — боксы считаются один раз
let interactiveItems = [];
let doors = {};
let openingDoors = [];     // двери в процессе анимации
let wallMaterial, floorMaterial, doorMaterial, tableMaterial, serverMaterial;

const isLocked = () => document.pointerLockElement === document.body;

function showToast(text, ms = 2500) {
  toastEl.textContent = text;
  toastEl.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.style.opacity = 0), ms);
}

function init3DMode() {
  document.getElementById("text-game").classList.add("hidden");
  const container = document.getElementById("three-container");
  container.classList.remove("hidden");

  // Однократная инициализация: рендерер, слушатели, фонарик — не дублируются при рестарте
  if (!initialized) {
    container.style.filter = "contrast(1.3) brightness(0.85) sepia(0.2) saturate(0.8)";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020305);
    scene.fog = new THREE.FogExp2(0x020305, 0.035);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ'; // yaw отдельно от pitch: взгляд вверх не замедляет ходьбу

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    wallMaterial = loadCustomMaterial('textures/damaged_concrete.jpg', 4, 2, 0.8);
    floorMaterial = loadCustomMaterial('textures/MetalPlates006.png', 12, 16, 0.4);
    doorMaterial = loadCustomMaterial('textures/Paint002.png', 1, 1, 0.5);
    tableMaterial = loadCustomMaterial('textures/dark_wood_diff_1k.jpg', 1, 1, 0.7);
    serverMaterial = loadCustomMaterial('textures/Metal041B.png', 1, 1, 0.3);

    flashlight = new THREE.SpotLight(0xddeeff, 5.0, 35, Math.PI / 3, 0.4, 1.5);
    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -1); // камера смотрит в -Z
    camera.add(flashlight, flashlight.target);
    scene.add(camera);
    scene.add(new THREE.AmbientLight(0x111622, 0.4));

    // Подсказки поверх игры (вместо alert, который ломал pointer lock)
    const base = "position:absolute;left:50%;transform:translateX(-50%);padding:10px 18px;" +
      "background:rgba(5,5,8,.9);border:1px solid #00ff66;color:#00ff66;font-size:14px;pointer-events:none;";
    toastEl = document.createElement('div');
    toastEl.style.cssText = base + "bottom:90px;opacity:0;transition:opacity .3s;";
    hintEl = document.createElement('div');
    hintEl.style.cssText = base + "top:50%;margin-top:40px;";
    hintEl.textContent = "Кликните, чтобы управлять";
    container.append(toastEl, hintEl);

    container.addEventListener('click', () => document.body.requestPointerLock());
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', (e) => onKey(e.code, true));
    document.addEventListener('keyup', (e) => onKey(e.code, false));
    window.addEventListener('blur', () => { moveForward = moveBackward = moveLeft = moveRight = isSprinting = false; });
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    initialized = true;
  }

  // Сброс мира и игрока при каждом входе
  if (world) scene.remove(world);
  world = new THREE.Group();
  scene.add(world);
  build10ZonesMap();

  battery = 100; flashlightOn = true; flashlight.intensity = 5.0;
  velocity.set(0, 0, 0); openingDoors = [];
  camera.position.set(0, 1.6, -8);
  camera.rotation.set(0, Math.PI, 0); // лицом к +Z, вглубь комплекса
  document.getElementById("battery-level").textContent = "100%";
  prevTime = performance.now();
  updateInventoryHUD();
  animate3D();
}

function onMouseMove(e) {
  if (!isLocked()) return;
  camera.rotation.y -= e.movementX * 0.002;
  camera.rotation.x -= e.movementY * 0.002;
  camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, camera.rotation.x));
}

function onKey(code, state) {
  switch (code) {
    case 'KeyW': moveForward = state; break;
    case 'KeyS': moveBackward = state; break;
    case 'KeyA': moveLeft = state; break;
    case 'KeyD': moveRight = state; break;
    case 'ShiftLeft': case 'ShiftRight': isSprinting = state; break;
    case 'KeyF': if (state) toggleFlashlight(); break;
    case 'KeyE': if (state) interact3D(); break;
  }
}

function toggleFlashlight() {
  if (battery <= 0) { playSound('deny'); showToast("Батарея разряжена"); return; }
  flashlightOn = !flashlightOn;
  flashlight.intensity = flashlightOn ? 5.0 : 0;
  playSound('click');
}

// === 4. КАРТА ===
function build10ZonesMap() {
  walls = []; interactiveItems = []; doors = {};
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.9 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 30);
  world.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 3.2, 30);
  world.add(ceiling);

  function addSolid(mesh) {
    world.add(mesh);
    walls.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
  }

  function addW(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
    m.position.set(x, y, z); addSolid(m);
  }

  function addPointLight(x, z, color = 0xffa040) {
    const light = new THREE.PointLight(color, 1.8, 15);
    light.position.set(x, 2.8, z);
    world.add(light);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.3), new THREE.MeshBasicMaterial({ color: 0xffeeaa }));
    lamp.position.set(x, 3.1, z);
    world.add(lamp);
  }

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
  addPointLight(0, 12, 0xff3322);
  addPointLight(-10, 12, 0x40a0ff);
  addPointLight(0, 32);
  addPointLight(0, 50, 0xff3322);
  addPointLight(0, 68);

  const makeDoor = (x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.2), doorMaterial);
    m.position.set(x, y, z); addSolid(m);
    return m;
  };
  doors.doorL1 = makeDoor(0, 1.4, 22);
  doors.doorL2 = makeDoor(0, 1.4, 58);
  doors.doorExit = makeDoor(0, 1.4, 78);

  // Стол
  const mkTable = (x, z) => {
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.2), tableMaterial);
    top.position.set(x, 0.75, z); addSolid(top);
    [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), tableMaterial);
      leg.position.set(x + dx, 0.375, z + dz); world.add(leg);
    });
  };
  mkTable(-10, 12);

  // Серверные стойки
  const mkRack = (x, z) => {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.8), serverMaterial);
    rack.position.set(x, 1.2, z); addSolid(rack);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0x00ff66 }));
    led.position.set(x + 0.61, 1.8, z); world.add(led);
  };
  mkRack(-4, 32); mkRack(-4, 35);

  spawnKeycard(-10, 0.82, 12, '1', '#00aaff', 'keycardL1');
  spawnKeycard(-4, 0.82, 35, '2', '#aa00ff', 'keycardL2');
  spawnBattery(12, 0.3, 12);
}

function spawnKeycard(x, y, z, level, colorHex, type) {
  const mat = new THREE.MeshBasicMaterial({ map: generateKeycardTexture(level, colorHex) });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.22), mat);
  m.position.set(x, y, z); m.userData = { type };
  world.add(m); interactiveItems.push(m);
}

function spawnBattery(x, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x00ff66, roughness: 0.3 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12), mat);
  m.position.set(x, y, z); m.userData = { type: 'battery' };
  world.add(m); interactiveItems.push(m);
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
      const t = item.userData.type;
      if (t === 'keycardL1') { window.playerState.keycardL1 = true; showToast("Получена карта L-1"); }
      else if (t === 'keycardL2') { window.playerState.keycardL2 = true; showToast("Получена карта L-2"); }
      else if (t === 'battery') { battery = Math.min(100, battery + 50); showToast("Батарея фонаря +50%"); }
      world.remove(item); interactiveItems.splice(i, 1);
      updateInventoryHUD();
      return;
    }
  }

  const tryDoor = (door, key, msg, onOpen) => {
    if (p.distanceTo(door.position) >= 2.5) return false;
    if (window.playerState[key]) (onOpen || openDoor)(door);
    else { playSound('deny'); showToast(msg); }
    return true;
  };

  tryDoor(doors.doorL1, 'keycardL1', "Нужна ключ-карта L-1 (стол в офисе)") ||
  tryDoor(doors.doorL2, 'keycardL2', "Нужна ключ-карта L-2 (серверная)") ||
  tryDoor(doors.doorExit, 'keycardL2', "Выход заблокирован: нужна карта L-2", () => {
    document.exitPointerLock();
    document.getElementById("three-container").classList.add("hidden");
    document.getElementById("text-game").classList.remove("hidden");
    renderChapter(3);
  });
}

function openDoor(mesh) {
  playSound('door');
  walls = walls.filter(w => w.mesh !== mesh); // проход свободен сразу
  openingDoors.push({ mesh, targetY: mesh.position.y + 3.0 });
}

// === 6. МИНИ-КАРТА ===
function drawMinimap() {
  const canvas = document.getElementById("minimap-canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 120, 120);
  const scale = 1.2, cx = 60, cy = 14;

  ctx.fillStyle = 'rgba(0,255,102,0.25)';
  walls.forEach(({ box }) => {
    if (box.max.y - box.min.y < 3) return; // только стены, без мебели
    ctx.fillRect(cx + box.min.x * scale, cy + box.min.z * scale,
      (box.max.x - box.min.x) * scale, (box.max.z - box.min.z) * scale);
  });

  ctx.fillStyle = '#ffaa00';
  Object.values(doors).forEach(d => {
    if (d.position.y < 2.0) ctx.fillRect(cx + d.position.x * scale - 4, cy + d.position.z * scale, 8, 2);
  });

  const px = cx + camera.position.x * scale, pz = cy + camera.position.z * scale;
  const yaw = camera.rotation.y;
  ctx.strokeStyle = '#00ff66';
  ctx.beginPath(); ctx.moveTo(px, pz);
  ctx.lineTo(px - Math.sin(yaw) * 9, pz - Math.cos(yaw) * 9); ctx.stroke();
  ctx.fillStyle = '#00ff66';
  ctx.beginPath(); ctx.arc(px, pz, 3, 0, Math.PI * 2); ctx.fill();
}

// === 7. ИГРОВОЙ ЦИКЛ ===
const _pBox = new THREE.Box3();
function collides(x, z) {
  const r = 0.4;
  _pBox.min.set(x - r, 0, z - r);
  _pBox.max.set(x + r, 3.0, z + r);
  for (let i = 0; i < walls.length; i++) if (walls[i].box.intersectsBox(_pBox)) return true;
  return false;
}

function animate3D() {
  if (document.getElementById("three-container").classList.contains("hidden")) return;
  requestAnimationFrame(animate3D);

  const time = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.1); // защита от скачков после смены вкладки
  prevTime = time;

  const locked = isLocked();
  hintEl.style.display = locked ? 'none' : 'block';

  if (locked) {
    // Батарея
    if (flashlightOn && battery > 0) {
      battery -= delta * (isSprinting ? 0.3 : 0.08);
      document.getElementById("battery-level").textContent = `${Math.max(0, Math.round(battery))}%`;
      if (battery <= 0) { flashlightOn = false; flashlight.intensity = 0; showToast("Фонарь погас"); }
      else if (battery < 15) flashlight.intensity = Math.random() < 0.08 ? 1.0 : 5.0; // мерцание
    }

    // Движение относительно направления взгляда (только по горизонтали)
    const speed = isSprinting ? 38.0 : 20.0;
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    const dirZ = Number(moveForward) - Number(moveBackward);
    const dirX = Number(moveRight) - Number(moveLeft);
    const sin = Math.sin(camera.rotation.y), cos = Math.cos(camera.rotation.y);
    velocity.x += (-sin * dirZ + cos * dirX) * speed * delta;
    velocity.z += (-cos * dirZ - sin * dirX) * speed * delta;

    const nx = camera.position.x + velocity.x * delta;
    const nz = camera.position.z + velocity.z * delta;
    if (!collides(nx, camera.position.z)) camera.position.x = nx; else velocity.x = 0;
    if (!collides(camera.position.x, nz)) camera.position.z = nz; else velocity.z = 0;

    // Покачивание головы и шаги (один звук на каждый шаг)
    if (dirZ || dirX) {
      headBobTimer += delta * (isSprinting ? 14 : 9);
      const s = Math.sin(headBobTimer);
      camera.position.y = 1.6 + s * 0.04;
      if (s < -0.9) { if (stepReady) { playSound('step'); stepReady = false; } }
      else if (s > 0) stepReady = true;
    }
  }

  // Анимация открытия дверей
  for (let i = openingDoors.length - 1; i >= 0; i--) {
    const d = openingDoors[i];
    d.mesh.position.y += (d.targetY - d.mesh.position.y) * Math.min(1, delta * 4);
    if (Math.abs(d.targetY - d.mesh.position.y) < 0.02) { d.mesh.position.y = d.targetY; openingDoors.splice(i, 1); }
  }

  // Пленочный дрифт камеры (не накапливается)
  camera.rotation.z = Math.sin(time * 0.0007) * 0.004 + (Math.random() - 0.5) * 0.0008;

  drawMinimap();
  renderer.render(scene, camera);
}

// Старт
renderChapter(1);
