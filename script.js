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

// === 4. КАРТА: ОБЪЕКТ SCP, СЕКТОР D-12 ===
// Шлюз D-12 -> Главный холл (Администрация / Медпункт) -> [L-1] Узел данных -> Зал содержания -> [L-2] Эвакуация -> [выход]
let hazardTex = null;

function addSign(lines, x, y, z, rotY = Math.PI, color = '#ffd34d', scale = 1, parent = world) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#14161a'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = color; g.lineWidth = 5; g.strokeRect(5, 5, 502, 150);
  g.fillStyle = color; g.textAlign = 'center';
  g.font = 'bold 40px Courier New'; g.fillText(lines[0], 256, lines[1] ? 72 : 95);
  if (lines[1]) { g.font = '26px Courier New'; g.fillText(lines[1], 256, 122); }
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * scale, 0.5 * scale),
    new THREE.MeshBasicMaterial({ map: tex, color: 0xbbbbbb }));
  m.position.set(x, y, z); m.rotation.y = rotY;
  parent.add(m);
  return m;
}

function hazardStripe(x, z) {
  if (!hazardTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#d9a400'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#111';
    for (let i = -128; i < 128; i += 32) {
      g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 16, 128); g.lineTo(i + 144, 0); g.lineTo(i + 128, 0); g.fill();
    }
    hazardTex = new THREE.CanvasTexture(c);
    hazardTex.wrapS = hazardTex.wrapT = THREE.RepeatWrapping;
    hazardTex.repeat.set(3, 1);
    hazardTex.encoding = THREE.sRGBEncoding;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: hazardTex, color: 0x777777 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z);
  world.add(m);
}

function build10ZonesMap() {
  walls = []; interactiveItems = []; doors = {};

  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.9 });
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.6 });
  const bedMat = new THREE.MeshStandardMaterial({ color: 0xb8c0c0, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.15, roughness: 0.1 });
  const redMat = () => new THREE.MeshBasicMaterial({ color: 0xff2222 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 30); world.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 3.2, 30); world.add(ceiling);

  const box = (mat, w, h, d, x, y, z, solid) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    world.add(m);
    if (solid) walls.push({ mesh: m, box: new THREE.Box3().setFromObject(m) });
    return m;
  };

  // Стена вдоль оси с проёмами. axis 'z': идёт вдоль X на z=c; axis 'x': идёт вдоль Z на x=c.
  function wallLine(axis, c, a1, a2, gaps = []) {
    const seg = (a, b) => axis === 'z'
      ? box(wallMaterial, b - a, 3.2, 0.5, (a + b) / 2, 1.6, c, true)
      : box(wallMaterial, 0.5, 3.2, b - a, c, 1.6, (a + b) / 2, true);
    let cur = a1;
    gaps.forEach(([g1, g2]) => {
      if (g1 > cur) seg(cur, g1);
      cur = g2;
      const mid = (g1 + g2) / 2, len = g2 - g1; // перемычка над проёмом (не твёрдая)
      axis === 'z' ? box(wallMaterial, len, 0.8, 0.5, mid, 2.8, c) : box(wallMaterial, 0.5, 0.8, len, c, 2.8, mid);
    });
    if (a2 > cur) seg(cur, a2);
  }

  function addPointLight(x, z, color = 0xffa040, y = 2.8) {
    const light = new THREE.PointLight(color, 1.8, 15);
    light.position.set(x, y, z); world.add(light);
    box(new THREE.MeshBasicMaterial({ color: 0xffeeaa }), 0.8, 0.1, 0.3, x, 3.1, z);
  }

  const mkTable = (x, z) => {
    box(tableMaterial, 2.4, 0.1, 1.2, x, 0.75, z, true);
    [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].forEach(([dx, dz]) =>
      box(tableMaterial, 0.1, 0.75, 0.1, x + dx, 0.375, z + dz));
  };

  const addStatue = (x, z, faceX) => { // «статуя» в духе SCP-173
    const g = new THREE.Group();
    const part = (w, h, d, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
      m.position.set(px, py, pz); g.add(m);
    };
    part(0.5, 1.0, 0.3, 0, 1.1, 0); part(0.3, 0.3, 0.3, 0, 1.8, 0);
    part(0.12, 0.9, 0.12, -0.35, 1.0, 0); part(0.12, 0.9, 0.12, 0.35, 1.0, 0);
    part(0.14, 0.7, 0.14, -0.15, 0.35, 0); part(0.14, 0.7, 0.14, 0.15, 0.35, 0);
    g.position.set(x, 0, z); g.rotation.y = faceX > 0 ? Math.PI / 2 : -Math.PI / 2;
    world.add(g);
  };

  // --- Стены и проёмы ---
  wallLine('z', -10, -4, 4);                         // Шлюз D-12
  wallLine('x', -4, -10, 2); wallLine('x', 4, -10, 2);
  wallLine('z', 2, -5, 5, [[-1.5, 1.5]]);            // шлюз -> холл
  wallLine('x', -5, 2, 24, [[8, 12]]);               // холл (проём в Администрацию)
  wallLine('x', 5, 2, 24, [[8, 12]]);                // холл (проём в Медпункт)
  wallLine('z', 24, -5, 5, [[-1, 1]]);               // дверь L-1
  wallLine('z', 4, -15, -5); wallLine('z', 16, -15, -5); wallLine('x', -15, 4, 16); // Администрация
  wallLine('z', 4, 5, 15); wallLine('z', 16, 5, 15); wallLine('x', 15, 4, 16);      // Медпункт
  wallLine('x', -5, 24, 44); wallLine('x', 5, 24, 44);                              // Узел данных
  wallLine('z', 44, -16, 16, [[-1.5, 1.5]]);         // узел -> зал содержания
  wallLine('x', -16, 44, 60); wallLine('x', 16, 44, 60);
  wallLine('z', 60, -16, 16, [[-1, 1]]);             // дверь L-2
  wallLine('x', -4, 60, 80); wallLine('x', 4, 60, 80);
  wallLine('z', 80, -4, 4, [[-1, 1]]);               // выходная дверь

  // --- Освещение: у каждой зоны свой цвет ---
  addPointLight(0, -4);                    // шлюз, жёлтый
  addPointLight(0, 13, 0xff3322);          // холл, аварийный красный
  addPointLight(-10, 10, 0x40a0ff);        // администрация
  addPointLight(10, 10, 0xaaffcc);         // медпункт
  addPointLight(0, 34, 0x40ffee);          // узел данных
  addPointLight(0, 52, 0xff3322);          // зал содержания
  addPointLight(0, 70);                    // эвакуация

  // --- Двери с табличками и индикаторами ---
  const makeDoor = (z, lines) => {
    const m = box(doorMaterial, 2.0, 2.8, 0.2, 0, 1.4, z, true);
    addSign(lines, 0, 0.5, -0.12, Math.PI, '#ff5555', 0.9, m);
    m.userData.lamp = box(redMat(), 0.3, 0.1, 0.1, 0, 3.05, z - 0.25);
    hazardStripe(0, z - 1.2);
    return m;
  };
  doors.doorL1 = makeDoor(24, ['ДОПУСК L-1', 'УЗЕЛ ДАННЫХ']);
  doors.doorL2 = makeDoor(60, ['ДОПУСК L-2', 'ЭВАКУАЦИЯ']);
  doors.doorExit = makeDoor(80, ['ВЫХОД', 'НА ПОВЕРХНОСТЬ']);

  // --- Таблички зон ---
  addSign(['ФОНД SCP', 'ШЛЮЗ D-12'], 0, 2.75, 1.72);
  addSign(['АДМИНИСТРАЦИЯ', 'СЕКТОРА D-12'], -4.72, 2.75, 10, Math.PI / 2);
  addSign(['МЕДПУНКТ', 'ТОЛЬКО ПЕРСОНАЛ'], 4.72, 2.75, 10, -Math.PI / 2, '#66ffaa');
  addSign(['ЗАЛ СОДЕРЖАНИЯ', 'ПРОТОКОЛ: KETER'], 0, 2.75, 43.72, Math.PI, '#ff5555');

  // --- Главный холл: трубы, ящики ---
  [-4.5, 4.5].forEach(x => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 20, 8), cabMat);
    p.rotation.x = Math.PI / 2; p.position.set(x, 3.0, 13); world.add(p);
  });
  box(cabMat, 1, 1, 1, -3.9, 0.5, 19, true);
  box(cabMat, 1, 1, 1, 3.8, 0.5, 17.5, true);

  // --- Администрация: стол с терминалом, шкафы ---
  mkTable(-10, 12);
  addSign(['ЛОКДАУН', 'ДВЕРИ ЗАБЛОКИРОВАНЫ'], -10, 1.1, 12.45, Math.PI, '#00ff66', 0.35);
  for (let i = 0; i < 6; i++) box(cabMat, 0.5, 1.8, 0.9, -14.4, 0.9, 5.5 + i * 1.5, true);
  spawnKeycard(-10, 0.82, 12, '1', '#00aaff', 'keycardL1');

  // --- Медпункт: койки, ящики, батарея ---
  [6.5, 9.5, 13].forEach(z => box(bedMat, 0.9, 0.5, 2, 13.8, 0.35, z, true));
  box(tableMaterial, 1, 1, 1, 7, 0.5, 14.5, true);
  spawnBattery(7, 1.15, 14.5);

  // --- Узел данных: стойки по обе стороны, стол с картой L-2 ---
  [-1, 1].forEach(s => [28, 31, 34, 37].forEach(z => {
    box(serverMaterial, 1.2, 2.4, 0.8, s * 4.1, 1.2, z, true);
    const led = [0x00ff66, 0xff2222, 0xffaa00][Math.floor(Math.random() * 3)];
    box(new THREE.MeshBasicMaterial({ color: led }), 0.05, 0.05, 0.05, s * 3.48, 1.8, z);
  }));
  mkTable(2, 40);
  spawnKeycard(2, 0.82, 40, '2', '#aa00ff', 'keycardL2');

  // --- Зал содержания: камеры по обеим сторонам ---
  const zs = [44, 49, 54, 60];
  [-1, 1].forEach(s => {
    const types = s < 0 ? ['statue', 'breach', 'keter'] : ['empty', 'keter', 'statue'];
    [49, 54].forEach(z => box(wallMaterial, 5, 3.2, 0.3, s * 13.5, 1.6, z, true));
    types.forEach((type, i) => {
      const z1 = zs[i], z2 = zs[i + 1], mid = (z1 + z2) / 2;
      if (type !== 'breach') box(glassMat, 0.1, 2.8, z2 - z1, s * 11, 1.4, mid, true);
      const label = {
        statue: ['SCP-173', 'EUCLID'], breach: ['КАМЕРА ПУСТА', 'НАРУШЕНИЕ'],
        keter: ['SCP-████', 'KETER'], empty: ['КАМЕРА СВОБОДНА', 'СТАТУС: РЕЗЕРВ']
      }[type];
      const col = type === 'keter' ? '#ff4444' : type === 'breach' ? '#ffaa33' : '#ffd34d';
      addSign(label, s * 10.85, 2.4, mid, -s * Math.PI / 2, col);
      if (type === 'statue') addStatue(s * 13.5, mid, -s);
      if (type === 'breach') for (let k = 0; k < 4; k++)
        box(glassMat, 0.3, 0.02, 0.3, s * (10 + Math.random() * 1.2), 0.02, z1 + 1 + k * 1.1);
      if (type === 'keter') {
        box(darkMat, 1.2, 2.2, 1.2, s * 14.2, 1.1, mid);
        box(redMat(), 0.06, 0.06, 0.06, s * 13.58, 1.7, mid - 0.2);
        box(redMat(), 0.06, 0.06, 0.06, s * 13.58, 1.7, mid + 0.2);
        if (s < 0) { const l = new THREE.PointLight(0xff2200, 2, 9); l.position.set(s * 13, 2.2, mid); world.add(l); }
      }
    });
  });
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

  tryDoor(doors.doorL1, 'keycardL1', "Нужна ключ-карта L-1 (кабинет администрации)") ||
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
  if (mesh.userData.lamp) mesh.userData.lamp.material.color.set(0x00ff66); // индикатор: зелёный
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
