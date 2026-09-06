import { createHash } from "node:crypto";
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, basename, dirname } from "node:path";

const root = process.argv[2] ?? "release-assets";
const repository = process.env.GITHUB_REPOSITORY ?? "B-Divyesh/sf-spanish-audio-notes";
const tag = process.env.RELEASE_TAG ?? "v0.1.6";
async function walk(dir) { return (await readdir(dir, { withFileTypes: true })).flatMap((entry) => entry.isDirectory() ? [] : [join(dir, entry.name)]).concat(...await Promise.all((await readdir(dir, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => walk(join(dir, e.name))))); }
const discovered = (await walk(root)).filter((file) => /\.(dmg|msi|exe|AppImage|deb|rpm)$/i.test(file));
const files = [];
for (const file of discovered) {
  const safeName = basename(file).replace(/\s+/g, ".");
  const safePath = join(dirname(file), safeName);
  if (safePath !== file) await rename(file, safePath);
  files.push(safePath);
}
const select = (test) => files.find((file) => test(basename(file)));
const selected = {
  macos_arm64: select((n) => /aarch64|arm64/i.test(n) && /\.dmg$/i.test(n)),
  macos_x64: select((n) => /x64|x86_64|amd64/i.test(n) && /\.dmg$/i.test(n)),
  windows: select((n) => /\.msi$/i.test(n)),
  windows_exe: select((n) => /\.exe$/i.test(n)),
  linux: select((n) => /\.AppImage$/i.test(n)),
  linux_deb: select((n) => /\.deb$/i.test(n)),
  linux_rpm: select((n) => /\.rpm$/i.test(n))
};
for (const [key, file] of Object.entries(selected)) if (!file) throw new Error(`Missing release asset: ${key}`);
const platforms = {};
const sums = [];
const hashes = new Map();
for (const file of files.sort()) {
  const filename = basename(file);
  const sha256 = createHash("sha256").update(await readFile(file)).digest("hex");
  hashes.set(file, sha256);
  sums.push(`${sha256}  ${filename}`);
}
for (const [key, file] of Object.entries(selected)) {
  const filename = basename(file); const sha256 = hashes.get(file);
  platforms[key] = { filename, sha256, url: `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(filename)}` };
}
await writeFile(join(root, "latest.json"), JSON.stringify({ version: tag.replace(/^v/, ""), platforms }, null, 2) + "\n");
await writeFile(join(root, "SHA256SUMS"), sums.join("\n") + "\n");
