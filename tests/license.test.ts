import { describe, expect, it } from "vitest";
import { LICENSE_CACHE_MS, LICENSE_KEY, LICENSE_VERDICT_KEY, hasVerifiedLicense, licenseNeedsRefresh, recordLicenseAttempt, storeLicenseVerdict, storeUnverifiedLicense } from "../app/src/license";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("license entitlement", () => {
  it("does not treat a token or a mismatched verdict as paid access", () => {
    const storage = new MemoryStorage();
    storeUnverifiedLicense("forged", storage);
    expect(hasVerifiedLicense(storage)).toBe(false);
    storage.setItem(LICENSE_VERDICT_KEY, JSON.stringify({ token: "different", valid: true, checkedAt: Date.now() }));
    expect(hasVerifiedLicense(storage)).toBe(false);
  });

  it("keeps a matching verified verdict available offline and refreshes it daily", () => {
    const storage = new MemoryStorage();
    storeLicenseVerdict("paid-token", { valid: true, reason: "ok" }, storage, 1_000);
    expect(storage.getItem(LICENSE_KEY)).toBe("paid-token");
    expect(hasVerifiedLicense(storage)).toBe(true);
    expect(licenseNeedsRefresh(storage, 1_000 + LICENSE_CACHE_MS - 1)).toBe(false);
    expect(licenseNeedsRefresh(storage, 1_000 + LICENSE_CACHE_MS)).toBe(true);
  });

  it("clears a previous verdict when a different returned token arrives", () => {
    const storage = new MemoryStorage();
    storeLicenseVerdict("old-token", { valid: true }, storage, 1_000);
    storeUnverifiedLicense("new-token", storage);
    expect(storage.getItem(LICENSE_VERDICT_KEY)).toBeNull();
    expect(hasVerifiedLicense(storage)).toBe(false);
  });

  it("records a failed first verification without granting access", () => {
    const storage = new MemoryStorage();
    storeUnverifiedLicense("offline-token", storage);
    recordLicenseAttempt("offline-token", storage, 2_000);
    expect(hasVerifiedLicense(storage)).toBe(false);
    expect(licenseNeedsRefresh(storage, 2_001)).toBe(false);
  });
});
