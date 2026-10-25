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
assert.match(html, /href="style\.css"/, "page should load responsive styles");
assert.match(script, /function renderChapter\(/, "chapter renderer should exist");
assert.match(script, /function init3DMode\(/, "3D initialization should exist");
assert.match(script, /bumpMap:\s*maps\.bump/, "PBR bump map should be configured");
assert.match(script, /roughnessMap:\s*maps\.roughness/, "PBR roughness map should be configured");
assert.match(script, /inputLength > 1/, "diagonal movement should be normalized");
assert.match(script, /e\.repeat && \(e\.code === 'KeyF' \|\| e\.code === 'KeyE'\)/, "held interaction keys should not repeat");
assert.match(script, /url\("menu-background\.svg"\)/, "VHS menu backdrop should be referenced");

new Function(script); // Parse only; do not execute browser-dependent game code.
await access(new URL("../menu-background.svg", import.meta.url), constants.R_OK);

console.log("PROJECT: KETER smoke checks passed.");
console.log("Checked: page wiring, game entry points, PBR maps, input fixes, menu backdrop, JavaScript syntax.");
