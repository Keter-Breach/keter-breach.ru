/* PROJECT: KETER — mobile touch controls. */
(function installKeterTouchControls() {
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const touchPoints = Number(navigator.maxTouchPoints || 0) > 0;
  const small = Math.min(window.innerWidth, window.innerHeight) <= 900;
  if (!coarse && !touchPoints && !small) return;
  const game = document.getElementById("three-container");
  if (!game) return;
  const root = document.createElement("div");
  root.id = "keter-touch-ui";
  root.setAttribute("aria-label", "Сенсорное управление");
  root.innerHTML = '<div class="keter-look-zone" aria-hidden="true"></div>' +
    '<div class="keter-touch-stick" aria-label="Движение"><div class="keter-stick-knob"></div></div>' +
    '<div class="keter-touch-actions">' +
    '<button type="button" data-action="sprint" aria-label="Бег">БЕГ</button>' +
    '<button type="button" data-action="flashlight" aria-label="Фонарик">СВЕТ</button>' +
    '<button type="button" data-action="interact" aria-label="Взаимодействие">E</button>' +
    '<button type="button" data-action="pause" aria-label="Пауза">Ⅱ</button></div>' +
    '<div class="keter-rotate-hint">ДЛЯ ЛУЧШЕГО ОБЗОРА ПОВЕРНИТЕ УСТРОЙСТВО</div>';
  game.appendChild(root);
  const stick = root.querySelector(".keter-touch-stick");
  const knob = root.querySelector(".keter-stick-knob");
  const lookZone = root.querySelector(".keter-look-zone");
  const buttons = root.querySelectorAll("[data-action]");
  const state = { stickId: null, lookId: null, sprintId: null, x: 0, y: 0, lastX: 0, lastY: 0 };
  const tutorial = document.createElement("div");
  tutorial.className = "keter-tutorial-subtitle";
  tutorial.setAttribute("role", "status");
  tutorial.setAttribute("aria-live", "polite");
  tutorial.innerHTML = '<span class="keter-tutorial-kicker">ОБУЧЕНИЕ // D-12</span><span class="keter-tutorial-copy"></span><button type="button" class="keter-tutorial-skip">ПРОПУСТИТЬ ×</button>';
  root.appendChild(tutorial);
  const tutorialCopy = tutorial.querySelector(".keter-tutorial-copy");
  const tutorialSkip = tutorial.querySelector(".keter-tutorial-skip");
  const tutorialSteps = [
    "ЛЕВЫЙ ДЖОЙСТИК — двигайтесь по комплексу.",
    "ПРАВАЯ ЧАСТЬ ЭКРАНА — проводите пальцем, чтобы осмотреться.",
    "БЕГ — удерживайте кнопку, чтобы ускориться.",
    "СВЕТ — включайте и выключайте фонарь. Заряд ограничен.",
    "E — взаимодействуйте с дверями, терминалами и предметами. Ⅱ — пауза."
  ];
  let tutorialStarted = false;
  let tutorialTimer = 0;
  function finishTutorial() {
    window.clearTimeout(tutorialTimer);
    tutorial.classList.remove("is-visible");
    try { localStorage.setItem("keter-mobile-tutorial-v2", "seen"); } catch (_) {}
  }
  function startTutorial() {
    if (tutorialStarted) return;
    tutorialStarted = true;
    try { if (localStorage.getItem("keter-mobile-tutorial-v2") === "seen") return; } catch (_) {}
    let step = 0;
    const next = () => {
      if (step >= tutorialSteps.length) return finishTutorial();
      tutorialCopy.textContent = tutorialSteps[step++];
      tutorial.classList.add("is-visible");
      tutorialTimer = window.setTimeout(next, 3600);
    };
    tutorialTimer = window.setTimeout(next, 900);
  }
  tutorialSkip.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    finishTutorial();
  });
  const radius = 43;
  function activeGame() { return !game.classList.contains("hidden") && !window.__keterPaused; }
  function setMovement(x, y) {
    const dead = 0.18;
    moveForward = y < -dead; moveBackward = y > dead;
    moveLeft = x < -dead; moveRight = x > dead;
  }
  function resetStick() {
    state.stickId = null; state.x = state.y = 0;
    knob.style.transform = "translate(0, 0)"; setMovement(0, 0);
  }
  function updateStick(event) {
    if (event.pointerId !== state.stickId) return;
    const rect = stick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy) || 1, scale = Math.min(1, radius / length);
    state.x = dx * scale / radius; state.y = dy * scale / radius;
    knob.style.transform = "translate(" + (dx * scale) + "px, " + (dy * scale) + "px)";
    setMovement(state.x, state.y);
  }
  stick.addEventListener("pointerdown", event => {
    if (!activeGame() || state.stickId !== null) return;
    event.preventDefault(); state.stickId = event.pointerId;
    stick.setPointerCapture(event.pointerId); updateStick(event);
  });
  stick.addEventListener("pointermove", updateStick);
  stick.addEventListener("pointerup", event => { if (event.pointerId === state.stickId) resetStick(); });
  stick.addEventListener("pointercancel", resetStick);
  lookZone.addEventListener("pointerdown", event => {
    if (!activeGame() || state.lookId !== null) return;
    event.preventDefault(); state.lookId = event.pointerId;
    state.lastX = event.clientX; state.lastY = event.clientY;
    lookZone.setPointerCapture(event.pointerId);
  });
  lookZone.addEventListener("pointermove", event => {
    if (event.pointerId !== state.lookId || !activeGame() || typeof camera === "undefined" || !camera) return;
    event.preventDefault();
    const dx = event.clientX - state.lastX, dy = event.clientY - state.lastY;
    state.lastX = event.clientX; state.lastY = event.clientY;
    camera.rotation.y -= dx * 0.0042; camera.rotation.x -= dy * 0.0042;
    camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, camera.rotation.x));
  });
  function resetLook(event) { if (!event || event.pointerId === state.lookId) state.lookId = null; }
  lookZone.addEventListener("pointerup", resetLook);
  lookZone.addEventListener("pointercancel", resetLook);
  function action(name, pressed) {
    if (name === "sprint") { isSprinting = pressed; return; }
    if (!pressed || !activeGame()) return;
    if (name === "flashlight" && typeof toggleFlashlight === "function") toggleFlashlight();
    if (name === "interact" && typeof interact3D === "function") interact3D();
    if (name === "pause") document.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", key: "Escape", bubbles: true }));
  }
  buttons.forEach(button => {
    const name = button.dataset.action;
    if (name === "sprint") {
      button.addEventListener("pointerdown", event => {
        if (!activeGame()) return;
        event.preventDefault(); state.sprintId = event.pointerId;
        button.setPointerCapture(event.pointerId); action(name, true);
      });
      const stop = event => {
        if (state.sprintId === null || (event && event.pointerId !== state.sprintId)) return;
        state.sprintId = null; action(name, false);
      };
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("lostpointercapture", stop);
    } else button.addEventListener("pointerdown", event => { event.preventDefault(); action(name, true); });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { resetStick(); state.lookId = null; isSprinting = false; }
  });
  window.addEventListener("blur", () => { resetStick(); state.lookId = null; isSprinting = false; });
  function updateVisibility() {
    const visible = !game.classList.contains("hidden");
    root.classList.toggle("is-active", visible);
    if (visible) startTutorial();
    if (!visible) { resetStick(); state.lookId = null; isSprinting = false; }
  }
  new MutationObserver(updateVisibility).observe(game, { attributes: true, attributeFilter: ["class"] });
  updateVisibility();
})();