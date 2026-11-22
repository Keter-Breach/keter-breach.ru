import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd(), out = path.join(root, "www");
async function copyFile(file) {
  const source = path.join(root, file), destination = path.join(out, file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}
async function copyDirectory(dir) {
  try { await fs.access(path.join(root, dir)); await fs.cp(path.join(root, dir), path.join(out, dir), { recursive: true }); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
for (const file of ["index.html","script.js","style.css","mobile-controls.js","mobile-controls.css","menu-background.svg","manifest.webmanifest","pwa-icon.svg","service-worker.js"]) await copyFile(file);
for (const dir of ["textures","audio"]) await copyDirectory(dir);
await copyFile("node_modules/three/build/three.min.js");
console.log("[KETER Android] Local Three.js and game assets prepared in ./www");
