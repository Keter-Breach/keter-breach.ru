
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
    brightness: 1.3,
    volume: 0.7,
    mouseSensitivity: 0.002
  };

  let settings = loadSettings();
  let coreLoaded = false;
  let sessionStarted = false;
  let pauseRequested = false;
  let originalPlaySound = null;
  let originalInit3DMode = null;
  let overlay;
  let menuPanel;
  let settingsPanel;
  let statusText;

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
      merged.brightness = clamp(Number(merged.brightness) || 1.3, 0.7, 2);
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
        justify-content: center;
        padding: 20px;
        overflow-y: auto;
        color: #e6eee8;
        background:
          linear-gradient(rgba(3,8,5,.84), rgba(3,8,5,.94)),
          repeating-linear-gradient(
            0deg,
            transparent 0 3px,
            rgba(0,255,100,.025) 3px 4px
          );
        font-family: "Courier New", monospace;
        box-sizing: border-box;
      }

      #keter-overlay.keter-hidden {
        display: none !important;
      }

      #keter-overlay * {
        box-sizing: border-box;
      }

      .keter-panel {
        width: min(100%, 560px);
        padding: clamp(22px, 5vw, 42px);
        border: 1px solid #386044;
        background: rgba(8, 15, 10, .97);
        box-shadow: 0 0 55px rgba(0, 255, 100, .08);
      }

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
        background: #101a13;
        cursor: pointer;
        transition: background .15s, border-color .15s, color .15s;
      }

      .keter-button:hover,
      .keter-button:focus-visible {
        color: #8dffad;
        border-color: #69ff91;
        background: #17271b;
        outline: none;
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
        #keter-overlay { padding: 10px; }
        .keter-panel { padding: 22px; }
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
      "SCP FOUNDATION  /  SECTOR D-12",
      "PROJECT: KETER",
      "CONTAINMENT FAILURE // INCIDENT 12-D"
    );

    menuPanel.appendChild(
      makeButton("▶  НАЧАТЬ / ПРОДОЛЖИТЬ", startOrContinue, true)
    );

    menuPanel.appendChild(
      makeButton("＋  НОВАЯ ИГРА", newGame)
    );

    menuPanel.appendChild(
      makeButton("⚙  НАСТРОЙКИ ГРАФИКИ", () => {
        showOverlay(settingsPanel);
      })
    );

    menuPanel.appendChild(
      makeButton("↩  ВЕРНУТЬСЯ К СЮЖЕТУ", () => {
        hideOverlay();
      })
    );

    const divider = document.createElement("div");
    divider.className = "keter-divider";
    menuPanel.appendChild(divider);

    const help = document.createElement("div");
    help.className = "keter-subtitle";
    help.textContent =
      "WASD — движение · SHIFT — бег · F — фонарь · E — взаимодействие · ESC — меню";
    menuPanel.appendChild(help);

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
        saveSettings();
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

      renderer.toneMappingExposure = settings.brightness;

      const container = el("three-container");
      if (container) {
        container.style.filter =
          "contrast(1.3) brightness(0.85) sepia(0.2) saturate(0.8)";
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
      if (typeof renderChapter === "function") {
        renderChapter(1);
      }
    } else if (is3DVisible()) {
      // Захват мыши должен быть вызван действием пользователя.
      try {
        document.body.requestPointerLock();
      } catch (error) {
        showOverlay(menuPanel);
      }
    } else {
      if (typeof renderChapter === "function") {
        renderChapter(1);
      }
    }
  }

  function newGame() {
    hideOverlay();
    sessionStarted = true;

    if (typeof renderChapter === "function") {
      renderChapter("RESET");
    }
  }

  function returnToMainMenu() {
    pauseRequested = false;

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
  }

  function openPauseMenu() {
    if (!is3DVisible()) return;
    pauseRequested = true;
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
    document.addEventListener("pointerlockchange", () => {
      if (isPointerLocked()) {
        pauseRequested = false;
        hideOverlay();
        return;
      }

      // Если мышь отпущена во время 3D-игры, показываем паузу.
      if (sessionStarted && is3DVisible()) {
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
  // ЗАГРУЗКА ОРИГИНАЛЬНОЙ ИГРЫ
  // --------------------------------------------------

  function loadGameCore() {
    const script = document.createElement("script");
    script.src = "game-core.js";
    script.async = false;

    script.onload = () => {
      coreLoaded = true;

      try {
        installCoreHooks();
        installEvents();

        // Оригинальное ядро показывает главу 1 при загрузке.
        // Поверх неё открываем новое главное меню.
        showOverlay(menuPanel);
        setStatus("Система готова.");
      } catch (error) {
        console.error("[KETER] Ошибка подключения интерфейса:", error);
        showOverlay(menuPanel);
        setStatus("Меню загружено, но часть настроек не подключилась.");
      }
    };

    script.onerror = () => {
      console.error(
        "[KETER] Не удалось загрузить game-core.js. Проверьте имя и путь файла."
      );

      showOverlay(menuPanel);
      setStatus(
        "ОШИБКА: не найден game-core.js. Проверьте расположение файла."
      );
    };

    document.body.appendChild(script);
  }

  function boot() {
    createMenu();
    loadGameCore();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

