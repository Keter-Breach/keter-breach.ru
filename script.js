// --- ТЕКСТОВАЯ ЧАСТЬ (ЦИКЛ #1) ---
const map = {
  d_cell: {
    name: "Камера D-Class",
    desc: "Вы приходите в себя на кушетке. Голова раскалывается, экран перед глазами мерцает и идет помехами.",
    exits: { "Выйти в коридор": "d_hallway" }
  },
  d_hallway: {
    name: "Коридор блока D",
    desc: "Лампы мигают. На полу видны темные следы. Впереди видна дверь в пункт наблюдения.",
    exits: { "Войти в пункт наблюдения": "security_room" }
  },
  security_room: {
    name: "Пункт наблюдения",
    desc: "Старый монитор шипит. Из динамика раздается искаженный голосом вопрос:\n\n«ТЫ ДУМАЕШЬ, ЧТО ВСЁ ЕЩЕ УПРАВЛЯЕШЬ СВОИМ ТЕЛОМ?»",
    exits: {
      "«Да»": "START_3D",
      "«Нет»": "START_3D",
      "Молча бежать": "START_3D"
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

// --- 3D РЕЖИМ ОТ 1-ГО ЛИЦА (THREE.JS) ---
let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

function init3DMode() {
  // Скрываем текстовый UI, показываем 3D
  document.getElementById("text-game").classList.add("hidden");
  const threeContainer = document.getElementById("three-container");
  threeContainer.classList.remove("hidden");

  // Создание сцены и камеры
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.15); // Густой туман для хоррор-атмосферы

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 0); // Рост человека (1.6м)

  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  threeContainer.appendChild(renderer.domElement);

  // Освещение (Фонарик игрока + аварийный свет)
  const flashlight = new THREE.SpotLight(0x00ff66, 2, 20, Math.PI / 6, 0.5);
  camera.add(flashlight);
  flashlight.position.set(0, 0, 1);
  flashlight.target = camera;
  scene.add(camera);

  const ambientLight = new THREE.AmbientLight(0x111111);
  scene.add(ambientLight);

  // Постройка коридоров SCP
  createCorridors();

  // Управление мышью (Pointer Lock)
  threeContainer.addEventListener('click', () => {
    document.body.requestPointerLock();
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= e.movementX * 0.002;
      camera.rotation.x -= e.movementY * 0.002;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
  });

  // Управление WASD
  document.addEventListener('keydown', (e) => onKey(e.code, true));
  document.addEventListener('keyup', (e) => onKey(e.code, false));

  animate();
}

function onKey(code, state) {
  switch (code) {
    case 'KeyW': moveForward = state; break;
    case 'KeyS': moveBackward = state; break;
    case 'KeyA': moveLeft = state; break;
    case 'KeyD': moveRight = state; break;
  }
}

// Постройка простейшей 3D зоны SCP
function createCorridors() {
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x222222, wireframe: true });
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

  // Пол
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Стеновые блоки (генерация длинного коридора)
  for (let i = -20; i < 20; i += 4) {
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 4), wallMat);
    wallLeft.position.set(-3, 2, i);
    scene.add(wallLeft);

    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 4), wallMat);
    wallRight.position.set(3, 2, i);
    scene.add(wallRight);
  }
}

// Игровой цикл 3D
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

  camera.translateX(-velocity.x * delta);
  camera.translateZ(velocity.z * delta);
  camera.position.y = 1.6; // Фиксация высоты глаз

  prevTime = time;
  renderer.render(scene, camera);
}
