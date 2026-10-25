import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.GAME_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
const errors = [];
const failedRequests = [];

page.on("pageerror", error => errors.push(error.message));
page.on("requestfailed", request => {
  const url = request.url();
  if (/three\.min\.js|script\.js|style\.css|menu-background\.svg/.test(url)) {
    failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText || "request failed"}`);
  }
});

try {
  const response = await page.goto(baseURL, { waitUntil: "networkidle", timeout: 45000 });
  assert.ok(response && response.ok(), `Game page failed to load: ${response?.status()}`);

  await page.locator("#text-game").waitFor({ state: "visible" });
  await page.locator("#description").waitFor({ state: "visible" });
  await page.locator("#buttons-container button").first().waitFor({ state: "visible" });

  const initialTitle = await page.locator("#chapter-title").innerText();
  assert.ok(initialTitle.trim().length > 0, "Initial chapter title should not be empty");

  const firstChoice = page.locator("#buttons-container button").first();
  await firstChoice.click();
  await page.locator("#three-container").waitFor({ state: "visible", timeout: 15000 });

  // The 3D mode deliberately opens its own in-game terminal overlay. Start
  // through that UI instead of clicking a story button underneath the overlay.
  const startButton = page.locator("#keter-main-menu button").first();
  await startButton.waitFor({ state: "visible", timeout: 10000 });
  await startButton.click();
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#three-container canvas");
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 20000 });

  const rendererCanvas = page.locator("#three-container canvas").first();
  const canvasBox = await rendererCanvas.boundingBox();
  assert.ok(canvasBox && canvasBox.width > 100 && canvasBox.height > 100, "3D canvas should have a visible size");

  await page.keyboard.press("f");
  await page.keyboard.press("e");
  await page.waitForTimeout(250);

  assert.deepEqual(failedRequests, [], "Critical game assets should not fail to load");
  assert.deepEqual(errors, [], "Browser should not report uncaught JavaScript errors");

  console.log(JSON.stringify({
    ok: true,
    url: baseURL,
    initialTitle,
    canvas: { width: Math.round(canvasBox.width), height: Math.round(canvasBox.height) },
    pageErrors: errors,
    failedRequests
  }, null, 2));
} finally {
  await browser.close();
}
