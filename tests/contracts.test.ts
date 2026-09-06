import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("release and response contracts", () => {
  it("lists one tagged regression test for every claim", async () => {
    const claims = JSON.parse(await readFile(".factory/claims.json", "utf8")) as Array<{ id: string; test: string }>;
    const sources = [
      "tests/e2e/product.spec.ts",
      "tests/contracts.test.ts",
      "src-tauri/src/lib.rs",
      "scripts/test-installers.mjs",
      "scripts/test-appimage-audio.sh"
    ].map((path) => readFile(path, "utf8"));
    const source = (await Promise.all(sources)).join("\n");
    expect(new Set(claims.map((claim) => claim.id)).size).toBe(claims.length);
    for (const claim of claims) {
      expect(source.split(`@claim:${claim.id}`).length - 1).toBe(1);
    }
  });

  it("ships CSP and a real static 404 override", async () => {
    const config = JSON.parse(await readFile("public/staticwebapp.config.json", "utf8"));
    expect(config.globalHeaders["Content-Security-Policy"]).toContain("https://api.github.com");
    expect(config.globalHeaders["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(config.navigationFallback).toBeUndefined();
    expect(config.responseOverrides["404"].rewrite).toBe("/404.html");
    expect(await readFile("site/404.html", "utf8")).toContain("Esta página no existe");
  });
});
