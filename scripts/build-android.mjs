import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "www");

async function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const destination = path.join(out, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}
async function copyDirectory(relativePath) {
  const source = path.join(root, relativePath);
  try {
    await fs.access(source);
    await fs.cp(source, path.join(out, relativePath), { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });

for (const file of [
  "index.html", "script.js", "style.css", "mobile-controls.js",
  "mobile-controls.css", "menu-background.svg", "manifest.webmanifest",
  "pwa-icon.svg", "service-worker.js"
]) {
  await copyFile(file);
}
for (const directory of ["textures", "audio"]) await copyDirectory(directory);

// Keep the existing local Three.js loader path working inside the APK.
await copyFile("node_modules/three/build/three.min.js");
console.log("[KETER Android] Web assets prepared in ./www");
