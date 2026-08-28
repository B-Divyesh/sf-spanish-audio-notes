import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing page is accessible and resolves a platform action", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("#download")).toContainText(/Windows|macOS|Linux/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  expect(errors.filter((error) => !error.includes("latest.json"))).toEqual([]);
});

test("app sample supports pinning and bounded review", async ({ page }) => {
  await page.goto("http://127.0.0.1:1420/");
  await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cómo recordamos");
  await page.getByRole("button", { name: "Fijar esta frase" }).first().click();
  await page.getByLabel("¿Qué quieres poder recordar?").fill("¿Qué fortalece la memoria?");
  await page.getByRole("button", { name: "Guardar en el margen" }).click();
  await expect(page.getByText("¿Qué fortalece la memoria?")).toBeVisible();
  await page.getByRole("button", { name: /Repasar ahora/ }).click();
  await expect(page.getByText("Pregunta 1 de 1")).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});

test("landing remains usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#download")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
