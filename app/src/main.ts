import "./style.css";
import "./mobile.css";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppState, Pin, Segment, Session } from "./types";
import { clearDemoState, formatTime, loadState, nextReview, saveState } from "./store";
import { sampleSegments } from "./sample";
import { LICENSE_KEY, hasVerifiedLicense, licenseNeedsRefresh, recordLicenseAttempt, storeLicenseVerdict, storeUnverifiedLicense } from "./license";

const root = document.querySelector<HTMLDivElement>("#app")!;
let demoMode = location.pathname.startsWith("/demo") || new URLSearchParams(location.search).get("demo") === "1";
let state: AppState = loadState(demoMode);
let query = "";
let currentTime = 0;
let processing = "";
let processingProgress = 0;
let audio: HTMLAudioElement | undefined;
let audioObjectUrl: string | undefined;
let activeSegmentId = "";

const isTauri = "__TAURI_INTERNALS__" in window;
const uid = () => crypto.randomUUID();
const h = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]!);
const active = () => state.sessions.find((item) => item.id === state.activeId);
const persist = () => saveState(state, demoMode);
const hasLicense = () => hasVerifiedLicense();

function icon(name: "play" | "pause" | "pin" | "plus" | "trash" | "search" | "review") {
  const paths = {
    play: '<path d="m9 7 8 5-8 5V7Z"/>', pause: '<path d="M9 7v10M15 7v10"/>',
    pin: '<path d="m9 4 6 2-1 5 3 3H7l3-3-1-7Zm3 10v6"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>', review: '<path d="M4 12a8 8 0 1 0 3-6M4 4v5h5"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function shell(content: string) {
  root.innerHTML = `
    ${demoMode ? `<aside class="demo-banner" aria-label="Modo de demostración"><strong>Demo — datos de ejemplo, nada se guarda en tus sesiones</strong><span><button data-action="reset-demo">Restablecer demo</button><button data-action="start-real">Empezar de verdad</button></span></aside>` : ""}
    <header class="topbar">
      <button class="brand" data-action="home" aria-label="Audio Margin: inicio"><span class="brand-mark">AM/</span><span>Audio Margin</span></button>
      <div class="privacy-signal"><span aria-hidden="true"></span> Solo en este dispositivo</div>
      ${demoMode ? "" : `<button class="text-button" data-action="license">Licencia</button>`}
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <div class="live-region" aria-live="polite" aria-atomic="true">${h(processing)}</div>`;
  bindGlobal();
}

function render() {
  const session = active();
  if (!session) return renderEmpty();
  renderWorkspace(session);
}

function renderEmpty() {
  shell(`<section class="empty-layout" aria-labelledby="empty-title">
    <div class="session-rail">
      <p class="eyebrow">Archivo local / 00</p>
      <button class="primary full" data-action="new">${icon("plus")} Nueva sesión</button>
      <p class="rail-note">Tu audio no se sube. El modelo se ejecuta aquí.</p>
    </div>
    <div class="empty-copy">
      <p class="kicker">Notas de audio privadas</p>
      <h1 id="empty-title" tabindex="-1">Transcribe.<br><em>Marca lo importante.</em></h1>
      <p class="lede">Transcribe una clase o reunión en español, fija tus propias preguntas al momento exacto y vuelve a un máximo de cinco.</p>
      <div class="empty-actions">
        <button class="primary" data-action="new">Importar una grabación</button>
        <button class="secondary" data-action="sample">Probar con un ejemplo</button>
      </div>
      <ul class="trust-list" aria-label="Privacidad y control">
        <li><b>01</b> Transcripción local</li><li><b>02</b> Sin cuentas</li><li><b>03</b> Borrado completo</li>
      </ul>
    </div>
  </section>`);
}

function renderWorkspace(session: Session) {
  const filtered = session.segments.filter((segment) => segment.text.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const pins = session.pins.map((pin) => ({ ...pin, segment: session.segments.find((s) => s.id === pin.segmentId) })).filter((pin) => pin.segment);
  shell(`<div class="workspace">
    <aside class="session-rail" aria-label="Sesiones">
      <div><p class="eyebrow">Archivo local / ${state.sessions.length.toString().padStart(2, "0")}</p>
      <button class="primary full" data-action="new">${icon("plus")} Nueva sesión</button></div>
      <nav class="session-list" aria-label="Grabaciones">
        ${state.sessions.map((item) => `<button class="session-item ${item.id === session.id ? "active" : ""}" data-session="${item.id}"><span>${h(item.title)}</span><small>${new Date(item.createdAt).toLocaleDateString("es", { day: "2-digit", month: "short" })} · ${item.pins.length} marcas</small></button>`).join("")}
      </nav>
      <div class="rail-bottom"><button class="text-button export" data-action="export">Exportar JSON</button><button class="danger-link" data-action="delete">${icon("trash")} Borrar esta sesión</button></div>
    </aside>
    <section class="transcript-pane" aria-labelledby="session-title">
      <div class="transcript-head">
        <div><p class="eyebrow">${h(session.variant)} · ${h(session.model)}</p><h1 id="session-title" tabindex="-1">${h(session.title)}</h1></div>
        <label class="search">${icon("search")}<span class="sr-only">Buscar en la transcripción</span><input type="search" value="${h(query)}" placeholder="Buscar /" data-search /></label>
      </div>
      <div class="transport" aria-label="Controles de audio">
        <button class="transport-play" data-action="play" aria-label="Reproducir o pausar">${icon(audio && !audio.paused ? "pause" : "play")}</button>
        <span class="timecode">${formatTime(currentTime)}</span>
        <input data-scrub type="range" min="0" max="${Math.max(1, session.duration ?? session.segments.at(-1)?.end ?? 1)}" step="0.1" value="${currentTime}" aria-label="Posición del audio" />
        <span class="timecode muted">${formatTime(session.duration ?? session.segments.at(-1)?.end ?? 0)}</span>
      </div>
      ${processing ? `<div class="process" role="status"><div><span>${h(processing)}</span><b>${processingProgress ? `${processingProgress}%` : "local"}</b></div><progress max="100" value="${processingProgress || undefined}"></progress></div>` : ""}
      <div class="segments" aria-label="Transcripción enlazada por tiempo">
        ${filtered.length ? filtered.map((segment) => segmentRow(segment, session)).join("") : `<div class="zero"><b>No hay coincidencias.</b><span>Prueba otra palabra o borra la búsqueda.</span></div>`}
      </div>
    </section>
    <aside class="margin" aria-labelledby="margin-title">
      <div class="margin-head"><div><p class="eyebrow">Tu margen</p><h2 id="margin-title">Preguntas fijadas</h2></div><span class="pin-count">${pins.length}</span></div>
      ${pins.length ? `<div class="pins">${pins.map((pin, index) => `<article class="pin-card"><div class="pin-meta"><span>0${index + 1}</span><button data-unpin="${pin.id}" aria-label="Quitar esta marca">Quitar</button></div><button class="pin-jump" data-seek="${pin.segment!.start}"><time>${formatTime(pin.segment!.start)}</time>${h(pin.segment!.text)}</button><p>${h(pin.note)}</p></article>`).join("")}</div>` : `<div class="margin-empty">${icon("pin")}<p>Fija una frase y escribe la pregunta que quieres poder responder después.</p><small>Atajo: P</small></div>`}
      <div class="review-dock"><div><span>Próximo repaso</span><b>${Math.min(5, pins.length)} / 5</b></div><button class="primary full" data-action="review" ${pins.length ? "" : "disabled"}>${icon("review")} Repasar ahora</button></div>
    </aside>
  </div>`);
  bindWorkspace(session);
  ensureAudio(session);
}

function segmentRow(segment: Segment, session: Session) {
  const pinned = session.pins.some((pin) => pin.segmentId === segment.id);
  const live = activeSegmentId === segment.id;
  return `<article class="segment ${live ? "playing" : ""}" data-segment="${segment.id}">
    <button class="timestamp" data-seek="${segment.start}" aria-label="Ir a ${formatTime(segment.start)}">${formatTime(segment.start)}</button>
    <button class="segment-text" data-seek="${segment.start}">${h(segment.text)}</button>
    <button class="pin-button ${pinned ? "pinned" : ""}" data-pin="${segment.id}" aria-label="${pinned ? "Editar pregunta fijada" : "Fijar esta frase"}">${icon("pin")}<span>${pinned ? "Fijada" : "Fijar"}</span></button>
  </article>`;
}

function bindGlobal() {
  root.querySelectorAll<HTMLElement>("[data-action='new']").forEach((el) => el.addEventListener("click", showImportDialog));
  root.querySelector("[data-action='sample']")?.addEventListener("click", enterDemo);
  root.querySelector("[data-action='home']")?.addEventListener("click", () => { state.activeId = undefined; persist(); stopAudio(); render(); });
  root.querySelector("[data-action='license']")?.addEventListener("click", showLicenseDialog);
  root.querySelector("[data-action='reset-demo']")?.addEventListener("click", resetDemo);
  root.querySelector("[data-action='start-real']")?.addEventListener("click", startReal);
}

function bindWorkspace(session: Session) {
  root.querySelectorAll<HTMLElement>("[data-session]").forEach((el) => el.addEventListener("click", () => { state.activeId = el.dataset.session; query = ""; stopAudio(); persist(); render(); }));
  root.querySelector("[data-action='delete']")?.addEventListener("click", () => deleteSession(session));
  root.querySelector("[data-action='export']")?.addEventListener("click", () => exportSession(session));
  root.querySelector("[data-action='play']")?.addEventListener("click", togglePlayback);
  root.querySelector("[data-action='review']")?.addEventListener("click", () => showReview(session));
  root.querySelector<HTMLInputElement>("[data-search]")?.addEventListener("input", (event) => { query = (event.target as HTMLInputElement).value; renderWorkspace(session); root.querySelector<HTMLInputElement>("[data-search]")?.focus(); });
  root.querySelector<HTMLInputElement>("[data-scrub]")?.addEventListener("input", (event) => seek(Number((event.target as HTMLInputElement).value)));
  root.querySelectorAll<HTMLElement>("[data-seek]").forEach((el) => el.addEventListener("click", () => seek(Number(el.dataset.seek))));
  root.querySelectorAll<HTMLElement>("[data-pin]").forEach((el) => el.addEventListener("click", () => showPinDialog(session, el.dataset.pin!)));
  root.querySelectorAll<HTMLElement>("[data-unpin]").forEach((el) => el.addEventListener("click", () => { session.pins = session.pins.filter((p) => p.id !== el.dataset.unpin); persist(); render(); }));
}

function dialogFrame(title: string, body: string, wide = false) {
  const dialog = document.createElement("dialog");
  dialog.className = wide ? "dialog wide" : "dialog";
  dialog.innerHTML = `<div class="dialog-bar"><span>Audio Margin</span><button data-close aria-label="Cerrar">×</button></div><div class="dialog-body"><h2>${title}</h2>${body}</div>`;
  document.body.append(dialog);
  dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
  return dialog;
}

function showImportDialog() {
  if (state.sessions.length >= 3 && !hasLicense()) { showLicenseDialog(); return; }
  const dialog = dialogFrame("Nueva transcripción", `<form id="import-form">
    <p>Elige un modelo y confirma que las personas grabadas dieron su permiso.</p>
    <label>Variante de español<select name="variant"><option value="Español general">Español general</option><option value="España">España</option><option value="México y Centroamérica">México y Centroamérica</option><option value="Caribe">Caribe</option><option value="Andino">Andino</option><option value="Río de la Plata">Río de la Plata</option></select></label>
    <fieldset><legend>Modelo local</legend><label class="choice"><input type="radio" name="model" value="tiny" /> <span><b>Ágil</b><small>75 MB · borradores rápidos</small></span></label><label class="choice"><input type="radio" name="model" value="base" checked /> <span><b>Equilibrado</b><small>142 MB · recomendado</small></span></label><label class="choice"><input type="radio" name="model" value="small" /> <span><b>Preciso</b><small>466 MB · equipos recientes</small></span></label></fieldset>
    <label class="consent"><input type="checkbox" name="consent" required /> <span>Confirmo que tengo permiso para usar esta grabación.</span></label>
    <p class="fine">El audio no sale de este equipo. La primera vez se descarga el modelo abierto elegido.</p>
    <button class="primary full" type="submit">Elegir grabación</button>
  </form>`);
  const form = dialog.querySelector<HTMLFormElement>("#import-form")!;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (String(data.get("model")) === "small" && !hasLicense()) { dialog.close(); showLicenseDialog(); return; }
    if (!isTauri) { dialog.close(); enterDemo(); return; }
    try {
      const selected = await open({ multiple: false, filters: [{ name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg", "flac"] }] });
      if (!selected || typeof selected !== "string") return;
      dialog.close();
      await importAndTranscribe(selected, String(data.get("model")), String(data.get("variant")));
    } catch (error) { announceError(error); }
  });
}

async function importAndTranscribe(path: string, model: string, variant: string) {
  const audioName = path.split(/[\\/]/).at(-1) ?? "Grabación";
  const session: Session = { id: uid(), title: audioName.replace(/\.[^.]+$/, ""), audioName, audioPath: path, createdAt: new Date().toISOString(), variant, model, segments: [], pins: [] };
  state.sessions.unshift(session); state.activeId = session.id; persist();
  processing = "Preparando el modelo local…"; processingProgress = 8; render();
  try {
    const ready = await invoke<boolean>("model_ready", { model });
    if (!ready) { processing = "Descargando el modelo una sola vez…"; processingProgress = 18; render(); await invoke("download_model", { model }); }
    processing = "Escuchando y transcribiendo en este dispositivo…"; processingProgress = 55; render();
    const result = await invoke<{ segments: Segment[]; duration: number }>("transcribe_audio", { path, model, variant });
    session.segments = result.segments.map((item) => ({ ...item, id: item.id || uid() })); session.duration = result.duration;
    processing = ""; processingProgress = 0; persist(); render();
  } catch (error) { processing = ""; processingProgress = 0; persist(); render(); announceError(error); }
}

function sampleSession(): Session {
  const createdAt = "2026-08-30T12:00:00.000Z";
  return {
    id: "demo-como-recordamos",
    title: "Cómo recordamos",
    audioName: "Clase de muestra sintetizada",
    audioPath: "/assets/audio-margin-sample.wav",
    sample: true,
    duration: 12,
    createdAt,
    variant: "Español general",
    model: "muestra incluida",
    segments: sampleSegments,
    pins: sampleSegments.slice(0, 5).map((segment, index) => ({
      id: `demo-pin-${index + 1}`,
      segmentId: segment.id,
      note: [
        "¿En qué se diferencian recordar y reconocer?",
        "¿Por qué ayuda el esfuerzo al aprendizaje?",
        "¿Qué hace útil una pregunta de repaso?",
        "¿Cuándo necesito volver al audio?",
        "¿Por qué el repaso se limita a cinco?"
      ][index],
      createdAt
    }))
  };
}

function createSample() {
  const session = sampleSession();
  state.sessions = [session]; state.activeId = session.id; persist(); render();
}

function enterDemo() {
  demoMode = true;
  history.replaceState({}, "", location.pathname.startsWith("/demo") ? location.pathname : "?demo=1");
  clearDemoState();
  state = { sessions: [] };
  createSample();
}

function resetDemo() {
  stopAudio();
  clearDemoState();
  state = { sessions: [] };
  createSample();
  root.querySelector<HTMLElement>("h1")?.focus();
}

function startReal() {
  stopAudio();
  clearDemoState();
  if (location.pathname.startsWith("/demo")) { location.assign("/"); return; }
  demoMode = false;
  history.replaceState({}, "", "/");
  state = loadState(false);
  render();
  root.querySelector<HTMLElement>("h1")?.focus();
}

function showPinDialog(session: Session, segmentId: string) {
  if (session.pins.length >= 5 && !session.pins.some((pin) => pin.segmentId === segmentId) && !hasLicense()) { showLicenseDialog(); return; }
  const segment = session.segments.find((s) => s.id === segmentId)!;
  const existing = session.pins.find((p) => p.segmentId === segmentId);
  const dialog = dialogFrame(existing ? "Editar pregunta" : "Fijar en el margen", `<p class="quote"><time>${formatTime(segment.start)}</time>${h(segment.text)}</p><form id="pin-form"><label for="note">¿Qué quieres poder recordar?</label><textarea id="note" name="note" required maxlength="280" rows="4" placeholder="Escribe tu propia pregunta o pista…">${h(existing?.note ?? "")}</textarea><div class="form-row"><span class="fine">No generamos la pregunta por ti.</span><button class="primary" type="submit">Guardar en el margen</button></div></form>`);
  const note = dialog.querySelector<HTMLTextAreaElement>("#note")!; note.focus();
  dialog.querySelector<HTMLFormElement>("#pin-form")!.addEventListener("submit", (event) => { event.preventDefault(); const value = note.value.trim(); if (!value) return; if (existing) existing.note = value; else session.pins.push({ id: uid(), segmentId, note: value, createdAt: new Date().toISOString() }); persist(); dialog.close(); render(); });
}

function showReview(session: Session) {
  const items = nextReview(session); let index = 0; const dialog = dialogFrame("Repaso de cinco", `<div id="review-card"></div>`, true);
  const draw = () => {
    const item = items[index]; const segment = session.segments.find((s) => s.id === item.segmentId)!;
    dialog.querySelector("#review-card")!.innerHTML = `<div class="review-progress"><span>Pregunta ${index + 1} de ${items.length}</span><progress max="${items.length}" value="${index + 1}"></progress></div><p class="review-question">${h(item.note)}</p><details><summary>Mostrar contexto</summary><blockquote><time>${formatTime(segment.start)}</time>${h(segment.text)}</blockquote></details><button class="primary full" id="review-next">${index + 1 === items.length ? "Terminar repaso" : "La tengo · siguiente"}</button>`;
    dialog.querySelector("#review-next")!.addEventListener("click", () => { item.reviewedAt = new Date().toISOString(); persist(); if (++index >= items.length) { dialog.close(); render(); } else draw(); });
  }; draw();
}

function showLicenseDialog() {
  const token = localStorage.getItem(LICENSE_KEY) ?? "";
  const dialog = dialogFrame("Licencia de pago", `<p>La versión gratuita permite tres sesiones y cinco marcas por sesión. Una compra única de <b>€24</b> activa sesiones y marcas sin límite, además del modelo grande.</p><a class="primary full link-button" href="https://api.sociobot.in/api/v1/products/spanish-audio-notes/checkout" target="_blank" rel="noreferrer">Comprar una vez · €24</a><hr><form id="license-form"><label for="license-token">¿Ya compraste? Pega tu licencia</label><input id="license-token" name="token" value="${h(token)}" autocomplete="off" /><button class="secondary full" type="submit">Verificar licencia</button><p class="fine" id="license-status" aria-live="polite">La versión gratuita sigue disponible durante la verificación.</p></form>`);
  dialog.querySelector<HTMLFormElement>("#license-form")!.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = dialog.querySelector<HTMLInputElement>("#license-token")!.value.trim();
    const status = dialog.querySelector("#license-status")!;
    if (!value) { status.textContent = "Pega el código de licencia para continuar."; return; }
    storeUnverifiedLicense(value);
    status.textContent = "Verificando…";
    try {
      const response = await fetch(`https://api.sociobot.in/api/v1/products/spanish-audio-notes/verify?license=${encodeURIComponent(value)}`);
      if (!response.ok) throw new Error(`License verification returned ${response.status}`);
      const result = await response.json() as { valid?: unknown; reason?: string; expires_at?: string | null };
      if (typeof result.valid !== "boolean") throw new Error("License verification returned an invalid response");
      storeLicenseVerdict(value, { valid: result.valid, reason: result.reason, expires_at: result.expires_at });
      status.textContent = result.valid ? "Licencia activa en este dispositivo." : "Esta licencia ya no está activa. Revisa el código o compra una nueva.";
    } catch {
      status.textContent = hasLicense()
        ? "Sin conexión. Usamos la última verificación válida y lo intentaremos más tarde."
        : "Sin conexión. La licencia debe verificarse una vez antes de activar las funciones de pago.";
    }
  });
}

function ensureAudio(session: Session) {
  if (!session.audioPath || audio?.dataset.session === session.id) return;
  stopAudio();
  audio = new Audio();
  audio.dataset.session = session.id;
  const audioSmoke = new URLSearchParams(location.search).get("audio_smoke") === "1";
  let audioSmokeComplete = false;
  audio.addEventListener("timeupdate", () => { currentTime = audio!.currentTime; activeSegmentId = session.segments.find((s) => currentTime >= s.start && currentTime < s.end)?.id ?? ""; const range = root.querySelector<HTMLInputElement>("[data-scrub]"); if (range) range.value = String(currentTime); root.querySelector(".timecode")!.textContent = formatTime(currentTime); root.querySelectorAll(".segment").forEach((el) => el.classList.toggle("playing", (el as HTMLElement).dataset.segment === activeSegmentId)); if (audioSmoke && !audioSmokeComplete && currentTime > 0.5) { audioSmokeComplete = true; void invoke("complete_audio_smoke", { state: "playing" }); } });
  audio.addEventListener("loadedmetadata", () => {
    session.duration = audio!.duration;
    persist();
    if (audioSmoke) void invoke("complete_audio_smoke", { state: "metadata" });
  });
  if (session.sample && isTauri) {
    const currentAudio = audio;
    void fetch(session.audioPath)
      .then((response) => {
        if (!response.ok) throw new Error(`Sample audio returned ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (audio !== currentAudio) return;
        audioObjectUrl = URL.createObjectURL(blob);
        currentAudio.src = audioObjectUrl;
      })
      .catch(announceError);
  } else if (isTauri) {
    audio.src = convertFileSrc(session.audioPath);
  } else {
    audio.src = session.audioPath;
  }
}
function stopAudio() { audio?.pause(); audio = undefined; if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl); audioObjectUrl = undefined; currentTime = 0; activeSegmentId = ""; }
function togglePlayback() { if (!audio) return; if (audio.paused) void audio.play(); else audio.pause(); render(); }
function seek(value: number) { currentTime = value; if (audio) { audio.currentTime = value; void audio.play(); } render(); }
function deleteSession(session: Session) { if (!confirm(`¿Borrar “${session.title}” y todas sus marcas de este dispositivo? Esta acción no se puede deshacer.`)) return; stopAudio(); state.sessions = state.sessions.filter((s) => s.id !== session.id); state.activeId = state.sessions[0]?.id; persist(); render(); }
function exportSession(session: Session) { const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${session.title.replace(/[^a-z0-9áéíóúñ_-]+/gi, "-")}.json`; link.click(); URL.revokeObjectURL(url); }
function announceError(error: unknown) { const message = error instanceof Error ? error.message : String(error); const dialog = dialogFrame("No pudimos transcribir", `<p>${h(message)}</p><p>Comprueba que el archivo no esté dañado, que haya espacio libre y vuelve a intentarlo. Tu audio no se ha subido.</p><button class="primary full" data-close-error>Cerrar</button>`); dialog.querySelector("[data-close-error]")?.addEventListener("click", () => dialog.close()); }

window.addEventListener("keydown", (event) => {
  if ((event.target as HTMLElement).matches("input, textarea, select")) return;
  const session = active(); if (!session || document.querySelector("dialog[open]")) return;
  if (event.key === " ") { event.preventDefault(); togglePlayback(); }
  if (event.key === "[") seek(Math.max(0, currentTime - 5));
  if (event.key === "]") seek(currentTime + 5);
  if (event.key.toLowerCase() === "p" && activeSegmentId) showPinDialog(session, activeSegmentId);
  if (event.key === "/") { event.preventDefault(); root.querySelector<HTMLInputElement>("[data-search]")?.focus(); }
});

const returnedLicense = new URLSearchParams(location.search).get("license");
if (returnedLicense) {
  storeUnverifiedLicense(returnedLicense);
  const params = new URLSearchParams(location.search);
  params.delete("license");
  history.replaceState({}, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
}
async function refreshLicense() {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token || !licenseNeedsRefresh()) return;
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/spanish-audio-notes/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error(`License verification returned ${response.status}`);
    const verdict = await response.json() as { valid?: unknown; reason?: string; expires_at?: string | null };
    if (typeof verdict.valid !== "boolean") throw new Error("License verification returned an invalid response");
    storeLicenseVerdict(token, { valid: verdict.valid, reason: verdict.reason, expires_at: verdict.expires_at });
  } catch {
    recordLicenseAttempt(token);
    /* A previously verified token remains usable offline; an unverified token stays locked. */
  }
}
if (demoMode && !active()) createSample();
else render();
void refreshLicense();
