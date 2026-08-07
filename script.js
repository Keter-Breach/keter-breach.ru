// === АУДИОДВИЖОК (Web Audio API) ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'click') {
    osc.frequency.setValueAtTime(850, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
    osc.start(); osc.stop(audioCtx.currentTime + 0.04);
  } else if (type === 'step') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100 + Math.random() * 20, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.start(); osc.stop(audioCtx.currentTime + 0.08);
  } else if (type === 'hum') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.012, audioCtx.currentTime);
    osc.start();
  } else if (type === 'glitch') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(150 + Math.random() * 400, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  }
}

// === ДАННЫЕ 10 СЮЖЕТНЫХ ГЛАВ ===
const storyData = {
  1: {
    title: "ГЛАВА 1: ПРОСЫПАНИЕ",
    location: "Блок D (Защитный сектор)",
    desc: "Вы приходите в себя на металлической кушетке. Сирена молчит, но красный свет аварийных ламп заливает кабину.\n\nДверь камеры приоткрыта. На полу лежат обрывки документов: «Объект: SCP-173 / SCP-096. Нарушение условий сдерживания...»\n\nВы проходите в коридор наблюдения к интеркому. Динамик закипает треском, и хриплый голос спрашивает:\n\n«Ты помнишь, кем был до того, как Фонд присвоил тебе номер D-4126?»",
    choices: [
      { text: "«Я помню свое имя...»", nextChapter: 2 },
      { text: "«Я всего лишь подопытный...»", nextChapter: 2 },
      { text: "Молча выключить терминал", nextChapter: 2 }
    ]
  },
  2: {
    title: "ГЛАВА 2: ТЕМНЫЕ КОРИДОРЫ (3D)",
    is3D: true,
    desc: "В глазах темнеет. Вы снова просыпаетесь, но мир вокруг изменился...",
    nextChapter: 3
  },
  3: {
    title: "ГЛАВА 3: СЕКТОР SCP-939",
    location: "Нижние горизонты ЛЗС",
    desc: "Вы выходите из 3D-сектора в задымленный шлюз. Из вентиляции доносится человеческий плач:\n\n«Помогите! Пожалуйста, кто-нибудь!»\n\nОднако вы знаете лор Фонда: SCP-939 имитирует голоса своих жертв, чтобы заманить добычу в темноту.",
    choices: [
      { text: "Затаить дыхание и обойти зону по стеночке", nextChapter: 4 },
      { text: "Бросить металлическую трубу в противоположный угол", nextChapter: 4 }
    ]
  },
  4: {
    title: "ГЛАВА 4: ЛАБОРАТОРИИ СЛЕДОВАТЕЛЕЙ",
    location: "Исследовательский блок Б-4",
    desc: "Вы находите кабинет доктора Клефа. На рабочем столе горит монитор с видеозаписью SCP-079 (Старый ИИ).\n\nЭкран мигает текстом: «Я могу открыть гермодверь в Тяжелую Зону Сдерживания, если ты отключишь подачу питания на блоке 3».",
    choices: [
      { text: "Довериться ИИ и отключить питание", nextChapter: 5 },
      { text: "Взломать терминал вручную через карту доступа", nextChapter: 5 }
    ]
  },
  5: {
    title: "ГЛАВА 5: ТЯЖЕЛАЯ ЗОНА СДЕРЖИВАНИЯ",
    location: "ТЗС (High Containment)",
    desc: "Тяжелые бронированные двери расходятся. Вокруг царит ледяной холод. Вдруг гаснет свет. Слышен характерный бетонный скрежет...\n\nSCP-173 находится прямо в конце коридора. Вы смотрите на него. Появляется непреодолимое желание моргнуть.",
    choices: [
      { text: "Моргать поочередно каждым глазом, отступая назад", nextChapter: 6 },
      { text: "Забыть обо всем и рвануть к ближайшему шлюзу", nextChapter: 6 }
    ]
  },
  6: {
    title: "ГЛАВА 6: ВСТРЕЧА С ЧУМНЫМ ДОКТОРОМ",
    location: "Медицинский блок / Камера SCP-049",
    desc: "В тумане перед вами появляется высокая фигура в черном балахоне и маске чумного доктора.\n\n«Ах, еще одна жертва Поветрия... Не бойся, мое лекарство абсолютно эффективно», — SCP-049 медленно протягивает к вам руку в кожаной перчатке.",
    choices: [
      { text: "Применить найденный светошумовой заряд", nextChapter: 7 },
      { text: "Уклониться и запереть 049 в операционной", nextChapter: 7 }
    ]
  },
  7: {
    title: "ГЛАВА 7: ШАХТА ЛИФТА И SCP-096",
    location: "Переход между блоками",
    desc: "Вы подбегаете к шахте лифта. В углу сидит тощая бледная гуманоидная фигура и громко рыдает, закрыв лицо руками.\n\nЭто SCP-096 (Скромник). На полу валяется разбитое зеркало.",
    choices: [
      { text: "Зажмуриться, уткнуться взглядом в пол и зайти в лифт", nextChapter: 8 },
      { text: "Побежать назад, закрыв лицо руками", nextChapter: 8 }
    ]
  },
  8: {
    title: "ГЛАВА 8: ЗОНА ОПАСНОСТИ SCP-106",
    location: "Карманное измерение / Затопленный сектор",
    desc: "Пол под ногами превращается в черную разъедающую слизь. Из стены выплывает SCP-106 (Старик).\n\nПространство вокруг вас начинает искривляться, утягивая вас в Карманное Измерение.",
    choices: [
      { text: "Прыгнуть в левый коррозийный туннель", nextChapter: 9 },
      { text: "Прыгнуть в правый туннель со звуками всплесков", nextChapter: 9 }
    ]
  },
  9: {
    title: "ГЛАВА 9: ВОЕННЫЙ БЛОК И МОТФ",
    location: "Охраняемый периметр ВЗС",
    desc: "Чудом выбравшись из слизи, вы слышите топот тяжелых берцев и лазерные прицелы на вашей груди. Отряд Мобильной Оперативной Таблицы (МОТ «Девятихвостая Лиса») зачищает комплекс.\n\n«Вижу подопытного D-Class! Приказ: ликвидация!»",
    choices: [
      { text: "Бросить дымовую шашку и уйти в технологический люк", nextChapter: 10 },
      { text: "Поднять руки и активировать тревожную кнопку сектора", nextChapter: 10 }
    ]
  },
  10: {
    title: "ГЛАВА 10: ПОВЕРХНОСТЬ И КИСЛОРОД",
    location: "Ворота А (Gate A) / Поверхность",
    desc: "Гермоворота Gate A со скрежетом поднимаются. Впервые за долгое время вы видите свежий воздух и ночное небо.\n\nК вам приближается бронированный джип без опознавательных знаков Фонда. Из него выходят вооруженные люди в масках:\n\n«Приветствуем, D-4126. Мы из Повстанцев Хаоса. Ты уносишь из этого ада ценные знания. Пора покинуть Зону 19».",
    choices: [
      { text: "Сесть в джип Повстанцев Хаоса (ФИНАЛ: ПОБЕГ)", nextChapter: 'END' },
      { text: "Сложить оружие перед прибывающим вертолетом Фонда (ФИНАЛ: ПЕТЛЯ)", nextChapter: 'RESET' }
    ]
  }
};

// === СОСТОЯНИЕ ИГРЫ ===
let currentChapter = 1;
let loopCount = 1;

// UI Элементы
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
    chapNum = 1;
  } else if (chapNum === 'END') {
    document.getElementById("text-game").innerHTML = `
      <div class="vhs-tag">● REC FINISHED</div>
      <h1>ИГРА ПРОЙДЕНА: СБЕЖАВШИЙ ЭКСПЕРИМЕНТ</h1>
      <p style="margin: 20px 0; line-height: 1.6;">Вы успешно прошли все 10 глав Зоны 19, выжили при нарушении условий сдерживания и сбежали вместе с Повстанцами Хаоса.<br><br>Спасибо за игру!</p>
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

  // Анимация просыпания
  screenEl.classList.remove("wake-up");
  void screenEl.offsetWidth;
  screenEl.classList.add("wake-up");

  btnsContainer.innerHTML = "";
  data.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.textContent = choice.text;
    btn.onclick = () => {
      playSound('click');
      renderChapter(choice.nextChapter);
    };
    btnsContainer.appendChild(btn);
  });
}

// === 3D THREE.JS ДВИЖОК С ТЕКСТУРАМИ И КОЛЛИЗИЕЙ ===
let scene, camera, renderer, flashlight;
let flashlightOn = true;
let battery = 100;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
let stepTimer = 0;

// Текстуры и коллизии
const textureLoader = new THREE.TextureLoader();
let walls = [];
let exitDoorMesh;

const wallTexture = textureLoader.load('textures/concrete_wall.jpg');
const floorTexture = textureLoader.load('textures/floor_tiles.jpg');

wallTexture.wrapS = THREE.RepeatWrapping;
wallTexture.wrapT = THREE.RepeatWrapping;
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(10, 10);

function checkWallCollision(newPosition) {
  const playerRadius = 0.5;

  for (let i = 0; i < walls.length; i++) {
    const wallBox = new THREE.Box3().setFromObject(walls[i]);
    
    const playerBox = new THREE.Box3(
      new THREE.Vector3(newPosition.x - playerRadius, 0, newPosition.z - playerRadius),
      new THREE.Vector3(newPosition.x + playerRadius, 3.5, newPosition.z + playerRadius)
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
  scene.fog = new THREE.FogExp2(0x020202, 0.12);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  flashlight = new THREE.SpotLight(0xccffff, 3.5, 20, Math.PI / 4.5, 0.4, 1);
  flashlight.position.set(0.2, -0.2, 0);
  camera.add(flashlight);
  flashlight.target = camera;
  scene.add(camera);

  build3DMap();

  container.addEventListener('click', () => document.body.requestPointerLock());

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= e.movementX * 0.0022;
      camera.rotation.x -= e.movementY * 0.0022;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
  });

  document.addEventListener('keydown', (e) => {
    onKey(e.code, true);
    if (e.code === 'KeyF') toggleFlashlight();
    if (e.code === 'KeyE') check3DExit();
  });
  document.addEventListener('keyup', (e) => onKey(e.code, false));

  animate3D();
}

function toggleFlashlight() {
  if (battery <= 0) return;
  flashlightOn = !flashlightOn;
  flashlight.intensity = flashlightOn ? 3.5 : 0;
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

function build3DMap() {
  walls = [];

  const wallMat = new THREE.MeshStandardMaterial({ 
    map: wallTexture,
    roughness: 0.8,
    metalness: 0.1
  });
  
  const floorMat = new THREE.MeshStandardMaterial({ 
    map: floorTexture,
    roughness: 0.4
  });

  // Пол
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Потолок
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), ceilingMat);
  ceiling.position.y = 3.5;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // ОСВЕЩЕНИЕ
  const ambientLight = new THREE.AmbientLight(0x051505, 0.8);
  scene.add(ambientLight);

  const redAlertLight = new THREE.PointLight(0xff0022, 2, 12);
  redAlertLight.position.set(0, 2.8, 0);
  scene.add(redAlertLight);

  // Сетка коридоров
  const grid = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,1,0,1],
    [1,1,1,0,0,0,1],
    [1,1,1,1,1,1,1]
  ];

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 1) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 4), wallMat);
        wall.position.set((c - 3) * 4, 1.75, (r - 2) * 4);
        scene.add(wall);
        walls.push(wall);
      }
    }
  }

  // Выходная дверь
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x00ff66, roughness: 0.3, metalness: 0.8 });
  exitDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.2), doorMat);
  exitDoorMesh.position.set(4, 1.5, 8);
  scene.add(exitDoorMesh);
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

function animate3D() {
  if (document.getElementById("three-container").classList.contains("hidden")) return;

  requestAnimationFrame(animate3D);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (flashlightOn && battery > 0) {
    battery -= delta * 0.3;
    document.getElementById("battery-level").textContent = `${Math.max(0, Math.round(battery))}%`;
    if (battery <= 0) { flashlightOn = false; flashlight.intensity = 0; }
  }

  velocity.x -= velocity.x * 8.0 * delta;
  velocity.z -= velocity.z * 8.0 * delta;

  const moveDirZ = Number(moveForward) - Number(moveBackward);
  const moveDirX = Number(moveRight) - Number(moveLeft);

  if (moveForward || moveBackward) velocity.z -= moveDirZ * 28.0 * delta;
  if (moveLeft || moveRight) velocity.x -= moveDirX * 28.0 * delta;

  // Движение с проверкой коллизии
  const oldPos = camera.position.clone();

  camera.translateX(-velocity.x * delta);
  if (checkWallCollision(camera.position)) {
    camera.position.x = oldPos.x;
  }

  camera.translateZ(velocity.z * delta);
  if (checkWallCollision(camera.position)) {
    camera.position.z = oldPos.z;
  }

  camera.position.y = 1.6;

  if (moveForward || moveBackward || moveLeft || moveRight) {
    stepTimer += delta;
    if (stepTimer > 0.45) { playSound('step'); stepTimer = 0; }
  }

  prevTime = time;
  renderer.render(scene, camera);
}

// Запуск игры с Главы 1
renderChapter(1);
