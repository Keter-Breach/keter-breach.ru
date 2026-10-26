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
assert.match(html, /src="script\.js"/, "page should load the game script");
assert.match(html, /localScript\.src = "\.\/node_modules\/three\/build\/three\.min\.js"/, "desktop build should prefer the bundled local Three.js runtime");
assert.match(html, /fallbackScript\.src = "https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/build\/three\.min\.js"/, "browser deployment should fall back to a version-pinned Three.js CDN when node_modules is not published");
assert.match(html, /fallbackScript\.onerror/, "runtime load failure should show a readable error instead of a silent black screen");
assert.doesNotMatch(html, /fonts\.googleapis\.com/, "game should not depend on Google-hosted fonts");
assert.match(html, /href="style\.css"/, "page should load responsive styles");
assert.match(script, /function renderChapter\(/, "chapter renderer should exist");
assert.match(script, /function init3DMode\(/, "3D initialization should exist");
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
