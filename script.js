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

const personnelDossier = {
  title: "ДОСЬЕ ПЕРСОНАЛА ФОНДА",
  location: "Архив / доступ уровень 3",
  desc: [
    "ДОКТОР ГИРС (DR. GEARS) — исследователь и руководитель, известный холодным самообладанием, дисциплиной и аналитическим подходом. Обычно занимается оценкой рисков и организацией исследований.",
    "",
    "ДОКТОР ДЖЕК БРАЙТ / ЭЛИАС ШОУ — в старых архивах встречается имя Джек Брайт; в более новых материалах персонаж часто обозначается как Элиас Шоу. Исследователь с аномальным опытом, известный нестандартными решениями и склонностью нарушать протоколы.",
    "",
    "ДОКТОР АЛТО КЛЕФ (DR. ALTO CLEF) — специалист по взаимодействию с аномалиями и полевым операциям. Репутация непредсказуемого сотрудника сочетается с высокой практической эффективностью.",
    "",
    "ДОКТОР БЕНДЖАМИН КОНДРАКИ (DR. BENJAMIN KONDRAKI) — полевой исследователь, известный резким характером и готовностью действовать в опасных условиях. В историях Фонда часто появляется в конфликтах вокруг содержания SCP.",
    "",
    "СОВЕТ O5 — закрытая группа высшего руководства Фонда. Личности и состав Совета засекречены; он принимает стратегические решения по наиболее опасным объектам.",
    "",
    "Примечание: истории SCP создаются разными авторами и могут противоречить друг другу. Это краткий обзор известных персонажей, а не единая официальная биография."
  ].join("\n")
};

const storyData = {
  1: {
    title: "ГЛАВА 1: НАРУШЕНИЕ СОДЕРЖАНИЯ",
    location: "Сектор D-12",
    desc: "Аварийные сирены ревут. Комплекс погрузился во тьму. Найдите пропускные карты, восстановите питание шлюзов и выберитесь на поверхность, пока не поздно.",
    choices: [
      { text: "Войти в комплекс (3D)", nextChapter: 2 },
      { text: "Открыть досье ключевых сотрудников Фонда", nextChapter: "PERSONNEL_DOSSIER" }
    ]
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

  if (chapNum === "PERSONNEL_DOSSIER") {
    document.getElementById("chapter-title").textContent = personnelDossier.title;
    document.getElementById("current-location").textContent = personnelDossier.location;
    document.getElementById("description").textContent = personnelDossier.desc;
    document.getElementById("loop-count").textContent = `#${loopCount} · АРХИВ`;

    const container = document.getElementById("buttons-container");
    container.innerHTML = "";
    [
      { text: "← Вернуться к досье инцидента", nextChapter: 1 },
      { text: "Войти в комплекс (3D)", nextChapter: 2 }
    ].forEach(choice => {
      const btn = document.createElement("button");
      btn.textContent = choice.text;
      btn.onclick = () => { playSound("click"); renderChapter(choice.nextChapter); };
      container.appendChild(btn);
    });
    return;
  }

  const data = storyData[chapNum];
  if (!data) return;
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
    btn.onclick = () => { playSound("click"); renderChapter(choice.nextChapter); };
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

// === 2b. ПРОЦЕДУРНЫЕ ТЕКСТУРЫ (рисуются на canvas, внешние файлы не нужны) ===
let MAT = null, dust = null, flickers = [];
const rnd = Math.random;

function dataTexture(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.encoding = THREE.LinearEncoding;
  texture.anisotropy = 4;
  return texture;
}

// Procedural PBR detail maps: grayscale bump + roughness maps, kept separate
// from the albedo texture so color noise never becomes exaggerated relief.
function makeSurfaceMaps(kind) {
  const bump = dataTexture(256, (g, size) => {
    const base = kind === 'concrete' ? 116 : kind === 'steel' ? 132 : kind === 'paint' ? 124 : 120;
    g.fillStyle = 'rgb(' + base + ',' + base + ',' + base + ')';
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < (kind === 'concrete' ? 1700 : 900); i++) {
      const v = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * (kind === 'concrete' ? 66 : 34)));
      const a = kind === 'concrete' ? 0.22 : 0.16;
      g.fillStyle = 'rgba(' + Math.round(v) + ',' + Math.round(v) + ',' + Math.round(v) + ',' + a + ')';
      const w = 1 + Math.random() * (kind === 'concrete' ? 4 : 2);
      const h = kind === 'steel' ? 3 + Math.random() * 34 : 1 + Math.random() * 4;
      const x = Math.random() * size, y = Math.random() * size;
      g.fillRect(x, y, w, h);
    }
    if (kind === 'concrete' || kind === 'paint') {
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * size, y = Math.random() * size;
        const r = 5 + Math.random() * 24;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(45,45,45,0.16)');
        grad.addColorStop(1, 'rgba(190,190,190,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    }
    // Fine hairline scratches on steel, deliberately low contrast.
    if (kind === 'steel') {
      g.lineWidth = 1;
      for (let i = 0; i < 48; i++) {
        const x = Math.random() * size, y = Math.random() * size;
        g.strokeStyle = Math.random() > 0.5 ? 'rgba(220,220,220,0.18)' : 'rgba(25,25,25,0.2)';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 2, y + 8 + Math.random() * 48); g.stroke();
      }
    }
  });
  const roughness = dataTexture(128, (g, size) => {
    const base = kind === 'steel' ? 145 : kind === 'paint' ? 188 : 205;
    g.fillStyle = 'rgb(' + base + ',' + base + ',' + base + ')';
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 320; i++) {
      const v = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * 54));
      g.fillStyle = 'rgba(' + Math.round(v) + ',' + Math.round(v) + ',' + Math.round(v) + ',0.22)';
      g.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 5, 2 + Math.random() * 5);
    }
  });
  return { bump, roughness };
}

function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}
const fillBg = (g, s, col) => { g.fillStyle = col; g.fillRect(0, 0, s, s); };
function speckle(g, s, n, a) {
  for (let i = 0; i < n; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${rnd() * a})`;
    g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}
function stains(g, s, n, col) {
  for (let i = 0; i < n; i++) {
    const x = s * 0.15 + rnd() * s * 0.7, y = s * 0.15 + rnd() * s * 0.7, r = s * 0.05 + rnd() * s * 0.12;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
function cracks(g, s, n) {
  g.strokeStyle = 'rgba(10,10,10,0.8)'; g.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    let x = s * 0.2 + rnd() * s * 0.6, y = s * 0.1 + rnd() * s * 0.3;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 40; y += 10 + rnd() * 25; g.lineTo(x, y); }
    g.stroke();
  }
}

/**
 * Lightweight procedural grime layer. All maps are generated locally at 256-512px,
 * so the scene needs no extra downloads and has no third-party texture licensing burden.
 */
function distressSurface(g, s, kind) {
  // Dusty, uneven mottling with no large repeated circular blobs.
  const grimeCount = kind === 'concrete' ? 48 : 30;
  for (let i = 0; i < grimeCount; i++) {
    const x = rnd() * s, y = rnd() * s;
    const rx = s * (0.012 + rnd() * 0.045), ry = s * (0.008 + rnd() * 0.035);
    const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    gr.addColorStop(0, kind === 'metal' || kind === 'door'
      ? 'rgba(65,24,8,0.36)' : 'rgba(8,9,8,0.34)');
    gr.addColorStop(0.58, kind === 'metal' || kind === 'door'
      ? 'rgba(83,37,13,0.18)' : 'rgba(10,12,11,0.17)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.save(); g.translate(x, y); g.scale(1, ry / Math.max(rx, ry)); g.beginPath();
    g.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2); g.fill(); g.restore();
  }

  // Rust: concentrated near seams and edges on painted/metal surfaces.
  if (kind === 'metal' || kind === 'door' || kind === 'rack' || kind === 'cab') {
    for (let i = 0; i < 18; i++) {
      const x = rnd() * s, y = rnd() * s, len = s * (0.025 + rnd() * 0.14);
      g.strokeStyle = ['rgba(112,48,15,0.62)','rgba(150,65,20,0.42)','rgba(49,25,13,0.55)'][i % 3];
      g.lineWidth = 1 + rnd() * (kind === 'metal' ? 5 : 3);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 7, Math.min(s, y + len)); g.stroke();
      g.fillStyle = 'rgba(128,55,18,0.25)';
      g.fillRect(Math.max(0, x - 2), Math.max(0, y - 2), 3 + rnd() * 5, 4 + rnd() * 12);
    }
  }

  // Dark dried blood smears and thin downward runs, deliberately restrained.
  if (kind !== 'rack') {
    for (let i = 0; i < (kind === 'concrete' ? 8 : 4); i++) {
      const x = rnd() * s, y = s * (0.12 + rnd() * 0.72);
      const len = s * (0.025 + rnd() * 0.12);
      g.strokeStyle = ['rgba(72,5,8,0.48)','rgba(103,10,13,0.34)','rgba(35,3,5,0.46)'][i % 3];
      g.lineWidth = 1 + rnd() * (kind === 'concrete' ? 5 : 3);
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 2, y + len * .25, x - 2, y + len * .7, x + (rnd() - .5) * 4, Math.min(s, y + len)); g.stroke();
      g.fillStyle = 'rgba(63,4,8,0.24)';
      g.beginPath(); g.ellipse(x, y, 3 + rnd() * 8, 2 + rnd() * 5, rnd(), 0, Math.PI * 2); g.fill();
    }
  }

  if (kind === 'concrete' || kind === 'door') {
    // Hairline fractures with short branches, plus chipped plaster at edges.
    g.strokeStyle = 'rgba(12,13,12,0.72)'; g.lineWidth = 1;
    for (let i = 0; i < (kind === 'concrete' ? 10 : 5); i++) {
      let x = rnd() * s, y = rnd() * s;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (rnd() - .5) * 22; y += (rnd() - .5) * 26;
        g.lineTo(x, y);
        if (k === 2 && rnd() > .45) {
          g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 24, y + (rnd() - .5) * 20);
          g.moveTo(x, y);
        }
      }
      g.stroke();
    }
    g.fillStyle = 'rgba(12,12,11,0.28)';
    g.fillRect(0, s * .88, s, s * .12);
    g.fillStyle = 'rgba(150,145,130,0.08)';
    for (let i = 0; i < 12; i++) g.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 8, 1 + rnd() * 4);
  }
}

const TEX = {
  concrete: () => canvasTex(512, (g, s) => {
    fillBg(g, s, '#393b39'); speckle(g, s, 650, 0.035); distressSurface(g, s, 'concrete');
    // Ровные бетонные панели вместо больших радиальных пятен, которые на стенах
    // выглядели как повторяющиеся белые круги при близкой раскладке UV.
    g.strokeStyle = 'rgba(15,18,18,0.22)'; g.lineWidth = 2;
    g.strokeRect(2, 2, s - 4, s - 4);
    g.strokeStyle = 'rgba(230,232,228,0.08)'; g.lineWidth = 1;
    g.strokeRect(7, 7, s - 14, s - 14);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, s - 3, s, 3); g.fillRect(0, 0, 3, s); // стыки плит
  }),
  metal: () => canvasTex(512, (g, s) => {
    fillBg(g, s, '#2b2f33'); const p = s / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = i * p, y = j * p;
      g.fillStyle = `hsl(210,6%,${20 + rnd() * 6}%)`; g.fillRect(x + 3, y + 3, p - 6, p - 6);
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.strokeRect(x + 5, y + 5, p - 10, p - 10);
      g.fillStyle = '#15171a';
      [[14, 14], [p - 14, 14], [14, p - 14], [p - 14, p - 14]].forEach(([a, b]) => { g.beginPath(); g.arc(x + a, y + b, 4, 0, 7); g.fill(); });
    }
    speckle(g, s, 650, 0.06); distressSurface(g, s, 'metal');
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 14; i++) { const x = rnd() * s, y = rnd() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd() * 40 - 20, y + rnd() * 40 - 20); g.stroke(); }
  }),
  door: () => canvasTex(256, (g, s) => {
    fillBg(g, s, '#4a5750'); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 4; g.strokeRect(24, 24, s - 48, s - 48);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.strokeRect(28, 28, s - 56, s - 56);
    speckle(g, s, 700, 0.07); stains(g, s, 3, 'rgba(20,10,0,0.24)'); distressSurface(g, s, 'door');
    g.fillStyle = '#d9a400'; g.fillRect(0, s - 14, s, 8);
  }),
  wood: () => canvasTex(256, (g, s) => {
    fillBg(g, s, '#3a281c');
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${rnd() < 0.5 ? 20 : 90},${rnd() < 0.5 ? 10 : 55},10,${0.15 + rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 2;
      const x = rnd() * s; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rnd() * 14 - 7, s / 3, x + rnd() * 14 - 7, 2 * s / 3, x, s); g.stroke();
    }
    speckle(g, s, 1500, 0.25);
  }),
  rack: () => canvasTex(256, (g, s) => {
    fillBg(g, s, '#1f2327');
    for (let y = 12; y < s - 10; y += 32) {
      g.fillStyle = '#0b0d0f'; g.fillRect(14, y, s - 28, 22);
      for (let x = 22; x < s - 40; x += 7) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x, y + 4, 3, 14); }
      g.fillStyle = rnd() < 0.5 ? '#0f0' : '#f80'; g.fillRect(s - 30, y + 8, 6, 6);
    }
    speckle(g, s, 2000, 0.3); distressSurface(g, s, 'rack');
  }),
  cab: () => canvasTex(512, (g, s) => {
    // Сталь лифта: спокойная базовая поверхность, мелкие потёртости вместо
    // контрастных чёрно-белых точек, которые выглядели как грязный камуфляж.
    const base = g.createLinearGradient(0, 0, s, 0);
    base.addColorStop(0, '#292f33');
    base.addColorStop(0.48, '#41474a');
    base.addColorStop(1, '#252a2e');
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.fillRect(0, 0, s, 7); g.fillRect(0, s - 7, s, 7);
    g.strokeStyle = 'rgba(0,0,0,0.62)'; g.lineWidth = 2;
    g.strokeRect(3, 3, s - 6, s - 6);
    g.strokeStyle = 'rgba(190,198,199,0.09)'; g.lineWidth = 1;
    g.strokeRect(8, 8, s - 16, s - 16);
    g.beginPath(); g.moveTo(s / 2, 4); g.lineTo(s / 2, s - 4); g.stroke();
    // Тонкие вертикальные шлифовальные следы.
    for (let i = 0; i < 90; i++) {
      const x = rnd() * s, y = rnd() * s, h = 5 + rnd() * 54;
      g.strokeStyle = rnd() < 0.7 ? 'rgba(0,0,0,0.10)' : 'rgba(210,216,215,0.07)';
      g.lineWidth = 1 + rnd() * 1.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, Math.min(s, y + h)); g.stroke();
    }
    // Редкие пятна влаги и следы эксплуатации.
    stains(g, s, 2, 'rgba(8,12,14,0.24)'); distressSurface(g, s, 'cab');
    speckle(g, s, 220, 0.035);
    // Технические панели и крепёж.
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(20, 20, s - 40, 2); g.fillRect(20, s - 22, s - 40, 2);
    g.fillStyle = 'rgba(210,215,213,0.18)';
    [[14,14],[s-14,14],[14,s-14],[s-14,s-14]].forEach(([x,y]) => {
      g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill();
    });
  }),
  cloth: () => canvasTex(256, (g, s) => {
    fillBg(g, s, '#aeb6b4');
    for (let y = 0; y < s; y += 4) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, y, s, 1); }
    g.fillStyle = 'rgba(40,80,130,0.5)'; g.fillRect(0, s * 0.4, s, 16);
    speckle(g, s, 1800, 0.20); stains(g, s, 3, 'rgba(120,20,15,0.3)'); distressSurface(g, s, 'cloth');
  }),
  statue: () => canvasTex(256, (g, s) => { // SCP-173: бетон с потёками краски
    fillBg(g, s, '#8b8576'); speckle(g, s, 6000, 0.4);
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = ['rgba(200,90,20,0.55)', 'rgba(40,110,150,0.5)', 'rgba(120,40,30,0.5)'][i % 3]; g.lineWidth = 3 + rnd() * 6;
      const x = rnd() * s; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rnd() * 30 - 15, s); g.stroke();
    }
    cracks(g, s, 3); stains(g, s, 3, 'rgba(60,20,10,0.4)');
  }),
  keterBase: () => canvasTex(256, (g, s) => { fillBg(g, s, '#0c0608'); stains(g, s, 8, 'rgba(60,8,8,0.5)'); speckle(g, s, 4000, 0.3); }),
  keterVein: () => canvasTex(256, (g, s) => {
    fillBg(g, s, '#000'); g.strokeStyle = '#ff2a10';
    for (let i = 0; i < 14; i++) {
      g.lineWidth = 1 + rnd() * 3; let x = rnd() * s, y = rnd() * s; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += rnd() * 60 - 30; y += rnd() * 60 - 30; g.lineTo(x, y); }
      g.stroke();
    }
  }),
  ceil: () => canvasTex(256, (g, s) => {
    fillBg(g, s, '#23272b'); g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 4; g.strokeRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; g.strokeRect(6, 6, s - 12, s - 12);
    speckle(g, s, 900, 0.08); distressSurface(g, s, 'concrete');
  })
};

function loadImageTexture(path, material, repeatX = 1, repeatY = 1) {
  // Загружаем цветовую карту. Не используем её же как bumpMap:
  // яркие/тёмные пятна albedo иначе превращаются в грубые физические бугры.
  const loader = new THREE.TextureLoader();
  loader.load(
    path,
    texture => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.encoding = THREE.sRGBEncoding;
      texture.needsUpdate = true;

      // Заменяем только цветовой слой; bump/normal map подключаются отдельно,
      // когда в проекте есть специально подготовленные карты рельефа.
      material.map = texture;
      material.needsUpdate = true;
      console.info("[KETER] Текстура загружена:", path);
    },
    undefined,
    error => console.warn("[KETER] Не удалось загрузить текстуру " + path + "; оставляем процедурную.", error)
  );
}

function buildMaterials() {
  // Color maps describe albedo only. Surface relief and microsurface roughness
  // use independent linear-space data maps, as expected by a PBR material.
  const M = (t, r, m = 0, detail = 'concrete', bumpScale = 0.035) => {
    const maps = makeSurfaceMaps(detail);
    return new THREE.MeshStandardMaterial({
      map: t, roughness: r, metalness: m,
      bumpMap: maps.bump, bumpScale,
      roughnessMap: maps.roughness
    });
  };
  const fl = TEX.metal(); fl.repeat.set(18, 24);
  const cl = TEX.ceil(); cl.repeat.set(24, 32);
  wallMaterial = M(TEX.concrete(), 0.94, 0, 'concrete', 0.045);
  floorMaterial = M(fl, 0.72, 0.12, 'steel', 0.025);
  doorMaterial = M(TEX.door(), 0.72, 0.08, 'paint', 0.022);
  tableMaterial = M(TEX.wood(), 0.82, 0, 'paint', 0.018);
  serverMaterial = M(TEX.rack(), 0.58, 0.3, 'steel', 0.018);
  MAT = {
    ceil: M(cl, 0.94, 0, 'concrete', 0.025),
    cab: M(TEX.cab(), 0.78, 0.12, 'steel', 0.018),
    bed: M(TEX.cloth(), 0.86, 0, 'paint', 0.012),
    statue: M(TEX.statue(), 0.97, 0, 'concrete', 0.018),
    keter: new THREE.MeshStandardMaterial({ map: TEX.keterBase(), roughness: 0.25, metalness: 0.3, emissive: 0xff2200, emissiveMap: TEX.keterVein(), emissiveIntensity: 0.8 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.15, roughness: 0.1 }),
    tank: new THREE.MeshStandardMaterial({ color: 0x66ffaa, transparent: true, opacity: 0.25, roughness: 0.1 }),
    liquid: new THREE.MeshBasicMaterial({ color: 0x22cc66 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xb85a10, roughness: 0.8 })
  };

  // Реальные файлы проекта повышают детализацию; процедурные материалы остаются fallback.
  // Стены и пол оставляем на контролируемых процедурных текстурах: внешние
  // материалы Concrete034/MetalPlates006 дают в этой сцене слишком крупный рисунок.
  // Повторяемые узоры сохраняем только там, где они читаются как реальные детали.
  loadImageTexture("textures/Paint002.png", doorMaterial);
  loadImageTexture("textures/dark_wood_diff_1k.jpg", tableMaterial);
  loadImageTexture("textures/Metal041B.png", serverMaterial);
  // Для шкафов используем нейтральную процедурную краску вместо мраморного рисунка.
}

// Физически масштабируем UV по каждой грани. 4 world units = один повтор,
// поэтому рисунок сохраняет масштаб и не превращается в растянутую картинку.
function scaleBoxUV(geo, w, h, d, tile = 4) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  if (!uv || uv.count < 24) return;

  for (let face = 0; face < 6; face++) {
    const [faceWidth, faceHeight] = dims[face];
    for (let corner = 0; corner < 4; corner++) {
      const index = face * 4 + corner;
      uv.setXY(
        index,
        uv.getX(index) * faceWidth / tile,
        uv.getY(index) * faceHeight / tile
      );
    }
  }
  uv.needsUpdate = true;
}

function makeDust() { // мелкая пыль и редкие частицы в лучах фонаря
  const n = 300, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rnd() - 0.5) * 22;
    pos[i * 3 + 1] = 0.08 + rnd() * 2.8;
    pos[i * 3 + 2] = -9 + rnd() * 88;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x87948b, size: 0.018, transparent: true, opacity: 0.2,
    depthWrite: false, sizeAttenuation: true
  }));
  world.add(pts);
  return pts;
}

// === 3. 3D ДВИЖОК ===
let scene, camera, renderer, flashlight, world, hintEl, toastEl;
let initialized = false;
let flashlightOn = true, battery = 100;
let lowBatteryStaticPlayed = false;
let wakeupProgress = 0;
let wakeupActive = false;
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
    container.style.filter = "contrast(1.16) brightness(0.72) sepia(0.18) saturate(0.58)";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020305);
    scene.fog = new THREE.FogExp2(0x030407, 0.065);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ'; // yaw отдельно от pitch: взгляд вверх не замедляет ходьбу

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.72;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    buildMaterials();

    flashlight = new THREE.SpotLight(0xddeeff, 5.0, 35, Math.PI / 3, 0.4, 1.5);
    flashlight.position.set(0, 0, 0);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(1024, 1024);
    flashlight.shadow.bias = -0.0005;
    flashlight.shadow.camera.near = 0.2;
    flashlight.shadow.camera.far = 35;
    flashlight.target.position.set(0, 0, -1); // камера смотрит в -Z
    camera.add(flashlight, flashlight.target);
    scene.add(camera);
    scene.add(new THREE.AmbientLight(0x090d12, 0.16));

    // Подсказки поверх игры (вместо alert, который ломал pointer lock)
    const base = "position:absolute;left:50%;transform:translateX(-50%);padding:10px 18px;" +
      "background:rgba(5,5,8,.9);border:1px solid #00ff66;color:#00ff66;font-size:14px;pointer-events:none;";
    toastEl = document.createElement('div');
    toastEl.style.cssText = base + "bottom:90px;opacity:0;transition:opacity .3s;";
    hintEl = document.createElement('div');
    hintEl.style.cssText = base + "top:50%;margin-top:40px;";
    hintEl.textContent = "Кликните, чтобы управлять";
    container.append(toastEl, hintEl);
     const fx = document.createElement('div'); // тяжёлая виньетка и линии развёртки
     fx.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse at center,rgba(0,0,0,.04) 18%,rgba(0,0,0,.82) 100%),repeating-linear-gradient(0deg,rgba(0,0,0,.075) 0 1px,transparent 1px 3px);';
     container.append(fx);

    container.addEventListener('click', () => document.body.requestPointerLock());
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', (e) => {
      // Не повторяем одноразовые действия, пока клавиша удерживается.
      if (e.repeat && (e.code === 'KeyF' || e.code === 'KeyE')) return;
      onKey(e.code, true);
    });
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
  camera.position.set(0, 0.72, -8);
  camera.rotation.set(0.22, Math.PI, 0); // приходит в себя на полу лифта, затем поднимает голову
  wakeupProgress = 0;
  wakeupActive = true;
  showToast("Вы приходите в себя в остановившемся лифте...", 4200);
  const batteryHUD = document.getElementById("battery-level");
  batteryHUD.textContent = "100%";
  batteryHUD.classList.remove("battery-low", "battery-critical");
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

function addSign() {
  // Таблички отключены для более реалистичного, менее игрового окружения.
  return null;
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
  walls = []; interactiveItems = []; doors = {}; flickers = [];

  const ceilingMat = MAT.ceil;
  const cabMat = MAT.cab;
  const bedMat = MAT.bed;
  const darkMat = MAT.keter;
  const glassMat = MAT.glass;
  const redMat = () => new THREE.MeshBasicMaterial({ color: 0xff2222 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 30); floor.receiveShadow = true; world.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 3.2, 30); world.add(ceiling);

  const box = (mat, w, h, d, x, y, z, solid) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    scaleBoxUV(geo, w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (mat.isMeshStandardMaterial && !mat.transparent) { m.castShadow = true; m.receiveShadow = true; }
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
    const light = new THREE.PointLight(color, 0.42, 8);
    light.position.set(x, y, z); world.add(light);
    if (color === 0xff3322 || color === 0x40ffee) flickers.push({ light, base: 0.42 });
    box(new THREE.MeshBasicMaterial({ color: color === 0xff3322 ? 0x4d0b0b : 0x554a2c }), 0.8, 0.1, 0.3, x, 3.1, z);
  }

  const mkTable = (x, z) => {
    box(tableMaterial, 2.4, 0.1, 1.2, x, 0.75, z, true);
    [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].forEach(([dx, dz]) =>
      box(tableMaterial, 0.1, 0.75, 0.1, x + dx, 0.375, z + dz));
  };

  const addStatue = (x, z, faceX) => { // «статуя» в духе SCP-173
    const g = new THREE.Group();
    const part = (w, h, d, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.statue);
      m.position.set(px, py, pz); g.add(m);
    };
    part(0.5, 1.0, 0.3, 0, 1.1, 0); part(0.3, 0.3, 0.3, 0, 1.8, 0);
    part(0.12, 0.9, 0.12, -0.35, 1.0, 0); part(0.12, 0.9, 0.12, 0.35, 1.0, 0);
    part(0.14, 0.7, 0.14, -0.15, 0.35, 0); part(0.14, 0.7, 0.14, 0.15, 0.35, 0);
    g.position.set(x, 0, z); g.rotation.y = faceX > 0 ? Math.PI / 2 : -Math.PI / 2;
    world.add(g);
  };

  // --- Стартовый лифт: игрок приходит в себя внутри кабины ---
  box(MAT.cab, 0.18, 3.0, 4.5, -2.0, 1.5, -7.65, true);
  box(MAT.cab, 0.18, 3.0, 4.5, 2.0, 1.5, -7.65, true);
  box(MAT.cab, 4.0, 3.0, 0.18, 0, 1.5, -9.85, true);
  box(MAT.cab, 4.0, 0.12, 4.5, 0, 3.08, -7.65);
  // Двери застряли в полуоткрытом положении — проход остаётся доступным.
  box(MAT.cab, 0.88, 2.65, 0.12, -1.48, 1.32, -5.42, true);
  box(MAT.cab, 0.88, 2.65, 0.12, 1.48, 1.32, -5.42, true);
  box(new THREE.MeshBasicMaterial({ color: 0x30100d }), 0.08, 2.4, 0.05, -1.98, 1.35, -5.32);
  box(new THREE.MeshBasicMaterial({ color: 0x30100d }), 0.08, 2.4, 0.05, 1.98, 1.35, -5.32);
  const elevatorLamp = new THREE.PointLight(0x8d1f17, 0.42, 6);
  elevatorLamp.position.set(0, 2.65, -7.2);
  world.add(elevatorLamp);
  flickers.push({ light: elevatorLamp, base: 0.42 });
  box(new THREE.MeshBasicMaterial({ color: 0x4b1713 }), 0.65, 0.04, 0.18, 0, 2.92, -7.2);
  // Потёртые швы панелей, вентиляционная решётка и панель вызова лифта.
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x171b1d, roughness: 0.9, metalness: 0.18 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x45494a, roughness: 0.82, metalness: 0.28 });
  [-1.25, -0.62, 0, 0.62, 1.25].forEach(x => {
    box(seamMat, 0.018, 2.65, 0.012, x, 1.45, -9.74);
  });
  for (let i = 0; i < 7; i++) {
    box(seamMat, 0.52, 0.025, 0.018, 1.88, 1.82 + i * 0.075, -7.45);
  }
  box(edgeMat, 0.28, 0.56, 0.06, 1.87, 1.38, -7.45);
  box(new THREE.MeshBasicMaterial({ color: 0x6e1815 }), 0.12, 0.08, 0.025, 1.83, 1.55, -7.40);
  box(new THREE.MeshBasicMaterial({ color: 0x17281b }), 0.12, 0.08, 0.025, 1.83, 1.39, -7.40);
  // Тёмные потёртости у порога кабины.
  box(seamMat, 2.6, 0.018, 0.16, 0, 0.025, -5.28);
  box(edgeMat, 2.5, 0.025, 0.055, 0, 0.035, -5.38);

  // --- Стены и проёмы ---
  wallLine('z', -10, -4, 4);                         // Шлюз D-12
  wallLine('x', -4, -10, 2, [[-5, -1]]); wallLine('x', 4, -10, 2);
  wallLine('z', -9, -14, -4); wallLine('z', 1, -14, -4); wallLine('x', -14, -9, 1); // Блок D-класса
  wallLine('z', 2, -5, 5, [[-1.5, 1.5]]);            // шлюз -> холл
  wallLine('x', -5, 2, 24, [[8, 12]]);               // холл (проём в Администрацию)
  wallLine('x', 5, 2, 24, [[8, 12]]);                // холл (проём в Медпункт)
  wallLine('z', 24, -5, 5, [[-1, 1]]);               // дверь L-1
  wallLine('z', 4, -15, -5); wallLine('z', 16, -15, -5); wallLine('x', -15, 4, 16); // Администрация
  wallLine('z', 4, 5, 15); wallLine('z', 16, 5, 15); wallLine('x', 15, 4, 16);      // Медпункт
  wallLine('x', -5, 24, 44); wallLine('x', 5, 24, 44, [[31, 35]]);
  wallLine('z', 27, 5, 15); wallLine('z', 39, 5, 15); wallLine('x', 15, 27, 39); // Лаборатория                              // Узел данных
  wallLine('z', 44, -16, 16, [[-1.5, 1.5]]);         // узел -> зал содержания
  wallLine('x', -16, 44, 60); wallLine('x', 16, 44, 60);
  wallLine('z', 60, -16, 16, [[-1, 1]]);             // дверь L-2
  wallLine('x', -4, 60, 80, [[66, 70]]); wallLine('x', 4, 60, 80);
  wallLine('z', 63, -14, -4); wallLine('z', 77, -14, -4); wallLine('x', -14, 63, 77); // Пост охраны
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

  // --- Инженерные детали: кабель-каналы, сервисные панели и следы ремонта ---
  const conduitMat = new THREE.MeshStandardMaterial({ color: 0x202528, roughness: 0.86, metalness: 0.24 });
  [-3.7, 3.7].forEach(x => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 76, 7), conduitMat);
    pipe.position.set(x, 3.02, 25); world.add(pipe);
    const smaller = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 76, 6), seamMat);
    smaller.position.set(x + (x < 0 ? 0.16 : -0.16), 2.88, 25); world.add(smaller);
  });
  [-4.72, 4.72].forEach(x => [7, 19, 29, 40, 53, 72].forEach(z => {
    box(conduitMat, 0.055, 0.62, 0.78, x, 1.72, z);
    box(seamMat, 0.06, 0.035, 0.64, x, 1.9, z);
    box(seamMat, 0.06, 0.035, 0.64, x, 1.54, z);
    box(new THREE.MeshBasicMaterial({ color: z > 40 ? 0x48120f : 0x203629 }),
      0.065, 0.055, 0.055, x, 1.72, z - 0.22);
  }));

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

  const solid = (m) => { world.add(m); walls.push({ mesh: m, box: new THREE.Box3().setFromObject(m) }); };
  dust = makeDust();

  // --- Хоррор-декали: засохшая кровь и следы аварийной эвакуации ---
  // Текстура создаётся процедурно: не требует внешних файлов и не влияет на коллизии.
  const makeBloodDecalTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const g = canvas.getContext('2d');
    const stain = (x, y, rx, ry, alpha) => {
      g.save();
      g.translate(x, y); g.scale(rx, ry);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, 'rgba(48,5,7,' + alpha + ')');
      grad.addColorStop(0.55, 'rgba(72,8,10,' + (alpha * 0.8) + ')');
      grad.addColorStop(1, 'rgba(28,3,5,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    stain(120, 128, 82, 58, 0.82);
    for (let i = 0; i < 17; i++) {
      const x = 65 + Math.random() * 125, y = 75 + Math.random() * 115;
      stain(x, y, 8 + Math.random() * 25, 5 + Math.random() * 19, 0.55);
    }
    // Узкие потёки, словно кровь размазали ботинком по бетону.
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = 70 + Math.random() * 115, y = 112 + Math.random() * 55;
      g.strokeStyle = 'rgba(39,3,5,' + (0.22 + Math.random() * 0.38) + ')';
      g.lineWidth = 1 + Math.random() * 5;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x - 8, y + 14, x + 12, y + 22, x + (Math.random() - 0.5) * 30, y + 42 + Math.random() * 35); g.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
  };
  const bloodTexture = makeBloodDecalTexture();
  const bloodMat = new THREE.MeshBasicMaterial({
    map: bloodTexture, transparent: true, opacity: 0.72,
    depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1
  });
  const floorBlood = (x, z, sx, sz, rotation = 0) => {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), bloodMat);
    decal.rotation.x = -Math.PI / 2;
    decal.rotation.z = rotation;
    decal.position.set(x, 0.018, z);
    world.add(decal);
  };
  // Небольшие, не слишком яркие следы — игрок замечает их в луче фонаря.
  floorBlood(-1.75, 18.6, 1.9, 1.25, 0.35);
  floorBlood(1.65, 47.2, 1.55, 1.05, -0.55);
  floorBlood(-2.15, 56.8, 1.7, 1.1, 0.2);
  floorBlood(1.8, 66.1, 1.4, 0.9, -0.3);
  // След на стене у камер содержания: заметен только при близком осмотре.
  const wallBlood = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.45), bloodMat);
  wallBlood.position.set(-15.735, 1.15, 51.4);
  wallBlood.rotation.y = Math.PI / 2;
  world.add(wallBlood);

  // --- Блок D-класса: нары, стол, запасная батарея ---
  addPointLight(-9, -4, 0xffa040);
  addSign(['БЛОК D-КЛАССА', 'ЖИЛЫЕ ПОМЕЩЕНИЯ'], -3.72, 2.75, -3, Math.PI / 2);
  [-7, -4, -1].forEach(z => { box(MAT.cab, 0.9, 1.6, 2, -13, 0.8, z, true); box(MAT.orange, 0.8, 0.12, 1.8, -13, 1.66, z); });
  mkTable(-8, -7);
  spawnBattery(-6, 0.3, -2);

  // --- Лаборатория: столы, ёмкости с образцами ---
  addPointLight(10, 33, 0x33ff88);
  addSign(['ЛАБОРАТОРИЯ', 'ИССЛЕДОВАНИЯ SCP'], 4.72, 2.75, 33, -Math.PI / 2, '#66ffaa');
  [30, 36].forEach(z => box(MAT.cab, 3, 0.9, 1, 8.5, 0.45, z, true));
  [29, 33, 37].forEach(z => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.5, 16), MAT.tank); t.position.set(13.8, 1.25, z); solid(t);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 12), MAT.liquid); l.position.set(13.8, 1.25, z); world.add(l);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), MAT.keter); b.position.set(13.8, 1.2, z); world.add(b);
  });

  // --- Пост охраны: шкафчики, мониторы, ящики ---
  addPointLight(-9, 70, 0xffd080);
  addSign(['ПОСТ ОХРАНЫ', 'ТОЛЬКО ПЕРСОНАЛ'], -3.72, 2.75, 68, Math.PI / 2, '#66aaff');
  for (let i = 0; i < 6; i++) box(MAT.cab, 0.6, 2, 0.9, -13.5, 1, 64 + i * 1.1, true);
  mkTable(-9, 75);
  addSign(['КАМ-04', 'СИГНАЛ ПОТЕРЯН'], -9.8, 1.15, 75.45, Math.PI, '#33ff88', 0.4);
  addSign(['КАМ-07', 'ЗАЛ СОДЕРЖАНИЯ'], -8.2, 1.15, 75.45, Math.PI, '#ff4444', 0.4);
  box(tableMaterial, 1, 1, 1, -6, 0.5, 63.9, true); box(tableMaterial, 1, 1, 1, -6, 0.5, 64.9, true);

  // --- Колонны в зале содержания ---
  [[-5, 48], [5, 48], [-5, 56], [5, 56]].forEach(([x, z]) => box(wallMaterial, 1, 3.2, 1, x, 1.6, z, true));

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

  // Меню паузы замораживает симуляцию, но оставляет цикл рендера готовым к продолжению.
  if (window.__keterPaused) {
    prevTime = performance.now();
    return;
  }

  const time = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.1); // защита от скачков после смены вкладки
  prevTime = time;

  const locked = isLocked();
  hintEl.style.display = locked ? 'none' : 'block';

  // Медленное пробуждение: взгляд поднимается с пола лифта.
  if (wakeupActive) {
    wakeupProgress = Math.min(1, wakeupProgress + delta / 3.4);
    const t = wakeupProgress * wakeupProgress * (3 - 2 * wakeupProgress);
    camera.position.y = 0.72 + 0.88 * t;
    camera.rotation.x = 0.22 * (1 - t);
    if (wakeupProgress >= 1) wakeupActive = false;
  }

  if (locked) {
    // Батарея
    if (flashlightOn && battery > 0) {
      battery -= delta * (isSprinting ? 0.3 : 0.08);
      const batteryHUD = document.getElementById("battery-level");
      batteryHUD.textContent = `${Math.max(0, Math.round(battery))}%`;
      batteryHUD.classList.toggle("battery-low", battery <= 30 && battery > 15);
      batteryHUD.classList.toggle("battery-critical", battery <= 15);
      if (battery <= 0) {
        flashlightOn = false;
        flashlight.intensity = 0;
        showToast("Фонарь погас");
      } else if (battery < 15) {
        flashlight.intensity = Math.random() < 0.08 ? 1.0 : 5.0; // мерцание
        if (!lowBatteryStaticPlayed) {
          lowBatteryStaticPlayed = true;
          try {
            const staticAudio = new Audio("audio/static.mp3");
            staticAudio.volume = Math.min(1, Number(window.__keterVolume ?? 0.7) * 0.3);
            const staticPromise = staticAudio.play();
            if (staticPromise && typeof staticPromise.catch === "function") {
              staticPromise.catch(() => {});
            }
          } catch (error) {
            // Мерцание фонаря продолжает работать без аудио.
          }
        }
      } else {
        lowBatteryStaticPlayed = false;
      }
    }

    // Движение относительно направления взгляда (только по горизонтали)
    const speed = isSprinting ? 11.5 : 7.0;
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    let dirZ = Number(moveForward) - Number(moveBackward);
    let dirX = Number(moveRight) - Number(moveLeft);
    // Диагональ не должна быть быстрее движения по одной оси.
    const inputLength = Math.hypot(dirX, dirZ);
    if (inputLength > 1) {
      dirX /= inputLength;
      dirZ /= inputLength;
    }
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

  flickers.forEach(f => {
    const outage = Math.random() < 0.065;
    f.light.intensity = f.base * (outage ? 0.08 : 0.82 + Math.random() * 0.18);
  });
  if (MAT) MAT.keter.emissiveIntensity = 0.7 + 0.3 * Math.sin(time * 0.003);
  if (dust) {
    const p = dust.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + delta * 0.05; if (y > 3) y = 0;
      p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(time * 0.0005 + i) * 0.0015);
    }
    p.needsUpdate = true;
  }

  drawMinimap();
  renderer.render(scene, camera);
}

// Старт
renderChapter(1);

// ==================================================
// ГЛАВНОЕ МЕНЮ И НАСТРОЙКИ (объединено с игровым ядром)
// ==================================================

/*
 * PROJECT: KETER — интерфейс и настройки
 * ВАЖНО:
 * 1. Переименуйте старый script.js в game-core.js.
 * 2. Этот файл сохраните как script.js.
 * 3. Подключайте только этот script.js в index.html.
 *
 * Оригинальный game-core.js сохраняет карту, сюжет,
 * двери, ключ-карты, фонарь, инвентарь и мини-карту.
 */

(() => {
  "use strict";

  const SETTINGS_KEY = "keterSettings";

  const DEFAULT_SETTINGS = {
    quality: "medium",
    shadows: true,
    brightness: 0.95,
    volume: 0.7,
    mouseSensitivity: 0.002
  };

  let settings = loadSettings();
  window.__keterVolume = settings.volume;
  let coreLoaded = false;
  let sessionStarted = false;
  let pauseRequested = false;
  let originalPlaySound = null;
  let originalInit3DMode = null;
  let overlay;
  let menuPanel;
  let settingsPanel;
  let statusText;
  let vhsAmbient = null;

  function getVhsAmbient() {
    if (!vhsAmbient) {
      vhsAmbient = new Audio("audio/vhs.mp3");
      vhsAmbient.loop = true;
      vhsAmbient.preload = "auto";
      vhsAmbient.volume = Math.min(1, settings.volume * 0.18);
    }
    return vhsAmbient;
  }

  function startVhsAmbient() {
    try {
      const audio = getVhsAmbient();
      audio.volume = Math.min(1, settings.volume * 0.18);
      if (settings.volume <= 0) {
        audio.pause();
        return;
      }
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch (error) {
      console.warn("[KETER] Не удалось запустить VHS-аудио:", error);
    }
  }

  function pauseVhsAmbient() {
    if (vhsAmbient) vhsAmbient.pause();
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(SETTINGS_KEY) || "{}"
      );

      const merged = { ...DEFAULT_SETTINGS, ...saved };

      if (!["low", "medium", "high"].includes(merged.quality)) {
        merged.quality = DEFAULT_SETTINGS.quality;
      }

      merged.shadows = Boolean(merged.shadows);
      merged.brightness = clamp(Number(merged.brightness) || DEFAULT_SETTINGS.brightness, 0.65, 1.5);
      merged.volume = clamp(Number(merged.volume) || 0, 0, 1);
      merged.mouseSensitivity = clamp(
        Number(merged.mouseSensitivity) || 0.002,
        0.0005,
        0.006
      );

      return merged;
    } catch (error) {
      console.warn("[KETER] Не удалось прочитать настройки:", error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("[KETER] Не удалось сохранить настройки:", error);
      setStatus("Не удалось сохранить настройки.");
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function el(id) {
    return document.getElementById(id);
  }

  function is3DVisible() {
    const container = el("three-container");
    return !!container && !container.classList.contains("hidden");
  }

  function isPointerLocked() {
    return document.pointerLockElement === document.body;
  }

  function setStatus(message) {
    if (statusText) statusText.textContent = message;
  }

  // --------------------------------------------------
  // ИНТЕРФЕЙС
  // --------------------------------------------------

  function addStyles() {
    if (el("keter-menu-styles")) return;

    const style = document.createElement("style");
    style.id = "keter-menu-styles";
    style.textContent = `
      #keter-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 20px clamp(16px, 3vw, 48px);
        overflow-y: auto;
        color: #dce8df;
        background:
          linear-gradient(90deg, rgba(0,0,0,.42) 0%, rgba(0,0,0,.12) 58%, rgba(0,0,0,.08) 100%),
          url("menu-background.svg") center / cover no-repeat,
          #030506;
        font-family: "Courier New", monospace;
        box-sizing: border-box;
        isolation: isolate;
      }
      #keter-overlay::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: .3;
        background-image:
          repeating-linear-gradient(0deg, rgba(205,224,215,.11) 0 1px, transparent 1px 3px),
          repeating-linear-gradient(0deg, transparent 0 44%, rgba(220,235,228,.035) 44.2% 44.7%, transparent 45% 100%),
          linear-gradient(90deg, rgba(255,25,20,.035), transparent 22% 77%, rgba(30,160,255,.025)),
          linear-gradient(90deg, transparent 0 48%, rgba(255,30,25,.07) 49%, transparent 50% 100%);
        background-size: 100% 4px, 100% 100%, 100% 100%, 100% 100%;
        animation: keter-vhs-jitter 9s steps(1, end) infinite, keter-vhs-tracking 13s linear infinite;
        pointer-events: none;
        mix-blend-mode: screen;
      }
      @keyframes keter-vhs-jitter {
        0%, 76%, 78%, 91%, 93%, 100% { opacity: .24; transform: translateX(0); filter: none; }
        77% { opacity: .42; transform: translateX(3px); filter: saturate(1.5); }
        79% { opacity: .16; transform: translateX(-2px); }
        92% { opacity: .48; transform: translateX(2px); }
        94% { opacity: .12; transform: translateX(-1px); }
      }
      @keyframes keter-vhs-tracking {
        0%, 100% { background-position: 0 0, 0 -120%, 0 0, 0 0; }
        50% { background-position: 0 0, 0 120%, 0 0, 0 0; }
      }
      #keter-overlay {
        filter: saturate(.82) contrast(1.06);
      }
      #keter-overlay .keter-title {
        position: relative;
        text-shadow: 2px 0 rgba(255,30,25,.22), -2px 0 rgba(30,190,255,.14), 0 0 24px rgba(230,20,18,.16);
      }
      #keter-main-menu .keter-title {
        animation: keter-title-flicker 8s steps(1, end) infinite;
      }
      @keyframes keter-title-flicker {
        0%, 72%, 74%, 100% { opacity: 1; transform: translateX(0); }
        73% { opacity: .82; transform: translateX(1px); }
        75% { opacity: .96; transform: translateX(-1px); }
      }
      #keter-overlay::after {
        text-shadow: 1px 0 rgba(255,30,25,.25), -1px 0 rgba(30,190,255,.18);
      }
      @media (prefers-reduced-motion: reduce) {
        #keter-overlay::before, #keter-main-menu .keter-title { animation: none !important; }
      }
      #keter-overlay::after {
        content: "CAM 01 // MAIN ELEVATOR     •     REC 00:00:17     •     INTERNAL USE ONLY";
        position: fixed;
        left: 22px;
        right: 22px;
        bottom: 16px;
        padding-top: 10px;
        border-top: 1px solid rgba(89,125,98,.25);
        color: rgba(112,145,120,.48);
        font-size: 9px;
        letter-spacing: 2px;
        text-align: center;
        pointer-events: none;
      }

      #keter-overlay.keter-hidden {
        display: none !important;
      }

      #keter-overlay * {
        box-sizing: border-box;
      }

      .keter-panel {
        position: relative;
        z-index: 1;
        width: min(100%, 570px);
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        margin-right: auto;
        padding: clamp(22px, 3.5vw, 36px);
        border: 1px solid rgba(106,139,120,.48);
        background:
          linear-gradient(135deg, rgba(3,7,7,.96), rgba(3,6,7,.86) 72%),
          #050708;
        -webkit-backdrop-filter: blur(3px);
        backdrop-filter: blur(3px);
        box-shadow: 0 32px 100px rgba(0,0,0,.84), 0 0 0 1px rgba(120,170,130,.035), 0 0 38px rgba(255,25,18,.055);
        overflow-x: hidden;
      }
      .keter-panel::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, #ff463f 0 3%, #6bff9b 3% 20%, #17271c 20% 100%);
        box-shadow: 0 0 14px rgba(255,45,40,.22);
      }
      .keter-panel::after {
        content: "D-12 / SEC-03";
        position: absolute;
        top: 14px;
        right: 18px;
        color: #536b59;
        font-size: 9px;
        letter-spacing: 1.5px;
      }
      #keter-main-menu { min-height: 0; }
      #keter-main-menu .keter-title {
        color: #f0f3ee;
        text-shadow: 2px 0 rgba(255,30,25,.2), -2px 0 rgba(30,190,255,.12), 0 0 22px rgba(230,20,18,.13);
        letter-spacing: .075em;
      }
      #keter-main-menu .keter-divider { background: linear-gradient(90deg, #71302c, #2b3b32 55%, transparent); }
      #keter-main-menu .keter-button { border-color: rgba(115,145,130,.42); background: rgba(0,0,0,.34); }
      #keter-main-menu .keter-button.primary { background: rgba(120,255,158,.92); border-color: #8affaa; }
      @media (max-width: 720px) {
        #keter-overlay { justify-content: center; padding: 12px; background-position: 63% center; }
        .keter-panel { margin: auto; max-height: calc(100vh - 24px); }
        #keter-main-menu .keter-title { font-size: clamp(38px, 11vw, 54px); }
      }
      @media (prefers-reduced-motion: reduce) {
        #keter-overlay::before, #keter-main-menu .keter-eyebrow::before { animation: none !important; }
      }
      #keter-main-menu .keter-eyebrow::before {
        content: "● LIVE ";
        color: #ff5149;
        letter-spacing: 1px;
        animation: keter-alarm 1.8s steps(2, end) infinite;
      }
      @keyframes keter-alarm {
        50% { opacity: .28; }
      }
      .keter-alert-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 2px 0 18px;
        padding: 10px 12px;
        color: #d9a39a;
        border: 1px solid rgba(159,59,50,.38);
        border-left: 3px solid #a73a32;
        background: linear-gradient(90deg, rgba(83,20,18,.25), rgba(8,12,9,.4));
        font-size: 10px;
        line-height: 1.5;
        letter-spacing: .7px;
      }
      .keter-alert-banner b { color: #ff8174; font-weight: 700; }
      .keter-terminal-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 18px;
        padding-top: 12px;
        border-top: 1px solid #1b2b20;
        color: #526b58;
        font-size: 9px;
        letter-spacing: .7px;
      }
      #keter-main-menu .keter-title {
        font-size: clamp(42px, 8vw, 64px);
        letter-spacing: 4px;
        margin-top: 8px;
      }
      #keter-main-menu .keter-subtitle {
        max-width: 46ch;
      }
      .keter-status-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin: 8px 0 22px;
      }
      .keter-status-cell {
        min-width: 0;
        padding: 10px 9px;
        border: 1px solid #263d2d;
        background: rgba(0,0,0,.24);
      }
      .keter-status-cell span {
        display: block;
        margin-bottom: 6px;
        color: #829887;
        font-size: 9px;
        letter-spacing: 1.4px;
      }
      .keter-status-cell b {
        display: block;
        color: #a9f9bc;
        font-size: 10px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      .keter-status-cell b.warning { color: #ffb66e; }
      .keter-controls { padding-top: 2px; font-size: 10px; }

      .keter-eyebrow {
        color: #6bff9b;
        font-size: 11px;
        letter-spacing: 3px;
        margin-bottom: 12px;
      }

      .keter-title {
        color: #eaffee;
        font-size: clamp(30px, 7vw, 48px);
        font-weight: 900;
        letter-spacing: 3px;
        line-height: 1.1;
        margin: 0 0 8px;
        text-shadow: 0 0 18px rgba(0,255,100,.16);
      }

      .keter-subtitle {
        color: #91a998;
        font-size: 12px;
        line-height: 1.7;
        margin-bottom: 26px;
      }

      .keter-divider {
        height: 1px;
        background: #284431;
        margin: 20px 0;
      }

      .keter-button {
        display: block;
        width: 100%;
        min-height: 46px;
        margin-top: 10px;
        padding: 12px 15px;
        color: #dcebe0;
        text-align: left;
        font: inherit;
        font-size: 13px;
        letter-spacing: .5px;
        border: 1px solid #304438;
        background: linear-gradient(100deg, rgba(15,25,18,.96), rgba(5,10,7,.96));
        cursor: pointer;
        position: relative;
        transition: background .18s, border-color .18s, color .18s, transform .18s;
        box-shadow: inset 3px 0 0 rgba(0,0,0,0);
      }

      .keter-button:hover,
      .keter-button:focus-visible {
        color: #8dffad;
        border-color: #69ff91;
        background: linear-gradient(100deg, #14291a, #08110b);
        outline: none;
        transform: translateX(2px);
        box-shadow: inset 3px 0 0 #69ff91;
      }

      .keter-button.primary {
        color: #09130c;
        font-weight: bold;
        border-color: #79ff9e;
        background: #79ff9e;
      }

      .keter-button.primary:hover {
        background: #a0ffba;
      }

      .keter-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin: 20px 0 8px;
        color: #d7e5db;
        font-size: 13px;
      }

      .keter-label output {
        color: #76ff9b;
      }

      .keter-select,
      .keter-range {
        width: 100%;
        accent-color: #71ff98;
      }

      .keter-select {
        padding: 10px;
        color: #e6eee8;
        border: 1px solid #304438;
        background: #101a13;
        font: inherit;
      }

      .keter-range {
        cursor: pointer;
      }

      .keter-check {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 18px;
        color: #d7e5db;
        font-size: 13px;
      }

      .keter-check input {
        width: 17px;
        height: 17px;
        accent-color: #71ff98;
      }

      .keter-status {
        min-height: 18px;
        margin-top: 18px;
        color: #829887;
        font-size: 11px;
        line-height: 1.5;
      }

      .keter-footnote {
        margin-top: 22px;
        color: #586c5d;
        font-size: 10px;
        line-height: 1.6;
      }

      @media (max-width: 480px) {
        #keter-overlay { padding: 10px 10px 40px; }
        #keter-overlay::after { left: 10px; right: 10px; bottom: 5px; font-size: 7px; }
        .keter-panel { padding: 26px 18px 22px; }
        .keter-panel::after { top: 10px; right: 10px; font-size: 8px; }
        .keter-terminal-footer { flex-direction: column; gap: 5px; }
        .keter-status-strip { grid-template-columns: 1fr; }
        .keter-status-cell { display: flex; justify-content: space-between; gap: 12px; }
        .keter-status-cell span { margin: 0; }
        #keter-main-menu .keter-title { letter-spacing: 2px; }
      }
    `;

    document.head.appendChild(style);
  }

  function makeButton(label, callback, primary = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "keter-button" + (primary ? " primary" : "");
    button.textContent = label;
    button.addEventListener("click", () => {
      playUiSound();
      callback();
    });
    return button;
  }

  function makePanel(id, eyebrow, title, subtitle) {
    const panel = document.createElement("section");
    panel.id = id;
    panel.className = "keter-panel";

    const eye = document.createElement("div");
    eye.className = "keter-eyebrow";
    eye.textContent = eyebrow;

    const heading = document.createElement("h1");
    heading.className = "keter-title";
    heading.textContent = title;

    const sub = document.createElement("div");
    sub.className = "keter-subtitle";
    sub.textContent = subtitle;

    panel.append(eye, heading, sub);
    return panel;
  }

  function showPanel(panel) {
    menuPanel.hidden = panel !== menuPanel;
    settingsPanel.hidden = panel !== settingsPanel;
  }

  function showOverlay(panel) {
    showPanel(panel);
    overlay.classList.remove("keter-hidden");
  }

  function hideOverlay() {
    overlay.classList.add("keter-hidden");
  }

  function createMenu() {
    addStyles();

    overlay = document.createElement("div");
    overlay.id = "keter-overlay";
    overlay.className = "keter-hidden";

    menuPanel = makePanel(
      "keter-main-menu",
      "SCP FOUNDATION  /  INTERNAL TERMINAL  /  D-12",
      "PROJECT: KETER",
      "СИСТЕМА СДЕРЖИВАНИЯ НЕСТАБИЛЬНА. СВЯЗЬ С ПОВЕРХНОСТЬЮ ПОТЕРЯНА."
    );

    const statusStrip = document.createElement("div");
    statusStrip.className = "keter-status-strip";
    [
      ["СИСТЕМА", "АВАРИЙНАЯ", "warning"],
      ["СЕКТОР", "D-12", ""],
      ["ДОПУСК", "НЕ ПОДТВЕРЖДЁН", "warning"]
    ].forEach(([label, value, state]) => {
      const item = document.createElement("div");
      item.className = "keter-status-cell";
      const small = document.createElement("span");
      small.textContent = label;
      const strong = document.createElement("b");
      strong.textContent = value;
      if (state) strong.classList.add(state);
      item.append(small, strong);
      statusStrip.appendChild(item);
    });
    menuPanel.appendChild(statusStrip);

    const alertBanner = document.createElement("div");
    alertBanner.className = "keter-alert-banner";
    alertBanner.innerHTML = "<b>! АВАРИЙНЫЙ ПРОТОКОЛ</b><span>Внутренняя сеть недоступна. Последний пакет данных получен 00:17:43 назад.</span>";
    menuPanel.appendChild(alertBanner);

    menuPanel.appendChild(
      makeButton("▶  НАЧАТЬ / ПРОДОЛЖИТЬ", startOrContinue, true)
    );

    menuPanel.appendChild(
      makeButton("＋  НОВАЯ ИГРА", newGame)
    );

    menuPanel.appendChild(
      makeButton("▤  ДОСЬЕ КЛЮЧЕВЫХ СОТРУДНИКОВ", () => {
        hideOverlay();
        sessionStarted = true;
        if (typeof renderChapter === "function") renderChapter("PERSONNEL_DOSSIER");
      })
    );

    menuPanel.appendChild(
      makeButton("⚙  НАСТРОЙКИ", () => {
        showOverlay(settingsPanel);
      })
    );

    const divider = document.createElement("div");
    divider.className = "keter-divider";
    menuPanel.appendChild(divider);

    const help = document.createElement("div");
    help.className = "keter-subtitle keter-controls";
    help.textContent =
      "УПРАВЛЕНИЕ: WASD — движение · SHIFT — бег · F — фонарь · E — взаимодействие · ESC — пауза";
    menuPanel.appendChild(help);

    const terminalFooter = document.createElement("div");
    terminalFooter.className = "keter-terminal-footer";
    const footerLeft = document.createElement("span");
    footerLeft.textContent = "INCIDENT D-12 / FILE 07-44";
    const footerRight = document.createElement("span");
    footerRight.textContent = "СИНХРОНИЗАЦИЯ: НЕТ";
    terminalFooter.append(footerLeft, footerRight);
    menuPanel.appendChild(terminalFooter);

    settingsPanel = makePanel(
      "keter-settings",
      "SYSTEM CONFIGURATION",
      "НАСТРОЙКИ",
      "Параметры сохраняются на этом устройстве."
    );
    settingsPanel.hidden = true;

    createSettingsControls();

    settingsPanel.appendChild(
      makeButton("↩  НАЗАД", () => {
        showOverlay(menuPanel);
      })
    );

    const reset = makeButton("СБРОСИТЬ НАСТРОЙКИ", resetSettings);
    settingsPanel.appendChild(reset);

    statusText = document.createElement("div");
    statusText.className = "keter-status";
    settingsPanel.appendChild(statusText);

    const footnote = document.createElement("div");
    footnote.className = "keter-footnote";
    footnote.textContent =
      "Изменение качества может повлиять на производительность. " +
      "При выходе в игру настройки применяются автоматически.";
    settingsPanel.appendChild(footnote);

    overlay.append(menuPanel, settingsPanel);
    document.body.appendChild(overlay);
  }

  function createSettingsControls() {
    const qualityLabel = document.createElement("label");
    qualityLabel.className = "keter-label";
    qualityLabel.htmlFor = "keter-quality";
    qualityLabel.textContent = "Качество графики";

    const quality = document.createElement("select");
    quality.id = "keter-quality";
    quality.className = "keter-select";

    [
      ["low", "Низкое — для слабых ПК"],
      ["medium", "Среднее — баланс"],
      ["high", "Высокое — качество"]
    ].forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      quality.appendChild(option);
    });

    quality.value = settings.quality;
    quality.addEventListener("change", () => {
      settings.quality = quality.value;
      saveSettings();
      applyGraphicsSettings();
      setStatus("Качество графики обновлено.");
    });

    settingsPanel.append(qualityLabel, quality);

    const shadowLabel = document.createElement("label");
    shadowLabel.className = "keter-check";

    const shadow = document.createElement("input");
    shadow.type = "checkbox";
    shadow.checked = settings.shadows;
    shadow.addEventListener("change", () => {
      settings.shadows = shadow.checked;
      saveSettings();
      applyGraphicsSettings();
      setStatus("Настройка теней обновлена.");
    });

    const shadowText = document.createElement("span");
    shadowText.textContent = "Динамические тени";

    shadowLabel.append(shadow, shadowText);
    settingsPanel.appendChild(shadowLabel);

    addRangeSetting({
      id: "keter-brightness",
      title: "Экспозиция",
      min: 0.7,
      max: 2,
      step: 0.05,
      value: settings.brightness,
      format: value => Number(value).toFixed(2),
      onChange: value => {
        settings.brightness = Number(value);
        saveSettings();
        applyGraphicsSettings();
      }
    });

    addRangeSetting({
      id: "keter-volume",
      title: "Громкость звуков",
      min: 0,
      max: 1,
      step: 0.05,
      value: settings.volume,
      format: value => `${Math.round(Number(value) * 100)}%`,
      onChange: value => {
        settings.volume = Number(value);
        window.__keterVolume = settings.volume;
        saveSettings();

        if (vhsAmbient) {
          vhsAmbient.volume = Math.min(1, settings.volume * 0.18);
          if (settings.volume <= 0) {
            pauseVhsAmbient();
          } else if (isPointerLocked() && is3DVisible()) {
            startVhsAmbient();
          }
        }
      }
    });

    addRangeSetting({
      id: "keter-sensitivity",
      title: "Чувствительность мыши",
      min: 0.0005,
      max: 0.006,
      step: 0.0001,
      value: settings.mouseSensitivity,
      format: value => `${(Number(value) / 0.002).toFixed(1)}×`,
      onChange: value => {
        settings.mouseSensitivity = Number(value);
        saveSettings();
      }
    });
  }

  function addRangeSetting({
    id, title, min, max, step, value, format, onChange
  }) {
    const label = document.createElement("label");
    label.className = "keter-label";
    label.htmlFor = id;

    const name = document.createElement("span");
    name.textContent = title;

    const output = document.createElement("output");
    output.textContent = format(value);

    label.append(name, output);

    const range = document.createElement("input");
    range.id = id;
    range.className = "keter-range";
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(value);

    range.addEventListener("input", () => {
      output.textContent = format(range.value);
      onChange(range.value);
    });

    settingsPanel.append(label, range);
  }

  // --------------------------------------------------
  // ЗВУК И ГРАФИКА
  // --------------------------------------------------

  function playUiSound() {
    if (!coreLoaded || settings.volume <= 0) return;
    try {
      playSound("click");
    } catch (error) {
      // Не блокируем меню, если Web Audio недоступен.
    }
  }

  function applyGraphicsSettings() {
    if (!coreLoaded) return;

    try {
      if (typeof renderer === "undefined" || !renderer) return;

      const profile = {
        low: { pixelRatio: 1, shadows: false },
        medium: { pixelRatio: 1.5, shadows: true },
        high: { pixelRatio: 2, shadows: true }
      }[settings.quality];

      const ratio = Math.min(
        window.devicePixelRatio || 1,
        profile.pixelRatio
      );

      renderer.setPixelRatio(ratio);
      renderer.setSize(window.innerWidth, window.innerHeight);

      renderer.shadowMap.enabled =
        settings.shadows && profile.shadows;

      if (typeof flashlight !== "undefined" && flashlight) {
        flashlight.castShadow = renderer.shadowMap.enabled;
        flashlight.shadow.needsUpdate = true;
      }

      renderer.toneMappingExposure = settings.brightness * 0.76;

      const container = el("three-container");
      if (container) {
        // Связываем ползунок экспозиции и с постобработочным фильтром,
        // чтобы настройка была заметна даже в затемнённой VHS-сцене.
        const displayBrightness = clamp(settings.brightness / 0.95 * 0.78, 0.55, 1.25);
        container.style.filter =
          `contrast(1.16) brightness(${displayBrightness.toFixed(2)}) sepia(0.18) saturate(0.58)`;
      }
    } catch (error) {
      console.warn("[KETER] Не удалось применить графику:", error);
    }
  }

  function resetSettings() {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();

    const quality = el("keter-quality");
    if (quality) quality.value = settings.quality;

    const shadow = settingsPanel.querySelector(
      "#keter-settings input[type='checkbox']"
    );
    if (shadow) shadow.checked = settings.shadows;

    const brightness = el("keter-brightness");
    if (brightness) {
      brightness.value = String(settings.brightness);
      brightness.previousElementSibling?.querySelector("output");
    }

    const volume = el("keter-volume");
    if (volume) volume.value = String(settings.volume);

    const sensitivity = el("keter-sensitivity");
    if (sensitivity) sensitivity.value = String(settings.mouseSensitivity);

    // Синхронизируем громкость фонового VHS после сброса настроек.
    window.__keterVolume = settings.volume;
    if (vhsAmbient) {
      vhsAmbient.volume = Math.min(1, settings.volume * 0.18);
      if (settings.volume <= 0) pauseVhsAmbient();
    }

    // Обновляем подписи слайдеров.
    [
      ["keter-brightness", v => Number(v).toFixed(2)],
      ["keter-volume", v => `${Math.round(Number(v) * 100)}%`],
      ["keter-sensitivity", v => `${(Number(v) / 0.002).toFixed(1)}×`]
    ].forEach(([id, format]) => {
      const input = el(id);
      if (input) {
        const output = input.previousElementSibling?.querySelector("output");
        if (output) output.textContent = format(input.value);
      }
    });

    applyGraphicsSettings();
    setStatus("Настройки сброшены.");
  }

  // --------------------------------------------------
  // СОХРАНЕНИЕ СУЩЕСТВУЮЩЕГО ИГРОВОГО ЯДРА
  // --------------------------------------------------

  function startOrContinue() {
    hideOverlay();

    if (!sessionStarted) {
      sessionStarted = true;
      window.__keterPaused = false;
      if (typeof renderChapter === "function") {
        renderChapter(1);
      }
    } else if (is3DVisible()) {
      // Захват мыши должен быть вызван действием пользователя.
      try {
        const request = document.body.requestPointerLock();
        if (request && typeof request.catch === "function") {
          request.catch(() => {
            window.__keterPaused = true;
            showOverlay(menuPanel);
            setStatus("Не удалось захватить мышь. Нажмите, чтобы повторить.");
          });
        }
      } catch (error) {
        window.__keterPaused = true;
        showOverlay(menuPanel);
        setStatus("Не удалось захватить мышь. Нажмите, чтобы повторить.");
      }
    } else {
      window.__keterPaused = false;
      if (typeof renderChapter === "function") {
        renderChapter(1);
      }
    }
  }

  function newGame() {
    pauseRequested = false;
    pauseVhsAmbient();
    window.__keterPaused = true;
    moveForward = moveBackward = moveLeft = moveRight = isSprinting = false;

    // Если 3D-мир уже создавался, полный перезапуск сбросит также двери,
    // позицию игрока, фонарь и собранные объекты, не только сюжет.
    if (initialized) {
      try {
        sessionStorage.setItem("keter-start-fresh", "1");
        window.location.reload();
        return;
      } catch (error) {
        console.warn("[KETER] Не удалось перезапустить игру полностью:", error);
      }
    }

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const three = el("three-container");
    const textGame = el("text-game");
    if (three) three.classList.add("hidden");
    if (textGame) textGame.classList.remove("hidden");

    sessionStarted = true;
    if (typeof renderChapter === "function") {
      renderChapter("RESET");
    }

    window.__keterPaused = false;
    hideOverlay();
    setStatus("Новая игра началась.");
  }

  function returnToMainMenu() {
    pauseRequested = false;
    pauseVhsAmbient();
    window.__keterPaused = true;
    moveForward = moveBackward = moveLeft = moveRight = isSprinting = false;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const three = el("three-container");
    const textGame = el("text-game");

    if (three) three.classList.add("hidden");
    if (textGame) textGame.classList.remove("hidden");

    if (typeof renderChapter === "function") {
      renderChapter(1);
    }

    showOverlay(menuPanel);
    setStatus("Главное меню.");
  }

  function openPauseMenu() {
    if (!is3DVisible()) return;
    pauseRequested = true;
    pauseVhsAmbient();
    window.__keterPaused = true;
    moveForward = moveBackward = moveLeft = moveRight = isSprinting = false;
    showOverlay(menuPanel);
    setStatus("Игра приостановлена. Нажмите «Начать / продолжить», чтобы вернуться.");
  }

  function installCoreHooks() {
    if (typeof init3DMode !== "function") {
      console.error("[KETER] Не найдена функция init3DMode().");
      return;
    }

    // Сохраняем исходную инициализацию карты.
    originalInit3DMode = init3DMode;

    init3DMode = function () {
      originalInit3DMode();
      applyGraphicsSettings();
      startVhsAmbient();
    };

    // Применяем чувствительность мыши, не меняя механику камеры.
    if (typeof onMouseMove === "function") {
      document.removeEventListener("mousemove", onMouseMove);

      document.addEventListener("mousemove", function (event) {
        if (!isPointerLocked()) return;

        if (typeof camera === "undefined" || !camera) return;

        camera.rotation.y -=
          event.movementX * settings.mouseSensitivity;

        camera.rotation.x -=
          event.movementY * settings.mouseSensitivity;

        camera.rotation.x = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, camera.rotation.x)
        );
      });
    }

    // Масштабируем громкость процедурных звуков, не меняя их тембр.
    if (typeof playSound === "function" && typeof SOUNDS !== "undefined") {
      originalPlaySound = playSound;

      playSound = function (name) {
        if (settings.volume <= 0) return;

        if (name === "deny") {
          try {
            const glitch = new Audio("audio/glitch.mp3");
            glitch.volume = Math.min(1, settings.volume * 0.25);
            const glitchPromise = glitch.play();
            if (glitchPromise && typeof glitchPromise.catch === "function") {
              glitchPromise.catch(() => {});
            }
          } catch (error) {
            // Звук отказа Web Audio остаётся резервным вариантом.
          }
        }

        const sound = SOUNDS[name];
        if (!sound) return originalPlaySound(name);

        const oldVolume = sound.vol;
        sound.vol = oldVolume * settings.volume;

        try {
          originalPlaySound(name);
        } finally {
          sound.vol = oldVolume;
        }
      };
    }

    applyGraphicsSettings();
  }

  // --------------------------------------------------
  // СОБЫТИЯ МЕНЮ И УКАЗАТЕЛЯ
  // --------------------------------------------------

  function installEvents() {
    // Browsers block autoplay until a real user gesture. Start the quiet VHS
    // tape hiss on the first interaction with the menu, then keep it looping.
    document.addEventListener("pointerdown", () => {
      if (!isPointerLocked() && settings.volume > 0) startVhsAmbient();
    }, { passive: true });

    document.addEventListener("keydown", event => {
      if ((event.code === "Enter" || event.code === "Space") &&
          !isPointerLocked() && settings.volume > 0) {
        startVhsAmbient();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      if (isPointerLocked()) {
        pauseRequested = false;
        window.__keterPaused = false;
        startVhsAmbient();
        hideOverlay();
        return;
      }

      // Потеря захвата мыши в 3D переводит игру на паузу.
      if (sessionStarted && is3DVisible()) {
        window.__keterPaused = true;
        pauseVhsAmbient();
        moveForward = moveBackward = moveLeft = moveRight = isSprinting = false;
        showOverlay(menuPanel);
        setStatus("Пауза");
      }
    });

    document.addEventListener("keydown", event => {
      if (event.code !== "Escape") return;

      if (is3DVisible()) {
        event.preventDefault();
        openPauseMenu();
      }
    });

    window.addEventListener("blur", () => {
      if (is3DVisible() && sessionStarted) {
        // Не вызываем Pointer Lock автоматически при возвращении.
        window.__keterPaused = true;
        pauseVhsAmbient();
        moveForward = moveBackward = moveLeft = moveRight = isSprinting = false;
        showOverlay(menuPanel);
        setStatus("Окно потеряло фокус. Нажмите «Начать / продолжить».");
      }
    });

    window.addEventListener("resize", () => {
      if (!coreLoaded) return;

      try {
        if (typeof camera !== "undefined" && camera) {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
        }
        applyGraphicsSettings();
      } catch (error) {
        console.warn("[KETER] Ошибка изменения размера:", error);
      }
    });
  }

  // --------------------------------------------------
  // ЗАПУСК ОБЪЕДИНЁННОГО ФАЙЛА
  // --------------------------------------------------

  function boot() {
    coreLoaded = true;
    createMenu();
    installCoreHooks();
    installEvents();
    applyGraphicsSettings();

    let startFresh = false;
    try {
      startFresh = sessionStorage.getItem("keter-start-fresh") === "1";
      if (startFresh) sessionStorage.removeItem("keter-start-fresh");
    } catch (error) {
      // Если хранилище недоступно, обычное меню всё равно работает.
    }

    if (startFresh && typeof renderChapter === "function") {
      sessionStarted = true;
      window.__keterPaused = false;
      renderChapter(1);
      hideOverlay();
      setStatus("Новая игра началась.");
    } else {
      showOverlay(menuPanel);
      setStatus("Система готова.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
