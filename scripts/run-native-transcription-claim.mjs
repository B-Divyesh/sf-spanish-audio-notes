import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const expectedHash = "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21";
const modelUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin?download=true";
const directory = resolve("src-tauri/target/claim-models");
const model = resolve(directory, "ggml-tiny.bin");

async function validModel() {
  try {
    return createHash("sha256").update(await readFile(model)).digest("hex") === expectedHash;
  } catch {
    return false;
  }
}

async function downloadModel() {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(modelUrl, { headers: { "User-Agent": "Audio-Margin-claim/0.1.5" } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    const retryable = response.status === 429 || response.status >= 500;
    const retryAfter = Number(response.headers.get("retry-after"));
    await response.body?.cancel();
    if (!retryable || attempt === 5) throw new Error(`Model download returned ${response.status}`);
    const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) : attempt * 5;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, seconds * 1_000));
  }
  throw new Error("Model download retries were exhausted");
}

if (!await validModel()) {
  await mkdir(directory, { recursive: true });
  const bytes = await downloadModel();
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash) throw new Error(`Model checksum mismatch: ${actualHash}`);
  const temporary = `${model}.part`;
  await writeFile(temporary, bytes);
  await rm(model, { force: true });
  await rename(temporary, model);
}

const code = await new Promise((resolveCode, reject) => {
  const child = spawn("cargo", ["test", "--manifest-path", "src-tauri/Cargo.toml", "claim_native_local_transcription_runs_offline_after_model_download", "--", "--ignored", "--nocapture"], {
    stdio: "inherit",
    env: {
      ...process.env,
      AUDIO_MARGIN_CLAIM_MODEL: model,
      HTTP_PROXY: "http://127.0.0.1:9",
      HTTPS_PROXY: "http://127.0.0.1:9",
      ALL_PROXY: "http://127.0.0.1:9",
      NO_PROXY: ""
    }
  });
  child.on("error", reject);
  child.on("exit", (value) => resolveCode(value ?? 1));
});
if (code !== 0) process.exit(code);
