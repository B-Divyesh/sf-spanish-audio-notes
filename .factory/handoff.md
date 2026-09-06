# Audio Margin v0.1.6 repair handoff

## Outcome

Candidate `06a7738755776b30298ea99172b47abb16804dcc` failed the
second independent verification. This repair resolves every P1 and P2 finding
in `.factory/verification-2.md` and preserves the local Spanish transcription,
review, isolated sample, and paid offer.

- Final product implementation: `0a075664620c5afe41c84e3b72482030413f6385`
- Core blocker repair: `c7989ea06f577d2233434a5f634fed127ab9b1f4`
- Release-test cleanup: `452719093553b5a14df3b8d633cca979055faa75`
- Release packaging: `eb1e7cd1aac0c89cd2bb8749188bd9102d69b204`
- Throttle-aware model claim: `33bf0eb34da04f1d6bee2119a499bf966ff2d08e`
- Documentation SHA: the later commit containing this handoff
- Static product: `https://spanish-audio-notes.sociobot.in/`
- Desktop release: `v0.1.6`
- Release workflow: `34020085278`

Only the existing `sf-spanish-audio-notes` static site and this product's
GitHub repository were changed. No database, other product, shared service,
staging slot, billing provider, or secret store was read or changed.

## Findings fixed

### Linux AppImage audio

The AppImage bundles Tauri's GStreamer media framework. In the native app, the
sample is fetched into a blob before WebKit creates its media source. A release
smoke path starts the real AppImage under X11 and D-Bus with a PulseAudio sink,
uses a real pointer click on Play, and requires playback past 0.5 seconds. It
also fails on a WebKit crash or missing `autoaudiosink`.

Both a locally built AppImage and the published v0.1.6 AppImage passed this
behavior check. The downloaded v0.1.6 artifact matched SHA-256
`ad851112c07bce0f14c00e20bc825dcfd9d82b48e04460118564d1065713cbe1`
before the smoke test ran.

### Unverified offline licenses

A returned or pasted token is stored as unverified. Paid limits remain locked
until the product verification endpoint returns a valid verdict for that same
token. Invalid, expired, revoked, wrong-product, malformed, and first-time
offline paths remain locked. A matching valid verdict keeps offline access;
the app retries verification no more than once per day.

The browser claim observes both outcomes: a forged offline token opens the
license dialog, while a previously verified matching token opens the paid
import path offline.

### Observable claim tests

- Installer coverage serves local manifests and package bytes, executes the
  shipped shell and PowerShell installers, accepts matching packages, then
  corrupts each checksum and observes rejection with no installed file.
- Model coverage calls the production Rust install path with fixture bytes. It
  observes an atomic valid install and deletion of a corrupt partial download
  without replacement of the valid model.
- Native transcription coverage uses the pinned official Tiny Whisper model
  and the shipped synthetic Spanish WAV. It disables outbound proxies during
  the production decode/transcription call and checks the returned Spanish
  text.
- Native privacy/account claims now cover no-account import, local
  transcription after the documented model download, and AppImage playback.

### Touch and keyboard access

Header, footer, legal, and dialog-close targets meet the 44 px baseline. The
main landmark is focusable. Activating the skip link moves keyboard focus to
main content. Browser checks cover the navigation target sizes and focus.

### Web sample audio found during final cold QA

The final live audit found that `/demo/` called Tauri's native file URL helper
in a normal browser. The sample still rendered, but audio had no usable source
and the page emitted console errors. `0a07566` keeps the normal web sample on
its same-origin URL and uses native path conversion only inside Tauri.

The repaired claim now clicks Play, observes the scrubber advance, records all
requests, and requires a clean console. This is why the final release is
v0.1.6 rather than v0.1.5.

### Earlier review findings

The first verification's findings remain fixed. The 21-entry claim manifest is
present. `/demo/` uses only the `demo:` namespace and has a persistent label,
reset, and start-for-real action. Release lookup uses the CORS-enabled GitHub
API with a calm offline fallback. CSP is a response header. Unknown paths use
the designed HTTP 404. The required demo, copy, design, and catalog records are
present.

## Product and copy check

The cold first screen states:

- Job: **Transcribe audio y añade preguntas.**
- Audience: students and professionals reviewing Spanish classes or meetings
- First action: **Probar con datos de ejemplo**

The one-click sample opens six transcript segments, playable audio, and five
distinct learner questions. Its persistent label says sample changes are not
saved to real sessions. Reset restores the sample. Leaving it keeps a seeded
real-data value unchanged. `.factory/copy-audit.md` records every landing-page
sentence and terminology; no audited sentence exceeds 22 words or uses a
banned marketing word.

The verb-first catalog description is 80 characters and is copied to
`/work/.evidence/catalog-description.txt`:

```text
Transcribe Spanish recordings locally and link your questions to exact moments.
```

## Verification

The documented setup begins with `npm ci`. The final GitHub verify job uses a
fresh checkout. Locally, all 21 manifest commands were also run individually.

```text
npm ci                                      PASS (0 vulnerabilities)
npm test                                    PASS (9/9)
npm run test:e2e                            PASS (21/21)
21 individual claim commands               PASS (21/21)
npm run test:installers                     PASS (shell + PowerShell; good + corrupt)
npm run test:native-integrity               PASS (real install/reject behavior)
npm run test:native-transcription           PASS (real Whisper model + Spanish WAV)
npm run test:claim:appimage                 PASS (built AppImage playback)
npm run check                               PASS
cargo test --manifest-path src-tauri/Cargo.toml
                                             PASS (4 passed, 1 claim test ignored)
npm run build                               PASS (dist/app and dist/site)
```

The ignored Rust test is the expensive transcription test invoked explicitly
by `npm run test:native-transcription` and by release CI.

Production sizes:

- App JavaScript: 21.99 KB raw / 8.28 KB gzip
- Demo JavaScript: 20.33 KB raw / 7.69 KB gzip
- Site JavaScript: 2.31 KB raw / 1.19 KB gzip
- App CSS: 13.85 KB raw / 3.64 KB gzip
- Site CSS: 10.10 KB raw / 2.78 KB gzip

Fresh mobile Lighthouse on the deployed product:

- Performance 100
- Accessibility 100
- Best Practices 100
- SEO 100
- FCP 0.91 s, LCP 1.55 s, TBT 28 ms, CLS 0

## Live verification

`dist/site` from `0a07566` was deployed to the existing product resource. The
deployed `index.html` SHA-256 exactly matches the local build. The factory URL
verifier reports a 1.01-second cold load, no console errors, Spanish language,
one h1, one main landmark, complete image alternatives, and labelled buttons.

Fresh 1440 × 900 desktop and 390 × 844 reduced-motion phone contexts confirmed
the job, audience, and sample action before scrolling. The phone sample played,
advanced its time control, showed six segments and five distinct questions,
kept its label after reload, reset correctly, worked offline after loading, and
did not change a seeded real-data value. The sample made no cross-origin
request and produced no console or page error.

Playwright axe found no serious or critical issue on `/`, `/demo/`,
`/privacy/`, `/terms/`, or `/404.html`. Each has `lang=es`, one h1, one main,
a route-specific title, and no horizontal overflow. `/privacy/` and `/terms/`
return 200. An unknown path returns the designed page with deliberate HTTP 404.

Evidence is in `/work/.evidence/spanish-audio-notes/`:

- `live-browser-report.json`
- `live-desktop.png`
- `live-phone.png`
- `live-demo-phone.png`
- `verify-url-v016.txt`

The current Lighthouse JSON is `.factory/lighthouse.json`.

Release workflow `34020085278` completed successfully for tag `v0.1.6`.
The public release contains macOS arm64 and x64 DMGs, Linux AppImage, DEB and
RPM packages, Windows MSI and EXE packages, `latest.json`, and `SHA256SUMS`.
The live Linux download button resolves to the v0.1.6 AppImage.

## Paid offer and external dependency

The offer remains a **€24 one-time license** for unlimited sessions, unlimited
questions, and the larger Small (`Preciso`) local model. The free tier remains
three sessions, five questions per session, and the Tiny/Base models. Public
billing metadata is in `/work/.evidence/billing-offer.json` with the exact
origin and license-validation path.

Billing registration is still a separate operator dependency. The checkout
route was last observed returning HTTP 404, so purchase is unavailable until
the operator registers the existing offer. No paid deliverable was removed or
made free, and no mock checkout or invented credential was added.

## Known boundaries and operator actions

- Register the existing `spanish-audio-notes` €24 one-time offer with return
  URL `https://spanish-audio-notes.sociobot.in/`.
- macOS and Windows packages are unsigned. Signing requires the Apple
  notarization and Windows Authenticode credentials documented by the release
  workflow.
- The app downloads the selected pinned Whisper model after explicit consent.
  Audio and transcripts stay in the desktop app; there is no hosted recording,
  account, telemetry, or automatic updater.
