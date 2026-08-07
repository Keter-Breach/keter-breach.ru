// === ПОЛНЫЙ СКРИПТ: SCP "PROJECT: KETER" (VHS EDITION) ===
const textureLoader = new THREE.TextureLoader();

// Утилита загрузки материалов с правильным тайлингом
function loadMaterial(url, repeatX = 1, repeatY = 1) {
  const tex = textureLoader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
}

// === 3D ДВИЖОК ===
let scene, camera, renderer, flashlight;
let walls = [], interactiveItems = [], doors = {};
let wallMaterial, floorMaterial, doorMaterial, tableMaterial, serverMaterial;

function init3DMode() {
  document.getElementById("text-game").classList.add("hidden");
  const container = document.getElementById("three-container");
  container.classList.remove("hidden");

  scene = new THREE.Scene();
  // Мрачный сине-черный туман для атмосферы
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.FogExp2(0x050505, 0.08);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, -8);

  renderer = new THREE.WebGLRenderer({ antialias: false }); // Отключаем antialias для "зернистости" VHS
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Текстуры (тайлинг подстроен под масштаб стен)
  wallMaterial = loadMaterial('textures/damaged_concrete.jpg', 4, 2);
  floorMaterial = loadMaterial('textures/MetalPlates006.png', 10, 10);
  doorMaterial = loadMaterial('textures/Paint002.png', 1, 1);
  tableMaterial = loadMaterial('textures/dark_wood_diff_1k.jpg', 1, 1);
  serverMaterial = loadMaterial('textures/Metal041B.png', 1, 1);

  // Фонарик строго по центру (привязан к камере)
  flashlight = new THREE.SpotLight(0xffffff, 4.0, 30, Math.PI / 4, 0.3, 1.5);
  camera.add(flashlight);
  flashlight.position.set(0, 0, 0);
  flashlight.target.position.set(0, 0, 1);
  camera.add(flashlight.target);
  scene.add(camera);

  // Очень тусклый фоновый свет
  scene.add(new THREE.AmbientLight(0x111122, 0.5));

  buildMap();
  animate3D();
}

// === VHS ЭФФЕКТ (Шейдерный подход) ===
function applyVHSEffect() {
    // Простой способ имитации через CSS-оверлей (быстрее для браузера)
    const overlay = document.createElement('div');
    overlay.id = 'vhs-overlay';
    overlay.style.cssText = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        pointer-events: none; opacity: 0.15;
        background: repeating-linear-gradient(0deg, #000, #000 2px, transparent 2px, transparent 4px);
    `;
    document.body.appendChild(overlay);
}

// === АНИМАЦИЯ ===
function animate3D() {
  requestAnimationFrame(animate3D);
  
  // Легкий "дрифт" камеры для эффекта старой пленки
  camera.rotation.z += (Math.random() - 0.5) * 0.0005;
  
  renderer.render(scene, camera);
}

// Инициализация
applyVHSEffect();
init3DMode();

// (Остальные функции: buildMap, movement, interactions оставляем как в предыдущих версиях)
