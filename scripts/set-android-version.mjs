import fs from "node:fs/promises";

const gradlePath = "android/app/build.gradle";
let source = await fs.readFile(gradlePath, "utf8");
if (!/versionCode\s+\d+/.test(source) || !/versionName\s+['"][^'"]+['"]/.test(source)) {
  throw new Error("Could not find Android versionCode/versionName in app/build.gradle");
}
source = source.replace(/versionCode\s+\d+/, "versionCode 2");
source = source.replace(/versionName\s+['"][^'"]+['"]/, 'versionName "1.0.2"');
await fs.writeFile(gradlePath, source);
console.log("[KETER Android] APK version set to versionCode 2 / versionName 1.0.2");
