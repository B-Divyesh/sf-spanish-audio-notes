import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const expectedHash = "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21";
const modelUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin";
const directory = resolve("src-tauri/target/claim-models");
const model = resolve(directory, "ggml-tiny.bin");

async function validModel() {
  try {
    return createHash("sha256").update(await readFile(model)).digest("hex") === expectedHash;
  } catch {
    return false;
  }
}

if (!await validModel()) {
  await mkdir(directory, { recursive: true });
  const response = await fetch(modelUrl);
  if (!response.ok) throw new Error(`Model download returned ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
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
