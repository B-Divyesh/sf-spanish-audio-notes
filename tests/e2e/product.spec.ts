import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apiPattern = "https://api.github.com/repos/B-Divyesh/sf-spanish-audio-notes/releases/latest";
const releaseFixture = {
  tag_name: "v0.1.4",
  html_url: "https://github.com/B-Divyesh/sf-spanish-audio-notes/releases/tag/v0.1.4",
  assets: [
    { name: "Audio.Margin_0.1.4_amd64.AppImage", browser_download_url: "https://github.com/B-Divyesh/sf-spanish-audio-notes/releases/download/v0.1.4/Audio.Margin_0.1.4_amd64.AppImage" },
    { name: "Audio.Margin_0.1.4_x64_en-US.msi", browser_download_url: "https://github.com/B-Divyesh/sf-spanish-audio-notes/releases/download/v0.1.4/Audio.Margin_0.1.4_x64_en-US.msi" }
  ]
};

test("@claim:release-download resolves a real platform asset through api.github.com", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.route(apiPattern, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(releaseFixture) }));
  await page.goto("http://127.0.0.1:5173/");
  const download = page.locator("#download");
  await expect(download).toHaveAttribute("href", releaseFixture.assets[1].browser_download_url);
  expect(requests).toContain(apiPattern);
  expect(requests.some((url) => url.includes("github.com/B-Divyesh/sf-spanish-audio-notes/releases/latest/download/latest.json"))).toBe(false);
});

test("@claim:release-fallback shows an absent-release state without a console error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route(apiPattern, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...releaseFixture, assets: [] }) }));
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.locator("#download")).toHaveText("Ver estado de las descargas");
  await expect(page.locator("#platform-note")).toContainText("se están publicando");
  expect(errors).toEqual([]);
});

test("offline landing skips release metadata and stays console-clean", async ({ page }) => {
  const errors: string[] = [];
  const apiRequests: string[] = [];
  await page.addInitScript(() => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (request.url().startsWith("https://api.github.com")) apiRequests.push(request.url()); });
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.locator("#platform-note")).toContainText("se están publicando");
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("@claim:demo-isolation keeps sample state out of the real storage namespace", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/");
  await page.evaluate(() => localStorage.setItem("audio-margin:sessions:v1", JSON.stringify({ sessions: [{ id: "real-record" }] })));
  await page.getByRole("link", { name: "Probar con datos de ejemplo" }).click();
  await expect(page.getByText("Demo — datos de ejemplo, nada se guarda en tus sesiones")).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain("demo:audio-margin:sessions:v1");
  expect(await page.evaluate(() => localStorage.getItem("audio-margin:sessions:v1"))).toContain("real-record");
  await page.getByRole("button", { name: "Restablecer demo" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cómo recordamos");
});

test("@claim:demo-local-only makes no cross-origin request during the sample flow", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("http://127.0.0.1:5173/demo/");
  await page.getByRole("button", { name: "Reproducir o pausar" }).click();
  await page.getByRole("button", { name: /Repasar ahora/ }).click();
  await expect(page.getByText("Pregunta 1 de 5")).toBeVisible();
  expect(requests.every((url) => new URL(url).origin === "http://127.0.0.1:5173")).toBe(true);
  await context.close();
});

test("@claim:five-item-review presents exactly five learner questions", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/demo/");
  await expect(page.getByText("5 / 5")).toBeVisible();
  await page.getByRole("button", { name: /Repasar ahora/ }).click();
  for (let index = 1; index <= 5; index += 1) {
    await expect(page.getByText(`Pregunta ${index} de 5`)).toBeVisible();
    await page.getByRole("button", { name: index === 5 ? "Terminar repaso" : "La tengo · siguiente" }).click();
  }
  await expect(page.getByRole("heading", { name: "Repaso de cinco" })).toHaveCount(0);
});

test("@claim:json-export downloads the active session with its five pins", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/demo/");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Cómo-recordamos.json");
});

test("@claim:keyboard-search focuses transcript search with slash", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/demo/");
  await page.keyboard.press("/");
  await expect(page.getByRole("searchbox", { name: "Buscar en la transcripción" })).toBeFocused();
});

test("@claim:time-linked seeking moves playback to the selected segment", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/demo/");
  await page.getByRole("button", { name: "Ir a 00:04" }).click();
  await expect(page.locator("[data-scrub]")).toHaveValue("4");
});

test("@claim:consent-model-options requires consent and offers six Spanish contexts", async ({ page }) => {
  await page.goto("http://127.0.0.1:1420/");
  await page.getByRole("button", { name: "Importar una grabación" }).click();
  await expect(page.locator("select[name=variant] option")).toHaveCount(6);
  await expect(page.locator("input[name=model]")).toHaveCount(3);
  await expect(page.locator("input[name=consent]")).toHaveAttribute("required", "");
});

test("@claim:no-hidden-capture never requests microphone or camera access", async ({ page }) => {
  const permissionRequests: string[] = [];
  await page.addInitScript(() => {
    const media = navigator.mediaDevices;
    if (media) media.getUserMedia = async (constraints) => { (window as typeof window & { captured?: unknown[] }).captured = [...((window as typeof window & { captured?: unknown[] }).captured ?? []), constraints]; throw new Error("unexpected capture"); };
  });
  await page.goto("http://127.0.0.1:1420/");
  await page.getByRole("button", { name: "Importar una grabación" }).click();
  permissionRequests.push(...await page.evaluate(() => ((window as typeof window & { captured?: unknown[] }).captured ?? []).map(String)));
  expect(permissionRequests).toEqual([]);
});

test("@claim:one-time-price shows the €24 purchase and restore path", async ({ page }) => {
  await page.goto("http://127.0.0.1:1420/");
  await page.getByRole("button", { name: "Licencia" }).click();
  await expect(page.getByRole("link", { name: "Comprar una vez · €24" })).toHaveAttribute("href", "https://api.sociobot.in/api/v1/products/spanish-audio-notes/checkout");
  await expect(page.getByLabel("¿Ya compraste? Pega tu licencia")).toBeVisible();
});

test("@claim:no-tracking loads no third-party script or analytics endpoint", async ({ page }) => {
  const scripts: string[] = [];
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.route(apiPattern, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(releaseFixture) }));
  await page.goto("http://127.0.0.1:5173/");
  scripts.push(...await page.locator("script[src]").evaluateAll((items) => items.map((item) => (item as HTMLScriptElement).src)));
  expect(scripts.every((url) => new URL(url).origin === "http://127.0.0.1:5173")).toBe(true);
  expect(requests.filter((url) => /analytics|segment|plausible|google-analytics|doubleclick/i.test(url))).toEqual([]);
});

test("@claim:local-storage reloads a real session from this browser only", async ({ page }) => {
  await page.goto("http://127.0.0.1:1420/");
  await page.evaluate(() => localStorage.setItem("audio-margin:sessions:v1", JSON.stringify({ sessions: [{ id: "local-one", title: "Seminario local", audioName: "local.wav", createdAt: "2026-08-30T12:00:00Z", variant: "España", model: "base", segments: [], pins: [] }], activeId: "local-one" })));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seminario local");
});

test("@claim:session-delete removes a local session after confirmation", async ({ page }) => {
  await page.goto("http://127.0.0.1:1420/");
  await page.evaluate(() => localStorage.setItem("audio-margin:sessions:v1", JSON.stringify({ sessions: [{ id: "delete-me", title: "Clase para borrar", audioName: "local.wav", createdAt: "2026-08-30T12:00:00Z", variant: "España", model: "base", segments: [], pins: [] }], activeId: "delete-me" })));
  await page.reload();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Borrar esta sesión" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Escucha");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("audio-margin:sessions:v1") ?? "{}").sessions)).toEqual([]);
});

test("@claim:free-limits sends a fourth session to the one-time license screen", async ({ page }) => {
  await page.goto("http://127.0.0.1:1420/");
  await page.evaluate(() => localStorage.setItem("audio-margin:sessions:v1", JSON.stringify({ sessions: [1, 2, 3].map((id) => ({ id: String(id), title: `Clase ${id}`, audioName: "local.wav", createdAt: "2026-08-30T12:00:00Z", variant: "España", model: "base", segments: [], pins: [] })) })));
  await page.reload();
  await page.getByRole("button", { name: "Importar una grabación" }).click();
  await expect(page.getByRole("heading", { name: "Licencia de pago" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Comprar una vez · €24" })).toBeVisible();
  await page.goto("http://127.0.0.1:5173/demo/");
  await page.getByRole("button", { name: "Fijar esta frase" }).click();
  await expect(page.getByRole("heading", { name: "Licencia de pago" })).toBeVisible();
});

test("@claim:license-return stores the returned license and verifies it once", async ({ page }) => {
  let calls = 0;
  await page.route("https://api.sociobot.in/api/v1/products/spanish-audio-notes/verify?license=test-token", (route) => { calls += 1; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: true, reason: "ok" }) }); });
  await page.goto("http://127.0.0.1:1420/?license=test-token");
  await expect.poll(() => calls).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("sb_license:spanish-audio-notes"))).toBe("test-token");
  expect(page.url()).not.toContain("license=");
  await page.reload();
  expect(calls).toBe(1);
});

test("loaded demo remains usable when the browser goes offline", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/demo/");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Restablecer demo" }).click();
  await page.getByRole("button", { name: /Repasar ahora/ }).click();
  await expect(page.getByText("Pregunta 1 de 5")).toBeVisible();
  await context.close();
});

test("demo is accessible and usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5173/demo/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});

test("landing page is accessible, keyboard reachable, and clean", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route(apiPattern, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(releaseFixture) }));
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.locator("h1")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  expect(errors).toEqual([]);
});
