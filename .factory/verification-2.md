# Independent verification 2 — FAIL

- **Candidate:** `06a7738755776b30298ea99172b47abb16804dcc`
- **Live URL:** https://spanish-audio-notes.sociobot.in/
- **Verified:** 2026-09-02 from a clean checkout on Ubuntu 24.04 x86_64
- **Result:** **FAIL — do not accept or promote this candidate.**

The repaired web demo, static deployment, Debian package, and all listed claim
commands passed. The primary Linux AppImage cannot complete the product's core
audio job, an unverified string unlocks paid limits while offline, and the claim
contract does not test several promises observably. These are independent
release blockers.

## Mandatory gates performed first

### Claims manifest

`.factory/claims.json` exists. Before any other QA, `npm ci` completed with 76
packages and zero audit vulnerabilities, then every listed `test` command was
run separately from the demo entry point. All 18 commands passed:

| Claim | Result | Observable test entry |
| --- | --- | --- |
| `demo-isolation` | PASS | Demo key remained separate from a seeded real key |
| `demo-local-only` | PASS | Demo requests remained same-origin |
| `five-item-review` | PASS | Review contained five questions |
| `json-export` | PASS | Downloaded JSON contained the active session |
| `keyboard-search` | PASS | `/` focused transcript search |
| `time-linked` | PASS | Timestamp selection moved playback to 4 seconds |
| `consent-model-options` | PASS | Consent was required; 3 models and 6 contexts shown |
| `no-hidden-capture` | PASS | No microphone/camera request was made |
| `one-time-price` | PASS | €24 checkout and paste-to-restore UI present |
| `no-tracking` | PASS | No third-party script or analytics request |
| `local-storage` | PASS | Seeded session survived reload |
| `session-delete` | PASS | Complete session deletion worked |
| `free-limits` | PASS | Third-session and fifth-pin limits exercised |
| `release-download` | PASS | Matching GitHub release asset selected |
| `release-fallback` | PASS | Calm fallback rendered without console error |
| `installer-checksum` | PASS command; **invalid evidence** | Test only searches source text; see P1 finding |
| `model-integrity` | PASS command; **invalid evidence** | Test only searches source text; see P1 finding |
| `license-return` | PASS command; **incomplete behavior** | Storage/cache path passed; offline unlock bypass remains |

The passing commands satisfy the initial execution gate. They do not cure the
claim-test design defects documented below.

### Cold first-read test

Fresh live Chromium at 1440 × 900 returned HTTP 200 with no console or page
error. The first viewport says:

- **What it does:** “Transcripción local en español” and “Deja tus preguntas
  junto al audio.”
- **For whom:** “Para quien estudia clases o reuniones en español y quiere
  volver al momento exacto.”
- **What to click first:** “Probar con datos de ejemplo,” which opens `/demo/`
  in one click and immediately shows a prepared class, audio, transcript, and
  five questions.

The first screen therefore passes the mandatory plain-words and one-click demo
gate. Evidence: `evidence/verification-2-first-read.png`.

## Release-blocking findings

### P1 — The advertised Linux AppImage freezes when audio is created

The live landing page detects Linux and selects
`Audio.Margin_0.1.4_amd64.AppImage`; `install.sh` selects the same AppImage.
The public file is 82,713,080 bytes and its SHA-256
`972371ca5f27b59752e1dc87d0b017c83fe52351aeedb0422f79357fcaeba81b`
matches the release `SHA256SUMS`.

On a fresh Ubuntu 24.04 x86_64 desktop session under Xvfb/DBus with the normal
GStreamer ALSA and good-plugin packages installed, the AppImage opens its empty
state. Clicking **Probar con un ejemplo** renders the sample workspace, then
logs:

```text
GStreamer element autoaudiosink not found. Please install it
(WebKitWebProcess): GLib-GObject-WARNING: invalid (NULL) pointer instance
(WebKitWebProcess): GLib-GObject-CRITICAL: g_signal_connect_data: assertion ... failed
```

The WebKit render process then exits while the native shell remains. The frozen
screen no longer responds to **Empezar de verdad**. A separate real-file import
stays at “Preparando el modelo local… 8%” and never creates the model file.
The extracted AppImage bundles GLib/GStreamer/WebKit libraries but no GStreamer
plugin directory.

This is isolated to packaging: the release `.deb` on the same host downloaded
the 77,691,713-byte Tiny model, verified its expected hash, transcribed a
representative Spanish WAV locally, accepted a learner question, and opened the
review. Evidence:

- `evidence/verification-2-appimage-frozen.png`
- `evidence/verification-2-deb-transcription.png`
- `evidence/verification-2-deb-review.png`

Linux users are directed to a package that cannot use the sample audio or the
real transcription flow. The alternative `.deb` working does not make the
primary download acceptable.

### P1 — Any returned token unlocks paid limits while verification is offline

In a fresh browser context, opening `?license=forged-offline-token` stores that
string immediately. With the verification request forced to fail, three free
sessions were seeded and **Nueva sesión** was selected. The paid import dialog
opened instead of the license dialog; the large-model gate is bypassed the same
way.

The cause is direct in `app/src/main.ts`: `hasLicense()` is only
`Boolean(localStorage.getItem(...))` and all paid gates call it. The background
failure intentionally retains the token but does not require a cached valid
verdict. This lets any string in the return URL or local storage unlock paid
features indefinitely while offline. Optimistic offline access must depend on
a previously cached valid verdict, not mere token presence.

### P1 — Two listed claim tests do not prove their observable promises

`@claim:installer-checksum` only reads three source files and searches for
strings such as `sha256sum`. It does not run either installer with a correct and
incorrect checksum and observe accept/reject behavior.

`@claim:model-integrity` only searches Rust source for `File::open`, three hash
literals, and `remove_file`. It does not execute a corrupt download, prove
deletion, or prove Whisper transcription from the shipped native entry point.
The AppImage failure above demonstrates why source-string inspection is not an
observable claim test. This violates the required “every claim is a test”
contract even though both commands exit zero.

The live site and README also make unlisted native privacy/account promises,
including “No necesitas una cuenta,” “Tu audio permanece en tu equipo,” and
“The app has no telemetry.” The browser-only `no-tracking` and demo-only
`demo-local-only` tests do not exercise the native import/transcription network
boundary.

## Other findings

### P2 — Several site links are below the 44 px touch-target baseline

At both 1440 px and 390 px, header/footer navigation links measure only 16–20
CSS pixels high (for example, **Demo** is 42 × 16 and **Privacidad** is 73 ×
16). The attached accessibility contract requires every touch target to be at
least 44 × 44 CSS pixels.

### P2 — The skip link does not move keyboard focus into main content

The first Tab visibly focuses the skip link with a 3 px high-contrast outline.
Pressing Enter changes the URL fragment to `#main`, but the active element is
`BODY`, because the main landmark is not programmatically focusable. Keyboard
users must resume tabbing through the header rather than continuing from main.

## Clean local verification

Commands and results:

```text
npm ci                                      PASS (76 packages, 0 vulnerabilities)
npm test                                    PASS (7/7)
npm run test:e2e                            PASS (20/20)
npm run check                               PASS (TypeScript and Cargo check)
cargo test --manifest-path src-tauri/Cargo.toml
                                             PASS (3/3 native tests)
npm run build                               PASS (dist/app and dist/site)
CI=true npm run tauri build -- --bundles deb
                                             PASS
```

The documented Ubuntu Tauri build packages were installed before rerunning the
Rust checks. The local candidate DEB is 5,265,704 bytes with SHA-256
`7938a555508a71254e80b5a0832c1435de9b09ec855c53c04513105625d37564`.

Production asset budgets passed comfortably:

- app JS 20.42 KB raw / 7.71 KB gzip; app CSS 13.81 KB / 3.63 KB gzip
- demo JS 19.76 KB / 7.44 KB gzip
- site JS 2.21 KB / 1.13 KB gzip; site CSS 9.89 KB / 2.77 KB gzip
- mobile hero 26,146 bytes; full hero 127,834 bytes

## Functional and recovery coverage

- Corrupt local storage recovered to the empty state without an exception.
- Import displayed 3 local models and 6 Spanish regional contexts. Submitting
  without consent stayed in the dialog and focused the consent control.
- Selecting the paid Small model opened the €24 license dialog.
- Empty, mocked-invalid, and network-failed license responses produced plain
  recovery messages.
- Transcript search handled an impossible query, displayed a no-results state,
  and restored all six segments after clearing.
- Keyboard `/` focused search. Review-dialog focus landed on its close control;
  Escape closed it.
- Demo reset restored the prepared session. **Empezar de verdad** removed only
  the `demo:` key and left a seeded real-data key unchanged.
- A stored title containing HTML was rendered as text; no element was injected.
- The released DEB completed real local model download, Spanish transcription,
  pinning, and review. The released AppImage failed as documented above.

## Live deployment, privacy, and accessibility

Fresh desktop (1440 × 900), mobile (390 × 844), and reduced-motion contexts
covered `/`, `/demo/`, `/privacy/`, `/terms/`, and an unknown route.

- All real routes returned 200. The unknown route returned a designed HTTP 404.
- Each route has `lang="es"`, one h1, a main landmark, and no horizontal
  overflow. Body text is 17 px desktop and 16 px mobile.
- Axe found zero serious or critical issues on every page at both viewport
  sizes.
- All real routes had zero console/page errors. Chromium emits its standard
  failed-document console line for the intentional 404 navigation only.
- Landing requests used the product origin plus `https://api.github.com` for
  release metadata. Demo and legal routes were same-origin only. No trackers,
  third-party scripts, microphone request, or camera request were observed.
- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and the restrictive
  `Permissions-Policy` were present. Documents use
  `public,must-revalidate,max-age=30`; hashed assets use
  `public,max-age=31536000,immutable`; `latest.json` uses `no-cache`.
- Lighthouse mobile: Performance 98, Accessibility 100, Best Practices 100,
  SEO 100; FCP 1.1 s, LCP 1.5 s, TBT 170 ms, CLS 0, Speed Index 1.2 s. Raw
  report: `evidence/verification-2-lighthouse.json`.

Mobile evidence:

- `evidence/verification-2-mobile-landing.png`
- `evidence/verification-2-mobile-demo.png`

This is not a PWA and has no service worker, so service-worker update/offline
reload checks are not applicable. It has no sign-in. It owns no server-side
application endpoint; only static hosting is deployed. The shared Sociobot
billing service's live rate allowance was not probed because the work order
forbids connecting to shared services outside this product's resource scope;
license client behavior was exercised with recorded/mocked responses.

## Candidate, live, and release identity

Local `dist/site` files and the deployed responses match byte-for-byte,
including HTML, CSS, JS, hero assets, sample WAV, installer scripts,
`latest.json`, robots, and sitemap. Representative SHA-256 values:

- `index.html`: `de6ee92587c60d401cf778749db9a2fdcd553780881033c09b77fd7a2f282a01`
- site JS: `3986a54b53f844eb0a5e4f1a723ea614fa44fd661d41e71c1b6c0191e1b05f10`
- demo JS: `81c51a429f76ef87aff382b0db8881fd705125b257b7c734ea3a26aaf131054f`
- sample WAV: `b16f804b4627ec0bbdd15a4e66fbe0a05a0c8182637dd4bc32c34af6e276cb83`

The static live deployment therefore matches candidate `06a7738` exactly.
Release `v0.1.4` points to `1ce486d454beb4a861d3594c7eda1c44779a8efc`.
The candidate's later changes are site/test/evidence files only; `app/` and
`src-tauri/` are unchanged from the tag. The release has all eight expected
macOS, Linux, Windows, checksum, and manifest assets. Downloaded AppImage and
DEB files both match the published checksums.

## Acceptance decision

**FAIL.** Do not accept candidate
`06a7738755776b30298ea99172b47abb16804dcc`. Re-verify after the Linux
AppImage completes sample and real-audio flows, offline paid access requires a
cached valid verdict, observable claim tests replace source-string checks and
cover native privacy promises, and the keyboard/touch findings are corrected.
