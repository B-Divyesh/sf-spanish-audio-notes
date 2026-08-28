import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

await mkdir("public/assets", { recursive: true });
await sharp("assets/src/audio-margin-hero-v2.png")
  .resize({ width: 1280, withoutEnlargement: true })
  .webp({ quality: 76, effort: 6 })
  .toFile("public/assets/audio-margin-hero.webp");
await sharp("assets/src/audio-margin-hero-v2.png")
  .resize({ width: 640, withoutEnlargement: true })
  .webp({ quality: 72, effort: 6 })
  .toFile("public/assets/audio-margin-hero-640.webp");
const output = await stat("public/assets/audio-margin-hero.webp");
if (output.size > 300_000) throw new Error(`Hero exceeds 300 KB: ${output.size}`);
console.log(`hero: ${Math.round(output.size / 1024)} KB`);
