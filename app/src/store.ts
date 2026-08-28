import type { AppState, Session } from "./types";

const KEY = "audio-margin:sessions:v1";

export function loadState(): AppState {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as AppState;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [], activeId: parsed.activeId };
  } catch {
    return { sessions: [] };
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function nextReview(session: Session): Session["pins"] {
  return [...session.pins]
    .sort((a, b) => (a.reviewedAt ?? "").localeCompare(b.reviewedAt ?? "") || a.createdAt.localeCompare(b.createdAt))
    .slice(0, 5);
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}
