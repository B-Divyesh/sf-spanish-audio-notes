import sharp from "sharp";
import { mkdir, stat, writeFile } from "node:fs/promises";

await mkdir("public/assets", { recursive: true });
await sharp("assets/src/audio-margin-hero-v2.png")
  .resize({ width: 1280, withoutEnlargement: true })
  .webp({ quality: 76, effort: 6 })
  .toFile("public/assets/audio-margin-hero.webp");
await sharp("assets/src/audio-margin-hero-v2.png")
  .resize({ width: 640, withoutEnlargement: true })
  .webp({ quality: 72, effort: 6 })
  .toFile("public/assets/audio-margin-hero-640.webp");
await sharp("assets/src/audio-margin-hero-v2.png")
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .webp({ quality: 76, effort: 6 })
  .toFile("public/assets/audio-margin-social.webp");
await sharp("src-tauri/icons/icon.png").resize(180, 180).png().toFile("public/apple-touch-icon.png");
for (let index = 1; index <= 3; index += 1) {
  await sharp(`assets/src/demo-step-${index}.png`)
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 74, effort: 6 })
    .toFile(`public/assets/demo-step-${index}.webp`);
}

// Original deterministic audio texture for the sample timeline.
const sampleRate = 16_000;
const seconds = 12;
const pcm = Buffer.alloc(sampleRate * seconds * 2);
for (let frame = 0; frame < sampleRate * seconds; frame += 1) {
  const time = frame / sampleRate;
  const phrase = Math.floor(time / 2);
  const within = time % 2;
  const envelope = Math.min(1, within * 8) * Math.min(1, (2 - within) * 6) * (0.55 + 0.45 * Math.sin(Math.PI * within * 4) ** 2);
  const base = [118, 132, 110, 146, 124, 138][phrase] ?? 120;
  const value = envelope * (Math.sin(2 * Math.PI * base * time) * 0.28 + Math.sin(2 * Math.PI * base * 2.03 * time) * 0.12 + Math.sin(2 * Math.PI * base * 3.01 * time) * 0.06);
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32767))), frame * 2);
}
const wav = Buffer.alloc(44 + pcm.length);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write("WAVE", 8);
wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
await writeFile("public/assets/audio-margin-sample.wav", wav);
const output = await stat("public/assets/audio-margin-hero.webp");
if (output.size > 300_000) throw new Error(`Hero exceeds 300 KB: ${output.size}`);
console.log(`hero: ${Math.round(output.size / 1024)} KB`);
