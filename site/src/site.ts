import "./style.css";
import "./mobile.css";
import "./additions.css";

type ReleaseAsset = { name: string; browser_download_url: string };
type GitHubRelease = { tag_name: string; html_url: string; assets: ReleaseAsset[] };
type Platform = { key: "windows" | "macos_arm64" | "macos_x64" | "linux"; label: string; caution: string };

const apiUrl = "https://api.github.com/repos/B-Divyesh/sf-spanish-audio-notes/releases/latest";
const releasePage = "https://github.com/B-Divyesh/sf-spanish-audio-notes/releases";
const cacheKey = "audio-margin:github-release:v1";
const button = document.querySelector<HTMLAnchorElement>("#download");
const note = document.querySelector<HTMLElement>("#platform-note");

function platform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("windows")) return { key: "windows", label: "Descargar para Windows", caution: "Windows 10+ · instalador sin firmar" };
  if (ua.includes("mac")) {
    const arm = ua.includes("arm") || ua.includes("apple silicon");
    return { key: arm ? "macos_arm64" : "macos_x64", label: "Descargar para macOS", caution: "macOS 12+ · clic derecho → Abrir" };
  }
  return { key: "linux", label: "Descargar para Linux", caution: "AppImage · x86_64" };
}

function assetFor(release: GitHubRelease, key: Platform["key"]): ReleaseAsset | undefined {
  const patterns: Record<Platform["key"], RegExp> = {
    windows: /\.msi$/i,
    macos_arm64: /aarch64\.dmg$/i,
    macos_x64: /x64\.dmg$/i,
    linux: /\.AppImage$/i
  };
  return release.assets.find((asset) => patterns[key].test(asset.name));
}

function readCache(): GitHubRelease | undefined {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null") as { savedAt: number; release: GitHubRelease } | null;
    if (cached && Date.now() - cached.savedAt < 3_600_000) return cached.release;
  } catch { /* A corrupt cache should behave like no cache. */ }
}

async function latestRelease(): Promise<GitHubRelease> {
  const cached = readCache();
  if (cached) return cached;
  const response = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`Release API returned ${response.status}`);
  const release = await response.json() as GitHubRelease;
  localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), release }));
  return release;
}

async function resolveDownload() {
  if (!button || !note) return;
  const current = platform();
  button.textContent = current.label;
  note.textContent = current.caution;
  try {
    const release = await latestRelease();
    const asset = assetFor(release, current.key);
    if (!asset) throw new Error("Release has no matching installer");
    button.href = asset.browser_download_url;
    note.textContent = `${current.caution} · ${release.tag_name}`;
  } catch {
    button.href = releasePage;
    button.textContent = "Ver estado de las descargas";
    note.textContent = "Los instaladores se están publicando. Puedes revisar la página de versiones.";
  }
}

document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((element) => element.addEventListener("click", async () => {
  const status = element.querySelector("span")!;
  try {
    await navigator.clipboard.writeText(element.dataset.copy ?? "");
    status.textContent = "Copiado";
  } catch {
    status.textContent = "Selecciona y copia la línea";
  }
  window.setTimeout(() => { status.textContent = "Copiar"; }, 1600);
}));

const returnedLicense = new URLSearchParams(location.search).get("license");
if (returnedLicense) {
  localStorage.setItem("sb_license:spanish-audio-notes", returnedLicense);
  history.replaceState({}, "", location.pathname);
}
void resolveDownload();
