import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";

const root = process.argv[2] ?? "release-assets";
const repository = process.env.GITHUB_REPOSITORY ?? "B-Divyesh/sf-spanish-audio-notes";
const tag = process.env.RELEASE_TAG ?? "v0.1.2";
async function walk(dir) { return (await readdir(dir, { withFileTypes: true })).flatMap((entry) => entry.isDirectory() ? [] : [join(dir, entry.name)]).concat(...await Promise.all((await readdir(dir, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => walk(join(dir, e.name))))); }
const files = (await walk(root)).filter((file) => /\.(dmg|msi|exe|AppImage|deb)$/i.test(file));
const select = (test) => files.find((file) => test(basename(file)));
const selected = {
  macos_arm64: select((n) => /aarch64|arm64/i.test(n) && /\.dmg$/i.test(n)),
  macos_x64: select((n) => /x64|x86_64|amd64/i.test(n) && /\.dmg$/i.test(n)),
  windows: select((n) => /\.msi$/i.test(n)) ?? select((n) => /\.exe$/i.test(n)),
  linux: select((n) => /\.AppImage$/i.test(n)),
  linux_deb: select((n) => /\.deb$/i.test(n))
};
for (const [key, file] of Object.entries(selected)) if (!file) throw new Error(`Missing release asset: ${key}`);
const platforms = {};
const sums = [];
for (const [key, file] of Object.entries(selected)) {
  const filename = basename(file); const sha256 = createHash("sha256").update(await readFile(file)).digest("hex");
  platforms[key] = { filename, sha256, url: `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(filename)}` };
  sums.push(`${sha256}  ${filename}`);
}
await writeFile(join(root, "latest.json"), JSON.stringify({ version: tag.replace(/^v/, ""), platforms }, null, 2) + "\n");
await writeFile(join(root, "SHA256SUMS"), sums.join("\n") + "\n");
