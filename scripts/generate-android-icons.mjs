import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const root = process.cwd(), assets = path.join(root, "assets");
await fs.mkdir(assets, { recursive: true });
const svg = await fs.readFile(path.join(assets, "keter-icon.svg"));
await sharp(svg).resize(1024,1024).png().toFile(path.join(assets,"icon-only.png"));
await sharp({create:{width:2732,height:2732,channels:4,background:"#05090b"}}).png().toFile(path.join(assets,"splash.png"));
console.log("[KETER Android] Launcher icon and splash sources generated.");
