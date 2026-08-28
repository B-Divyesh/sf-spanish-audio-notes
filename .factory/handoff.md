# Audio Margin v0.1.1 handoff

## What was built

- A Tauri 2 desktop application for private, local Spanish transcription.
- Consent-gated WAV/MP3/M4A/OGG/FLAC import with selectable Whisper `tiny`, `base`, and `small` models.
- Model downloads from upstream whisper.cpp with pinned SHA-256 verification before use.
- Six Spanish regional-context choices, time-linked transcript playback, search, keyboard navigation, and clear processing/error/empty states.
- Learner-authored pinned questions, a capped five-item review, review timestamps, JSON export, and confirmed local deletion.
- Local-first persistence with no account or telemetry. Audio is never uploaded.
- One-time Sociobot license flow: hosted checkout, return-token capture, paste-to-restore, optimistic offline unlock, and at-most-daily verification.
- A responsive Spanish installer site in `dist/site`, with OS detection, privacy/terms pages, generated hero art, and checksum-verifying shell/PowerShell installers.
- Tauri release automation for macOS arm64/x64, Windows, Linux AppImage/deb, `SHA256SUMS`, and `latest.json`.

## Verification

Run from a clean checkout:

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run check
```

Completed locally on 2026-08-28:

- `npm test`: 2/2 unit tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 2/2 native tests passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; `dist/site/index.html` and `dist/app/index.html` produced.
- Playwright 1.58.2: 3/3 flows passed, including 390 px viewport and axe serious/critical = 0.
- Factory `verify-url.sh`: HTTP 200, no console errors, `lang=es`, one `h1`, `main` present, no missing image alt or unnamed buttons; report in `.factory/evidence/verify.json`.
- Lighthouse 13 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.9 s, CLS 0, TBT 0 ms.
- Initial bundles: app JavaScript 18.79 KB (7.12 KB gzip), app CSS 13.10 KB (3.50 KB gzip), landing JavaScript 2.17 KB (1.12 KB gzip), hero WebP 125 KB / responsive source 26 KB.
- Native release build: `.deb` 5.5 MB and AppImage 76.3 MB. AppImage is a stripped x86-64 static PIE launcher.
- Release-manifest generator exercised against all five platform keys and produced five checksums.
- `npm audit`: 0 vulnerabilities.

## Product boundaries

- Audio Margin imports an existing consented recording; it does not secretly capture microphones or join meetings.
- Transcription quality varies with noise and specialist vocabulary, so the UI keeps learner notes authored by the learner.
- Models are downloaded on first use because even the smallest supported model is about 75 MB; no model or recording is hosted by this product.
- The free tier allows 3 local sessions and 5 pins per session. Small-model access and unlimited sessions/pins use the one-time license. Accessibility, deletion, and JSON export remain free.

## Known gaps

- Installers are intentionally unsigned until the owner provides platform certificates. OS warnings are disclosed on the site and in the README.
- The static site’s checked-in `latest.json` is a safe pre-release fallback; production reads the release-hosted manifest. It points to the release page until the first workflow completes.
- Automatic app updating is not implemented, so no updater manifest is shipped.

## Needs operator action

1. Register `spanish-audio-notes` in the Sociobot billing engine with a €24 one-time price and return URL `https://spanish-audio-notes.sociobot.in/`.
2. For signed builds, add and wire `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `WINDOWS_CERT_PFX`, and `WINDOWS_CERT_PASSWORD`. The current workflow deliberately expects none and creates unsigned packages.
3. Deploy exactly `dist/site/`; do not deploy `dist/app/` as the public landing site.
4. After the first release completes, download one asset and compare it against `SHA256SUMS`; the workflow also embeds the same digest in `latest.json`.

## Next steps

- Pilot with varied classroom acoustics and regional vocabulary; tune the initial prompt only from observed errors.
- Add an in-app update check only if signed releases and an explicit update policy are established.
- Consider encrypted-at-rest session storage after user research; current storage inherits operating-system account protection.
