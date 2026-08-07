// === 1. АУДИОДВИЖОК ===
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
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(); osc.stop(t + 0.1);
  } else if (type === 'pickup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.start(); osc.stop(t + 0.15);
  } else if (type === 'glitch') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.start(); osc.stop(t + 0.2);
  }
}

// === 2. СОСТОЯНИЕ ИГРОКА И ИНВЕНТАРЬ ===
window.playerState = {
  keycardL1: false,
  keycardL2: false,
  batteryCount: 0
};

let currentChapter = 1;
let loopCount = 1;

// === 3. ТЕКСТОВЫЕ ГЛАВЫ ===
const storyData = {
  1: {
    title: "ГЛАВА 1: НАРУШЕНИЕ СОДЕРЖАНИЯ",
    location: "Сектор D-12",
    desc: "Сирены глушат слух. Вы очнулись в камере сдерживания. Дверь выбита снаружи. Впереди 10 отсеков комплекса.",
    choices: [
      { text: "Войти в 3D-комплекс (10 Локаций)", nextChapter: 2 }
    ]
  },
  2: {
    title: "ГЛАВА 2: 3D ЛАБИРИНТ",
    is3D: true,
    nextChapter: 3
  },
  3: {
    title: "ФИНАЛ: ПОБЕГ ИЗ ЗОНЫ",
    location: "Поверхность",
    desc: "Вы преодолели все 10 локаций комплекса и вышли на поверхность! Повстанцы Хаоса эвакуируют вас.",
    choices: [
      { text: "Начать заново", nextChapter: 'RESET' }
    ]
  }
};

function renderChapter(chapNum) {
  if (chapNum === 'RESET') {
    loopCount++;
    window.playerState = { keycardL1: false, keycardL2: false, batteryCount: 0 };
    chapNum = 1;
  }

  currentChapter = chapNum;
  const data = storyData[chapNum];

  if (data.is3D) {
    init3DMode();
    return;
  }

  document.getElementById("chapter-title").textContent = data.title;
  document.getElementById("current-location").textContent = data.location || "SCP Facility";
  document.getElementById("description").textContent = data.desc;
  document.getElementById("loop-count").textContent = `#${loopCount}`;

  const btnsContainer = document.getElementById("buttons-container");
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

// === 4. ГЕНЕРАЦИЯ ТЕКСТУР ===
function createTexture(color, strokeColor, isStripes = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);

  if (isStripes) {
    ctx.fillStyle = '#b38f00';
    ctx.fillRect(0, 220, 256, 36);
    ctx.fillStyle = '#111';
    for(let i = -50; i < 300; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 256); ctx.lineTo(i + 15, 256);
      ctx.lineTo(i + 30, 220); ctx.lineTo(i + 15, 220);
      ctx.fill();
    }
  }

  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const wallTex = createTexture('#222222', '#111111', true);
const floorTex = createTexture('#181818', '#0d0d0d');
wallTex.repeat.set(1, 2);
floorTex.repeat.set(8, 8);

// === 5. 3D ДВИЖОК С 10 ЛОКАЦИЯМИ ===
let scene, camera, renderer, flashlight;
let flashlightOn = true, battery = 100;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
let headBobTimer = 0, stepTimer = 0;

let walls = [];
let interactiveItems = [];
let doors = {};

function init3DMode() {
  document.getElementById("text-game").classList.add("hidden");
  const container = document.getElementById("three-container");
  container.classList.remove("hidden");

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05050d, 0.04);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, -8); // Спавн в Локации 1

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  flashlight = new THREE.SpotLight(0xddffff, 4.0, 25, Math.PI / 4, 0.5, 1);
  flashlight.position.set(0.2, -0.2, 0);
  camera.add(flashlight);
  flashlight.target = camera;
  scene.add(camera);

  build10ZonesMap();

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

// ПОСТРОЕНИЕ 10 ПОЛНОЦЕННЫХ ЛОКАЦИЙ
function build10ZonesMap() {
  walls = [];
  interactiveItems = [];

  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7 });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  // Поверхности
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 30);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 3.2, 30);
  scene.add(ceiling);

  // Свет
  scene.add(new THREE.AmbientLight(0x111122, 0.5));

  // Вспомогательная функция стен
  function addWall(w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    walls.push(mesh);
  }

  // --- 10 ЛОКАЦИЙ (ГЕОМЕТРИЯ) ---
  // Локация 1: Спавн (Бокс D-12)
  addWall(8, 3.2, 0.5, 0, 1.6, -10);
  addWall(0.5, 3.2, 12, -4, 1.6, -4);
  addWall(0.5, 3.2, 12, 4, 1.6, -4);

  // Локация 2: Центральный Коридор
  addWall(0.5, 3.2, 20, -4, 1.6, 12);
  addWall(0.5, 3.2, 20, 4, 1.6, 12);

  // Локация 3: Офис (Слева, z: 12)
  addWall(12, 3.2, 0.5, -10, 1.6, 6);
  addWall(12, 3.2, 0.5, -10, 1.6, 18);
  addWall(0.5, 3.2, 12, -16, 1.6, 12);

  // Локация 4: Склад (Справа, z: 12)
  addWall(12, 3.2, 0.5, 10, 1.6, 6);
  addWall(12, 3.2, 0.5, 10, 1.6, 18);
  addWall(0.5, 3.2, 12, 16, 1.6, 12);

  // Локация 5: Шлюз L1 (z: 22)
  addWall(3, 3.2, 0.5, -2.5, 1.6, 22);
  addWall(3, 3.2, 0.5, 2.5, 1.6, 22);

  // Локация 6: Серверная (z: 32)
  addWall(0.5, 3.2, 20, -6, 1.6, 32);
  addWall(0.5, 3.2, 20, 6, 1.6, 32);

  // Локация 7: Лаборатория (z: 48)
  addWall(16, 3.2, 0.5, -8, 1.6, 42);
  addWall(16, 3.2, 0.5, 8, 1.6, 42);
  addWall(0.5, 3.2, 16, -16, 1.6, 50);
  addWall(0.5, 3.2, 16, 16, 1.6, 50);

  // Локация 8: Шлюз L2 (z: 58)
  addWall(14, 3.2, 0.5, -9, 1.6, 58);
  addWall(14, 3.2, 0.5, 9, 1.6, 58);

  // Локация 9: Пост Охраны (z: 68)
  addWall(0.5, 3.2, 20, -4, 1.6, 68);
  addWall(0.5, 3.2, 20, 4, 1.6, 68);

  // Локация 10: Главная Гермодверь Выхода (z: 78)
  addWall(3.2, 3.2, 0.5, -2.4, 1.6, 78);
  addWall(3.2, 3.2, 0.5, 2.4, 1.6, 78);

  // --- ДВЕРИ ---
  doors.doorL1 = createDoor(0, 1.4, 22, 0xffaa00, "Дверь L1");
  doors.doorL2 = createDoor(0, 1.4, 58, 0xffaa00, "Дверь L2");
  doors.doorExit = createDoor(0, 1.4, 78, 0xff0000, "Финальный Выход");

  // --- ИНТЕРАКТИВНЫЕ ПРЕДМЕТЫ ---
  // Карта L1 в Офисе (Локация 3)
  spawnItem(-12, 0.9, 12, 0x00ffff, 'keycardL1', "Ключ-карта L1");
  // Батарейка на Складе (Локация 4)
  spawnItem(12, 0.8, 12, 0x00ff00, 'battery', "Запасная батарея");
  // Карта L2 в Серверной (Локация 6)
  spawnItem(-4, 0.9, 34, 0xbf00ff, 'keycardL2', "Ключ-карта L2");
}

function createDoor(x, y, z, colorHex, name) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 2.8, 0.2),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 })
  );
  mesh.position.set(x, y, z);
  mesh.userData = { name: name };
  scene.add(mesh);
  walls.push(mesh);
  return mesh;
}

function spawnItem(x, y, z, colorHex, type, name) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.2, 0.4),
    new THREE.MeshBasicMaterial({ color: colorHex })
  );
  mesh.position.set(x, y, z);
  mesh.userData = { type: type, name: name };
  scene.add(mesh);
  interactiveItems.push(mesh);
}

// === 6. ВЗАИМОДЕЙСТВИЕ (КЛАВИША E) ===
function interact3D() {
  const pPos = camera.position;

  // 1. Подбор предметов
  for (let i = interactiveItems.length - 1; i >= 0; i--) {
    const item = interactiveItems[i];
    if (pPos.distanceTo(item.position) < 2.2) {
      playSound('pickup');
      if (item.userData.type === 'keycardL1') {
        window.playerState.keycardL1 = true;
        doors.doorL1.material.color.setHex(0x00ff66);
        alert("Подобрана Ключ-карта Уровня 1!");
      } else if (item.userData.type === 'keycardL2') {
        window.playerState.keycardL2 = true;
        doors.doorL2.material.color.setHex(0x00ff66);
        alert("Подобрана Ключ-карта Уровня 2!");
      } else if (item.userData.type === 'battery') {
        battery = Math.min(100, battery + 50);
        alert("Заряд батареи восполнен (+50%)!");
      }
      scene.remove(item);
      interactiveItems.splice(i, 1);
      return;
    }
  }

  // 2. Открытие дверей
  if (pPos.distanceTo(doors.doorL1.position) < 2.5) {
    if (window.playerState.keycardL1) {
      openDoor(doors.doorL1);
    } else {
      alert("Требуется Ключ-карта Уровня 1 (Ищите в Офисе)!");
    }
  } else if (pPos.distanceTo(doors.doorL2.position) < 2.5) {
    if (window.playerState.keycardL2) {
      openDoor(doors.doorL2);
    } else {
      alert("Требуется Ключ-карта Уровня 2 (Ищите в Серверной)!");
    }
  } else if (pPos.distanceTo(doors.doorExit.position) < 2.5) {
    if (window.playerState.keycardL2) {
      document.exitPointerLock();
      document.getElementById("three-container").classList.add("hidden");
      document.getElementById("text-game").classList.remove("hidden");
      playSound('glitch');
      renderChapter(3);
    } else {
      alert("Выход заблокирован!");
    }
  }
}

function openDoor(doorMesh) {
  playSound('click');
  doorMesh.position.y += 3.0; // Дверь уезжает вверх
  const index = walls.indexOf(doorMesh);
  if (index > -1) walls.splice(index, 1); // Удаляем коллизию
}

// === 7. ФИЗИКА И АНИМАЦИЯ ===
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

  // Батарея
  if (flashlightOn && battery > 0) {
    battery -= delta * (isSprinting ? 0.5 : 0.2);
    document.getElementById("battery-level").textContent = `${Math.max(0, Math.round(battery))}%`;
    if (battery <= 0) { flashlightOn = false; flashlight.intensity = 0; }
  }

  // Движение
  const speed = isSprinting ? 40.0 : 20.0;
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

  // Покачивание камеры
  if (moveForward || moveBackward || moveLeft || moveRight) {
    headBobTimer += delta * (isSprinting ? 14 : 9);
    camera.position.y = 1.6 + Math.sin(headBobTimer) * 0.05;
    stepTimer += delta;
    if (stepTimer > (isSprinting ? 0.3 : 0.48)) { playSound('step'); stepTimer = 0; }
  } else {
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.6, 0.1);
  }

  prevTime = time;
  renderer.render(scene, camera);
}

// Запуск
renderChapter(1);
