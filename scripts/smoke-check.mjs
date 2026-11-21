import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const read = path => readFile(new URL(path, import.meta.url), "utf8").catch(error => {
  throw new Error(`Cannot read ${path}: ${error.message}`);
});

const root = new URL("../", import.meta.url);
const [html, script, css] = await Promise.all([
  read("../index.html"),
  read("../script.js"),
  read("../style.css")
]);

assert.match(html, /id="text-game"/, "story/menu container should exist");
assert.match(html, /id="three-container"/, "3D container should exist");
assert.match(html, /gameScript\.src = "\.\/script\.js"/, "page should load the game script after Three.js is ready");
assert.match(html, /loadThree\("\.\/node_modules\/three\/build\/three\.min\.js", function \(\)/, "desktop build should prefer the bundled local Three.js runtime");
assert.doesNotMatch(html, /fonts\.googleapis\.com/, "desktop menu should not depend on Google Fonts");
assert.match(html, /loadThree\("https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/build\/three\.min\.js", \(\) => showError/, "browser deployment should use a version-pinned fallback runtime");
assert.match(html, /threeScript\.onload = loadGame/, "game script must load only after Three.js is ready");
assert.match(html, /threeScript\.onerror = onError/, "runtime load failure should show a readable error");
assert.match(html, /href="style\.css"/, "page should load responsive styles");
assert.match(script, /function renderChapter\(/, "chapter renderer should exist");
assert.match(script, /function init3DMode\(/, "3D initialization should exist");
assert.match(script, /firstPersonRig\.visible = true/, "first-person hands and flashlight should remain visible");
assert.match(script, /bumpMap:\s*maps\.bump/, "PBR bump map should be configured");
assert.match(script, /roughnessMap:\s*maps\.roughness/, "PBR roughness map should be configured");
assert.match(script, /inputLength > 1/, "diagonal movement should be normalized");
assert.match(script, /e\.repeat && \(e\.code === 'KeyF' \|\| e\.code === 'KeyE'\)/, "held interaction keys should not repeat");
assert.match(script, /url\("menu-background\.svg"\)/, "VHS menu backdrop should be referenced");
assert.match(script, /keter-vhs-tracking/, "VHS tracking-band effect should be present");
assert.match(script, /keter-title-flicker/, "Subtle title signal flicker should be present");
assert.match(script, /new Audio\("audio\/vhs\.mp3"\)/, "VHS ambience audio should be configured");
assert.match(script, /document\.addEventListener\("pointerdown", \(\) => \{[\s\S]{0,180}startVhsAmbient\(\)/, "VHS ambience should start after a user gesture in the menu");
assert.match(script, /repeating-linear-gradient\(0deg, rgba\(205,224,215,\.11\)/, "VHS scanlines should be present");

new Function(script); // Parse only; do not execute browser-dependent game code.
await access(new URL("../menu-background.svg", import.meta.url), constants.R_OK);

console.log("PROJECT: KETER smoke checks passed.");
console.log("Checked: page wiring, game entry points, PBR maps, input fixes, menu backdrop, JavaScript syntax.");


// Boot screen and sequential runtime loading must remain wired together.
assert.match(html, /id="keter-loading"/, "page should show a branded loading overlay during startup");
assert.match(html, /id="loading-status"/, "loading overlay should expose startup status");
assert.match(html, /loading-mark/, "loading overlay should include an animated loading icon");
assert.match(html, /controlsScript\.onload = hideLoader/, "loading overlay should disappear after touch controls load");
assert.match(html, /gameScript\.onerror = \(\) => showError/, "startup failure should show a readable error");
assert.match(html, /loadThree\("\.\/node_modules\/three\/build\/three\.min\.js", function \(\)/, "desktop build should prefer the bundled Three.js runtime");
assert.match(html, /loadThree\("https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/build\/three\.min\.js", \(\) => showError/, "browser build should have a pinned CDN fallback");
assert.doesNotMatch(html, /<script src="script\.js"><\/script>/, "game script must not be loaded twice");

assert.match(script, /document\.pointerLockElement === canvas/, "pointer lock state should recognize the game canvas");
assert.match(script, /renderer\.domElement\.addEventListener\("click", requestGamePointerLock\)/, "desktop canvas should request pointer lock from one click handler");
assert.match(script, /matchMedia\("\(pointer: coarse\)"\)\.matches/, "touch devices should bypass desktop pointer lock");
assert.doesNotMatch(script, /container\.addEventListener\("click", requestGamePointerLock\)/, "pointer lock must not be requested twice by bubbling clicks");
assert.match(script, /className = 'keter-vhs-overlay'/, "gameplay should mount its VHS overlay");
assert.match(css, /keter-game-vhs-track/, "gameplay should have animated VHS tracking bands");
assert.match(css, /repeating-linear-gradient\(0deg, rgba\(190,220,211,\.16\)/, "gameplay should have visible VHS scanlines");
assert.match(css, /#000 !important/, "boot screen should use a true black base");


// Mobile browser and installable PWA support.
const [mobileJs, mobileCss, manifest, serviceWorker, packageJson] = await Promise.all([
  read("../mobile-controls.js"),
  read("../mobile-controls.css"),
  read("../manifest.webmanifest"),
  read("../service-worker.js"),
  read("../package.json")
]);
assert.match(html, /name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/, "mobile viewport should respect device safe areas");
assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/, "page should advertise its PWA manifest");
assert.match(html, /mobile-controls\.css/, "page should load touch control styles");
assert.match(html, /controlsScript\.src = "\.\/mobile-controls\.js"/, "touch controls should load after the game core");
assert.match(html, /navigator\.serviceWorker\.register\("\.\/service-worker\.js"\)/, "page should register its offline service worker");
assert.match(mobileJs, /data-action="sprint"/, "touch UI should include sprint");
assert.match(mobileJs, /data-action="flashlight"/, "touch UI should include flashlight");
assert.match(mobileJs, /data-action="interact"/, "touch UI should include interaction");
assert.match(mobileJs, /camera\.rotation\.y/, "right-side touch zone should rotate the camera");
assert.match(mobileJs, /moveForward = y < -dead/, "virtual joystick should drive the existing movement state");
assert.match(mobileCss, /env\(safe-area-inset-left\)/, "touch controls should respect device safe areas");
assert.match(manifest, /"display": "standalone"/, "PWA should launch without browser chrome");
assert.match(serviceWorker, /caches\.open\(CACHE_NAME\)/, "PWA should cache its app shell");
assert.match(packageJson, /mobile-controls\.js/, "desktop package should include the mobile runtime files");
new Function(mobileJs);
new Function(serviceWorker);
JSON.parse(manifest);

const [mobileControls, androidBuilder] = await Promise.all([
  read("../mobile-controls.js"),
  read("../scripts/build-android.mjs")
]);
assert.match(mobileControls, /keter-tutorial-subtitle/, "mobile controls should show subtitle tutorial");
assert.match(mobileControls, /ПРАВАЯ ЧАСТЬ ЭКРАНА/, "tutorial should explain camera swipe");
assert.match(mobileControls, /keter-mobile-tutorial-v2/, "tutorial completion should be remembered");
assert.match(script, /powerPreference: touchDevice \? "low-power"/, "mobile WebGL should prefer low-power mode");
assert.match(script, /renderer.setPixelRatio\(Math.min\(/, "mobile WebGL pixel ratio should be capped");
assert.match(script, /controlsActive = locked \|\| touchDevice/, "touch gameplay should activate story triggers");
assert.match(html, /keter-runtime-error/, "runtime failures should be visible instead of a silent black screen");
assert.match(androidBuilder, /node_modules\/three\/build\/three\.min\.js/, "APK should bundle the local Three.js runtime");
await access(new URL("../assets/keter-icon.svg", import.meta.url), constants.R_OK);
