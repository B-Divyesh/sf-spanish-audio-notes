import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("release and response contracts", () => {
  it("lists one tagged regression test for every claim", async () => {
    const claims = JSON.parse(await readFile(".factory/claims.json", "utf8")) as Array<{ id: string; test: string }>;
    const sources = `${await readFile("tests/e2e/product.spec.ts", "utf8")}\n${await readFile("tests/contracts.test.ts", "utf8")}`;
    expect(new Set(claims.map((claim) => claim.id)).size).toBe(claims.length);
    for (const claim of claims) {
      expect(claim.test).toContain(`@claim:${claim.id}`);
      expect(sources.split(`@claim:${claim.id}`).length - 1).toBe(1);
    }
  });

  it("@claim:installer-checksum keeps checksum verification in both installers", async () => {
    const [shell, powershell, generator] = await Promise.all([
      readFile("public/install.sh", "utf8"),
      readFile("public/install.ps1", "utf8"),
      readFile("scripts/generate-release-manifest.mjs", "utf8")
    ]);
    expect(shell).toContain("sha256sum");
    expect(shell).toContain('"$actual" = "$expected"');
    expect(powershell).toContain("Get-FileHash -Algorithm SHA256");
    expect(powershell).toContain("$actual -ne $asset.sha256");
    expect(generator).toContain('createHash("sha256")');
  });

  it("ships CSP and a real static 404 override", async () => {
    const config = JSON.parse(await readFile("public/staticwebapp.config.json", "utf8"));
    expect(config.globalHeaders["Content-Security-Policy"]).toContain("https://api.github.com");
    expect(config.globalHeaders["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(config.navigationFallback).toBeUndefined();
    expect(config.responseOverrides["404"].rewrite).toBe("/404.html");
    expect(await readFile("site/404.html", "utf8")).toContain("Esta página no existe");
  });

  it("@claim:model-integrity pins model hashes and removes a failed download", async () => {
    const source = await readFile("src-tauri/src/lib.rs", "utf8");
    expect(source).toContain("File::open(path)");
    expect(source).toContain("WhisperContext::new_with_params");
    expect(source.match(/"[a-f0-9]{64}"/g)).toHaveLength(3);
    expect(source).toContain("if actual_hash != expected_hash");
    expect(source).toContain("remove_file(&temp)");
  });
});
