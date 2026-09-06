import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const payload = Buffer.from("Audio Margin installer behavior fixture\n");
const correctHash = createHash("sha256").update(payload).digest("hex");

function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ code: -1, stdout, stderr: `${stderr}${error.message}` }));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function serve(expectedHash) {
  const server = createServer((request, response) => {
    if (request.url === "/latest.json") {
      const origin = `http://127.0.0.1:${server.address().port}`;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ platforms: {
        linux: { url: `${origin}/Audio.Margin.Test.AppImage`, sha256: expectedHash },
        windows: { url: `${origin}/Audio.Margin.Test.exe`, sha256: expectedHash }
      } }));
      return;
    }
    response.end(payload);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function exercise(command, args, platform, expectedHash, shouldPass) {
  const root = await mkdtemp(join(tmpdir(), `audio-margin-${platform}-`));
  const server = await serve(expectedHash);
  try {
    const address = server.address();
    const result = await run(command, args, {
      AUDIO_MARGIN_MANIFEST_URL: `http://127.0.0.1:${address.port}/latest.json`,
      AUDIO_MARGIN_INSTALL_DIR: root,
      AUDIO_MARGIN_NO_LAUNCH: "1",
      AUDIO_MARGIN_TEST_OS: platform === "linux" ? "Linux" : undefined,
      AUDIO_MARGIN_TEST_ARCH: platform === "linux" ? "x86_64" : undefined
    });
    if (shouldPass && result.code !== 0) throw new Error(`${platform} installer rejected a matching checksum:\n${result.stderr}`);
    if (!shouldPass && (result.code === 0 || !`${result.stdout}${result.stderr}`.includes("SHA-256 mismatch"))) {
      throw new Error(`${platform} installer did not reject a mismatched checksum:\n${result.stdout}${result.stderr}`);
    }
    if (shouldPass) {
      const filename = platform === "linux" ? "audio-margin" : "Audio.Margin.Test.exe";
      const installed = await readFile(join(root, filename));
      if (!installed.equals(payload)) throw new Error(`${platform} installer changed the verified payload`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
}

const pwsh = process.platform === "win32" ? "pwsh.exe" : "pwsh";
await exercise("sh", ["public/install.sh"], "linux", correctHash, true);
await exercise("sh", ["public/install.sh"], "linux", "0".repeat(64), false);
await exercise(pwsh, ["-NoLogo", "-NoProfile", "-File", "public/install.ps1"], "windows", correctHash, true);
await exercise(pwsh, ["-NoLogo", "-NoProfile", "-File", "public/install.ps1"], "windows", "0".repeat(64), false);
console.log("@claim:installer-checksum accepted matching files and rejected corrupt files in both installers");
