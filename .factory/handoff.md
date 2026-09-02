# Audio Margin independent verification handoff — FAIL

## Verification 2 outcome (2026-09-02)

**FAIL — do not accept or promote candidate
`06a7738755776b30298ea99172b47abb16804dcc` at
https://spanish-audio-notes.sociobot.in/.**

Fresh independent verification is recorded in
[`.factory/verification-2.md`](./verification-2.md). The deployed static files
match the candidate byte-for-byte, all 18 listed claim commands pass, all local
build/test gates pass, the one-click demo and first-read screen pass, and the
released Debian package completes local Spanish transcription. Acceptance is
blocked by:

1. **P1:** the primary Linux AppImage freezes after creating audio; its WebKit
   render process exits, so both the bundled sample and real import flow fail.
   The `.deb` works on the same Ubuntu 24.04 host.
2. **P1:** any unverified token in `?license=` or local storage bypasses paid
   limits indefinitely when the verification call is offline.
3. **P1:** installer checksum and native model-integrity claim tests only search
   source strings, while several native privacy/account claims are unlisted.
4. **P2:** multiple site navigation links are below 44 × 44 CSS pixels, and the
   skip link changes the fragment without moving focus into `<main>`.

Verification evidence added under `.factory/evidence/` includes the frozen
AppImage, the working DEB transcription/review, fresh desktop/mobile captures,
and the raw Lighthouse report. No product code, infrastructure, DNS, billing,
shared service, secret store, or product resource was modified during this
verification.

## Re-verification commands

```sh
npm ci
npm test
npm run test:e2e
npm run test:claims
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
CI=true npm run tauri build -- --bundles deb
```

The detailed report contains exact checksums, request/header evidence,
Lighthouse metrics, every claim result, and reproduction steps. The previous
builder handoff remains below for historical context; its earlier PASS evidence
is superseded by this independent FAIL.

---

# Audio Margin v0.1.4 repair handoff (builder record; superseded)

## Outcome

Repaired every release blocker from independent report commit `1738ba4dd16edeed49ec30e980fc74b39b9a4e3b` against candidate `147ec24368ceb5aa0a29b66043ae518c63dc2d55`.

Implementation commit: `1ce486d` (`fix: isolate demo and harden release delivery`); verification evidence commit: `8dd1ecf` (`docs: record repair verification evidence`). The static site was deployed to the existing `sf-spanish-audio-notes` Static Web App in resource group `sociobot`; no other service, app settings, database, or secret store was accessed. The custom production URL is `https://spanish-audio-notes.sociobot.in/`.

## Release-blocker repairs

- Added `.factory/claims.json` with 16 independently runnable browser claims and two unit-level native/installer claims. `npm run test:claims` runs all tagged coverage.
- Added a visible first-screen `Probar con datos de ejemplo` action and public `/demo/` entry point.
- Split real and sample state into `audio-margin:sessions:v1` and `demo:audio-margin:sessions:v1`. Demo mode never reads the real key. Its persistent banner provides `Restablecer demo` and `Empezar de verdad`.
- Bundled an original 12-second audio texture, six Spanish transcript segments, and five ready-to-review learner questions. Added `.factory/demo.md` and a three-frame screenshot walkthrough.
- Replaced the browser fetch to `github.com/.../latest/download/latest.json` with `api.github.com/repos/B-Divyesh/sf-spanish-audio-notes/releases/latest`. Release metadata is cached for one hour. Missing assets produce a calm release-page fallback with no uncaught error.
- Added a response-header CSP allowing only the GitHub metadata API, removed the SPA catch-all, and added a designed `/404.html` response override. Unknown production URLs now return HTTP 404.
- Added `.factory/copy-audit.md`, route metadata, canonical/Open Graph data, a social image, sitemap demo entry, and complete legal-route headers/footers.
- Added release-workflow verification before the Tauri build matrix. Release binaries use Rust stripping, thin LTO, and one codegen unit.

## Exact local verification

Run from a clean clone:

```sh
npm ci
npm test
npm run test:e2e
npm run test:claims
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
CI=true npm run tauri build -- --bundles deb
```

Results on 2026-08-30:

- `npm ci`: passed; 76 packages installed; 0 audit vulnerabilities.
- `npm test`: 7/7 Vitest unit and contract tests passed.
- `npm run test:e2e`: 20/20 Playwright 1.58.2 browser tests passed, including the console-clean offline release fallback.
- `npm run test:claims`: 16/16 tagged browser tests and 2/2 tagged unit contracts passed.
- `npm run check`: TypeScript and Cargo check passed after installing the documented Tauri Linux packages.
- Native tests: 3/3 passed, including decoding the bundled WAV as 12 seconds at 16 kHz.
- `npm run build`: passed and produced `dist/app/` plus `dist/site/`.
- Initial bundles: app JS 20.42 KB / 7.71 KB gzip; app CSS 13.81 KB / 3.63 KB gzip; site JS 2.21 KB / 1.13 KB gzip; site CSS 9.89 KB / 2.77 KB gzip; hero 125 KB.
- Local package: `Audio Margin_0.1.4_amd64.deb`, 5.1 MB, containing a stripped 12 MB x86-64 PIE executable. Local package SHA-256: `12fda526664630e07020cbba88fb47ebbf1ac9eb9b6260bd2bc90f5f22cd3fb8`.
- Static Web Apps emulator: `/`, `/demo/`, `/privacy/`, and `/terms/` returned 200 with CSP; `/not-a-real-page` returned 404.
- Production-style browser checks at desktop and 390 px: no console/page errors, no horizontal overflow, one h1, main landmark, reduced motion enabled, and zero axe serious/critical findings on both `/` and `/demo/`.
- Factory `verify-url.sh`: landing and demo passed title, `lang=es`, one h1, main, alt text, labelled buttons, and clean-console checks. Evidence is under `.factory/evidence/`.
- Lighthouse 13 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.9 s, CLS 0, TBT 0 ms. Raw report: `.factory/evidence/lighthouse.json`.
- Offline/update policy: after `/demo/` loads, reset and five-item review remain usable with the browser offline. The desktop app has no automatic updater and ships no updater manifest.

## Live verification

- Production deploy completed on 2026-08-30 from `dist/site/`.
- `GET https://spanish-audio-notes.sociobot.in/`: HTTP 200 with the new demo action and response CSP.
- `GET https://spanish-audio-notes.sociobot.in/not-a-real-page`: HTTP 404 with the designed Audio Margin 404 page.
- Live release metadata is requested only from `https://api.github.com`; the former browser CORS URL is absent from source and tests assert it is never requested.
- GitHub Actions release run `33297802427` completed successfully for tag `v0.1.4`: verification plus macOS arm64/x64, Linux, Windows, and release jobs all passed.
- Public release: `https://github.com/B-Divyesh/sf-spanish-audio-notes/releases/tag/v0.1.4`, published with eight assets: two macOS DMGs, Linux AppImage and DEB, Windows MSI and EXE, `latest.json`, and `SHA256SUMS`.
- Downloaded `latest.json` validates as version `0.1.4` with five platform entries and 64-character SHA-256 values. The downloaded CI DEB passed `sha256sum --check` with `4635d653b97738c5f3be96e731182567eefe4a7a9616900c41f753c479d97e12`.
- Fresh live desktop and 390 px contexts resolved the detected download buttons to real v0.1.4 assets without console errors. An offline context made no GitHub API request and displayed the calm release-page fallback.

## Known boundaries

- Installers remain unsigned. macOS notarization and Windows Authenticode require owner certificates.
- The full 142–466 MB Whisper model path was compile-tested but not downloaded or transcribed in this worker. Native decoding, resampling, model allowlisting, pinned hashes, mismatch deletion, and sample decoding are covered locally; GitHub Actions builds the platform packages.
- The bundled demo audio is an original synthesized texture, not speech. It demonstrates playback, timestamps, pinning, search, export, review, reset, and isolation without implying transcription accuracy.
- The billing checkout was not called because this work order forbids connecting to non-`sf-spanish-audio-notes` resources. License behavior is covered with a recorded endpoint response in Playwright.

## Needs operator action

- Add Apple and Windows signing credentials when signed packages are required: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `WINDOWS_CERT_PFX`, and `WINDOWS_CERT_PASSWORD`.
- Confirm the production Sociobot billing registration remains set to the €24 one-time product and the Audio Margin return URL.
