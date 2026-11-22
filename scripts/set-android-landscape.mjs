import fs from "node:fs/promises";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let xml = await fs.readFile(manifestPath, "utf8");

// Capacitor's generated launcher activity is the app entry point. Lock only
// this activity so Android opens the game in landscape before WebView starts.
const activityPattern = /<activity\b(?=[^>]*android:name="[^"]*MainActivity")[^>]*>/;
const match = xml.match(activityPattern);
if (!match) throw new Error("Could not find the Capacitor MainActivity in AndroidManifest.xml");

if (/android:screenOrientation=/.test(match[0])) {
  xml = xml.replace(activityPattern, tag =>
    tag.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="landscape"')
  );
} else {
  xml = xml.replace(activityPattern, tag =>
    tag.replace(/>$/, ' android:screenOrientation="landscape">')
  );
}

await fs.writeFile(manifestPath, xml);
if (!/android:screenOrientation="landscape"/.test(xml.match(activityPattern)?.[0] || "")) {
  throw new Error("Landscape orientation was not applied to MainActivity");
}
console.log("[KETER Android] MainActivity locked to landscape.");
