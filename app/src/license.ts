export const LICENSE_KEY = "sb_license:spanish-audio-notes";
export const LICENSE_VERDICT_KEY = "sb_license_verdict:spanish-audio-notes";
export const LICENSE_CACHE_MS = 86_400_000;

export type LicenseVerdict = {
  token: string;
  valid: boolean;
  checkedAt: number;
  reason?: string;
  expiresAt?: string | null;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readLicenseVerdict(storage: StorageLike = localStorage): LicenseVerdict | undefined {
  try {
    const verdict = JSON.parse(storage.getItem(LICENSE_VERDICT_KEY) ?? "null") as Partial<LicenseVerdict> | null;
    if (!verdict || typeof verdict.token !== "string" || typeof verdict.valid !== "boolean" || typeof verdict.checkedAt !== "number") return;
    return verdict as LicenseVerdict;
  } catch {
    return;
  }
}

export function hasVerifiedLicense(storage: StorageLike = localStorage, now = Date.now()): boolean {
  const token = storage.getItem(LICENSE_KEY);
  const verdict = readLicenseVerdict(storage);
  if (!token || !verdict?.valid || verdict.token !== token) return false;
  if (!verdict.expiresAt) return true;
  const expiresAt = Date.parse(verdict.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function storeUnverifiedLicense(token: string, storage: StorageLike = localStorage): void {
  const previous = storage.getItem(LICENSE_KEY);
  storage.setItem(LICENSE_KEY, token);
  if (previous !== token || readLicenseVerdict(storage)?.token !== token) storage.removeItem(LICENSE_VERDICT_KEY);
}

export function storeLicenseVerdict(token: string, verdict: { valid: boolean; reason?: string; expires_at?: string | null }, storage: StorageLike = localStorage, checkedAt = Date.now()): void {
  storage.setItem(LICENSE_KEY, token);
  storage.setItem(LICENSE_VERDICT_KEY, JSON.stringify({
    token,
    valid: verdict.valid,
    reason: verdict.reason,
    expiresAt: verdict.expires_at,
    checkedAt
  } satisfies LicenseVerdict));
}

export function licenseNeedsRefresh(storage: StorageLike = localStorage, now = Date.now()): boolean {
  const token = storage.getItem(LICENSE_KEY);
  if (!token) return false;
  const verdict = readLicenseVerdict(storage);
  return !verdict || verdict.token !== token || now - verdict.checkedAt >= LICENSE_CACHE_MS;
}

export function recordLicenseAttempt(token: string, storage: StorageLike = localStorage, checkedAt = Date.now()): void {
  const current = readLicenseVerdict(storage);
  if (current?.token === token) {
    storage.setItem(LICENSE_VERDICT_KEY, JSON.stringify({ ...current, checkedAt }));
  } else {
    storeLicenseVerdict(token, { valid: false, reason: "unverified" }, storage, checkedAt);
  }
}
