// === 1. АУДИОДВИЖОК (Web Audio API) ===
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
    osc.frequency.setValueAtTime(80 + Math.random() * 30, t);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(); osc.stop(t + 0.1);
  } else if (type === 'hum') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, t);
    gain.gain.setValueAtTime(0.015, t);
    osc.start();
  } else if (type === 'glitch') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(100 + Math.random() * 500, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.start(); osc.stop(t + 0.2);
  }
}

// === 2. РАСШИРЕННЫЙ СЮЖЕТ ===
const storyData = {
  1: {
    title: "ГЛАВА 1: ПРОСЫПАНИЕ В ТЕМНОТЕ",
    location: "Сектор D-12 | Камера сдерживания",
    desc: "Глухой удар заставляет вас очнуться. Во рту металлический вкус, в ушах гудит вой аварийной сирены. Вы находитесь в изолированной боксе D-Class.\n\nНа полу лежит окровавленный планшет сотрудника Фонда. Экран треснут, но текст читаем:\n«Объект SCP-173 нарушил периметр. Всем сотрудникам класса D оставаться в боксах...»\n\nДверь выбита снаружи. В коридоре горит единственный аварийный терминал.",
    choices: [
      { text: "Осмотреть планшет и забрать ключ-карту (Уровень 1)", nextChapter: 2, action: () => { window.hasKeycard = true; } },
      { text: "Игнорировать всё и немедленно выйти в коридор", nextChapter: 2 }
    ]
  },
  2: {
    title: "ГЛАВА 2: ПРОБЕГ ПО СЕКТОРУ (3D)",
    is3D: true,
    desc: "Переход в 3D режим...",
    nextChapter: 3
  },
  3: {
    title: "ГЛАВА 3: РАЗВЕЛКА У ТЕРМИНАЛА",
    location: "ШЛЮЗ ЛЗС-04",
    desc: "Вы выскакиваете из закрывающегося коридора. Перед вами массивная гермодверь с кодовым замком. Рядом на стене мигает терминал безопасности.\n\nСзади из вентиляции доносятся тяжелые шаги и характерный бетонный скрежет...",
    choices: [
      { 
        text: "Использовать найденную карту доступа", 
        nextChapter: 4,
        condition: () => window.hasKeycard,
        failText: "У вас нет ключ-карты!"
      },
      { text: "Попытаться взломать терминал вручную", nextChapter: 4 },
      { text: "Спрятаться в шкафу для инвентаря", nextChapter: 5 }
    ]
  },
  4: {
    title: "ГЛАВА 4: ЛАБОРАТОРНЫЙ БЛОК Б-4",
    location: "Исследовательский сектор",
    desc: "Дверь со скрежетом открывается. Вы попадаете в залитый синим светом зал. На мониторах горит изображение SCP-079 (Старый ИИ).\n\nКолонки над вашей головой оживают:\n«Я знаю, кто ты, D-4126. Фонд зачистит этот сектор через 10 минут. Выпусти меня из локальной сети, и я открою тебе путь к Gate A».",
    choices: [
      { text: "Загрузить протокол ИИ на флеш-накопитель", nextChapter: 6, action: () => { window.aiAlly = true; } },
      { text: "Обесточить серверный блок (Отказать ИИ)", nextChapter: 6 }
    ]
  },
  5: {
    title: "ГЛАВА 5: ТЕНЬ В ТЕМНОТЕ",
    location: "Затопленный технический туннель",
    desc: "Вы забираетесь в узкий лаз. Мимо шкафа медленно проходит нечто высокое и истощенное, издавая тихий плач. Это SCP-096.\n\nВы затаили дыхание, пока существо не скрылось за поворотом. Путь дальше ведет в технические уровни.",
    choices: [
      { text: "Тихо проползти вслед за существом", nextChapter: 6 },
      { text: "Вернуться к гермодвери", nextChapter: 4 }
    ]
  },
  6: {
    title: "ГЛАВА 6: ТЯЖЕЛАЯ ЗОНА СДЕРЖИВАНИЯ",
    location: "ТЗС (High Containment)",
    desc: "Воздух стал ледяным. По стенам стекает черная слизь — след SCP-106. Впереди видна развилка к лифтам на поверхность.",
    choices: [
      { text: "Подняться на лифте в блок МОТФ", nextChapter: 7 },
      { text: "Спуститься в вентиляционные шахты", nextChapter: 7 }
    ]
  },
  7: {
    title: "ГЛАВА 7: ПОВЕРХНОСТЬ (GATE A)",
    location: "Поверхность Комплекса",
    desc: "Свежий ночной воздух ударяет в лицо. Вы на поверхности. Сверху гудят прожекторы вертолетов МОГ, а на горизонте видны джипы Повстанцев Хаоса.",
    choices: [
      { text: "Бежать к транспорту Повстанцев Хаоса", nextChapter: 'END' },
      { text: "Сдаться МОГ", nextChapter: 'RESET' }
    ]
  }
};

// === 3. УПРАВЛЕНИЕ UI И СОСТОЯНИЕМ ===
let currentChapter = 1;
let loopCount = 1;

const chapterTitleEl = document.getElementById("chapter-title");
const locEl = document.getElementById("current-location");
const descEl = document.getElementById("description");
const btnsContainer = document.getElementById("buttons-container");
const loopEl = document.getElementById("loop-count");
const screenEl = document.getElementById("screen");

function renderChapter(chapNum) {
  if (chapNum === 'RESET') {
    loopCount++;
    currentChapter = 1;
    window.hasKeycard = false;
    window.aiAlly = false;
    chapNum = 1;
  } else if (chapNum === 'END') {
    document.getElementById("text-game").innerHTML = `
      <div class="vhs-tag">● RECORDING COMPLETED</div>
      <h1>ФИНАЛ: ПОБЕГ ИЗ ЗОНЫ 19</h1>
      <p style="margin: 20px 0; line-height: 1.6;">Вы выжили в адском нарушении условий сдерживания и сбежали. Повстанцы Хаоса приняли вас в свои ряды.<br><br><b>Циклов задействовано:</b> ${loopCount}</p>
      <button onclick="location.reload()">Начать заново</button>
    `;
    return;
  }

  currentChapter = chapNum;
  const data = storyData[chapNum];

  if (data.is3D) {
    init3DMode();
    return;
  }

  chapterTitleEl.textContent = data.title;
  locEl.textContent = data.location || "SCP Facility";
  descEl.textContent = data.desc;
  loopEl.textContent = `#${loopCount}`;

  screenEl.classList.remove("wake-up");
  void screenEl.offsetWidth;
  screenEl.classList.add("wake-up");

  btnsContainer.innerHTML = "";
  data.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.textContent = choice.text;

    btn.onclick = () => {
      if (choice.condition && !choice.condition()) {
        alert(choice.failText || "Действие недоступно!");
        return;
      }
      if (choice.action) choice.action();
      playSound('click');
      renderChapter(choice.nextChapter);
    };
    btnsContainer.appendChild(btn);
  });
}

// === 4. ПРОЦЕДУРНЫЕ ТЕКСТУРЫ С ВЫСОКОЙ ДЕТАЛИЗАЦИЕЙ ===
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Базовая плитка
  ctx.fillStyle = '#181818';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#0d0d0d';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 512, 512);

  // Детали и грязь
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.15)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 16);
  return texture;
}

function createWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Бетонная стена
  ctx.fillStyle = '#262626';
  ctx.fillRect(0, 0, 512, 512);

  // Шум
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }

  // Желто-черная полоса безопасности внизу
  ctx.fillStyle = '#b38f00';
  ctx.fillRect(0, 450, 512, 62);
  ctx.fillStyle = '#111';
  for(let i = -100; i < 600; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 512);
    ctx.lineTo(i + 20, 512);
    ctx.lineTo(i + 40, 450);
    ctx.lineTo(i + 20, 450);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

const floorTexture = createFloorTexture();
const wallTexture = createWallTexture();

// === 5. Продвинутый 3D ДВИЖОК ===
let scene, camera, renderer, flashlight, redAlertLight;
let flashlightOn = true;
let battery = 100;

// Физика и Управление
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
let headBobTimer = 0;
let stepTimer = 0;

let walls = [];
let exitDoorMesh;

function checkWallCollision(newPosition) {
  const playerRadius = 0.4;

  for (let i = 0; i < walls.length; i++) {
    const wallBox = new THREE.Box3().setFromObject(walls[i]);
    const playerBox = new THREE.Box3(
      new THREE.Vector3(newPosition.x - playerRadius, 0, newPosition.z - playerRadius),
      new THREE.Vector3(newPosition.x + playerRadius, 3.0, newPosition.z + playerRadius)
    );

    if (wallBox.intersectsBox(playerBox)) {
      return true;
    }
  }
  return false;
}

function init3DMode() {
  document.getElementById("text-game").classList.add("hidden");
  const container = document.getElementById("three-container");
  container.classList.remove("hidden");

  playSound('hum');

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.05);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, -8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Динамический фонарик
  flashlight = new THREE.SpotLight(0xddeeff, 4.0, 22, Math.PI / 4.5, 0.4, 1);
  flashlight.position.set(0.2, -0.2, 0);
  camera.add(flashlight);
  flashlight.target = camera;
  scene.add(camera);

  buildAdvanced3DMap();

  container.addEventListener('click', () => document.body.requestPointerLock());

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= e.movementX * 0.002;
      camera.rotation.x -= e.movementY * 0.002;
      camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, camera.rotation.x));
    }
  });

  document.addEventListener('keydown', (e) => onKey(e.code, true));
  document.addEventListener('keyup', (e) => onKey(e.code, false));

  animate3D();
}

function onKey(code, state) {
  switch (code) {
    case 'KeyW': moveForward = state; break;
    case 'KeyS': moveBackward = state; break;
    case 'KeyA': moveLeft = state; break;
    case 'KeyD': moveRight = state; break;
    case 'ShiftLeft': isSprinting = state; break;
    case 'KeyF': if(state) toggleFlashlight(); break;
    case 'KeyE': if(state) check3DExit(); break;
  }
}

function toggleFlashlight() {
  if (battery <= 0) return;
  flashlightOn = !flashlightOn;
  flashlight.intensity = flashlightOn ? 4.0 : 0;
  playSound('click');
}

// Построение детальной локации
function buildAdvanced3DMap() {
  walls = [];

  const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.7, metalness: 0.2 });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.4 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  // 1. Пол и Потолок
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 50), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 10);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 50), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 3.2, 10);
  scene.add(ceiling);

  // 2. Атмосферный фоновый свет + Аварийная мигающая лампа
  const ambientLight = new THREE.AmbientLight(0x222233, 0.8);
  scene.add(ambientLight);

  redAlertLight = new THREE.PointLight(0xff0000, 2.0, 15);
  redAlertLight.position.set(0, 2.8, 5);
  scene.add(redAlertLight);

  // Офисные лампы
  [ -5, 15 ].forEach(zPos => {
    const lamp = new THREE.PointLight(0xddeeff, 1.2, 12);
    lamp.position.set(0, 3.0, zPos);
    scene.add(lamp);

    const lampMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    lampMesh.position.set(0, 3.15, zPos);
    scene.add(lampMesh);
  });

  // 3. Архитектура стен (Коридор с поворотом и нишей)
  const wallBoxes = [
    // Левая стена
    { w: 0.5, h: 3.2, d: 40, x: -3.5, y: 1.6, z: 10 },
    // Правая стена
    { w: 0.5, h: 3.2, d: 40, x: 3.5, y: 1.6, z: 10 },
    // Задняя стена
    { w: 7.5, h: 3.2, d: 0.5, x: 0, y: 1.6, z: -10 },
    // Перегородка в конце
    { w: 2.8, h: 3.2, d: 0.5, x: -2.3, y: 1.6, z: 29.5 },
    { w: 2.8, h: 3.2, d: 0.5, x: 2.3, y: 1.6, z: 29.5 }
  ];

  wallBoxes.forEach(b => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
    wall.position.set(b.x, b.y, b.z);
    scene.add(wall);
    walls.push(wall);
  });

  // 4. Интерактивные объекты и Детали
  // Выходная дверь
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x00cc44, roughness: 0.3, metalness: 0.5 });
  exitDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.1), doorMat);
  exitDoorMesh.position.set(0, 1.3, 29.4);
  scene.add(exitDoorMesh);

  // Колонны/Ящики для атмосферы
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), boxMat);
  crate.position.set(-2.5, 0.6, 8);
  scene.add(crate);
  walls.push(crate);
}

function check3DExit() {
  const dist = camera.position.distanceTo(exitDoorMesh.position);
  if (dist < 3) {
    document.exitPointerLock();
    document.getElementById("three-container").classList.add("hidden");
    document.getElementById("text-game").classList.remove("hidden");
    playSound('glitch');
    renderChapter(3);
  }
}

// === 6. АНИМАЦИЯ И ФИЗИКА ИГРОКА ===
function animate3D() {
  if (document.getElementById("three-container").classList.contains("hidden")) return;

  requestAnimationFrame(animate3D);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  // Пульсация аварийного света
  if (redAlertLight) {
    redAlertLight.intensity = 1.5 + Math.sin(time * 0.005) * 1.2;
  }

  // Разрядка и мигание фонарика
  if (flashlightOn && battery > 0) {
    battery -= delta * (isSprinting ? 0.6 : 0.25);
    document.getElementById("battery-level").textContent = `${Math.max(0, Math.round(battery))}%`;

    if (battery < 20 && Math.random() < 0.05) {
      flashlight.intensity = 0.5; // Эффект плохой батареи
    } else {
      flashlight.intensity = 4.0;
    }

    if (battery <= 0) { 
      flashlightOn = false; 
      flashlight.intensity = 0; 
    }
  }

  // Расчет скорости
  const speedMultiplier = isSprinting ? 42.0 : 22.0;
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  const moveDirZ = Number(moveForward) - Number(moveBackward);
  const moveDirX = Number(moveRight) - Number(moveLeft);

  if (moveForward || moveBackward) velocity.z -= moveDirZ * speedMultiplier * delta;
  if (moveLeft || moveRight) velocity.x -= moveDirX * speedMultiplier * delta;

  const oldPos = camera.position.clone();

  // Движение с коллизиями
  camera.translateX(-velocity.x * delta);
  if (checkWallCollision(camera.position)) camera.position.x = oldPos.x;

  camera.translateZ(velocity.z * delta);
  if (checkWallCollision(camera.position)) camera.position.z = oldPos.z;

  // Покачивание головы (Head Bobbing)
  const isMoving = moveForward || moveBackward || moveLeft || moveRight;
  if (isMoving) {
    headBobTimer += delta * (isSprinting ? 14 : 9);
    camera.position.y = 1.6 + Math.sin(headBobTimer) * 0.06;

    stepTimer += delta;
    if (stepTimer > (isSprinting ? 0.3 : 0.48)) {
      playSound('step');
      stepTimer = 0;
    }
  } else {
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.6, 0.1);
  }

  prevTime = time;
  renderer.render(scene, camera);
}

// Старт игры
renderChapter(1);
