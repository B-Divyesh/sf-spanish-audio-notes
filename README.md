# Audio Margin

Audio Margin is a private desktop workbench for students and professionals who need to revisit Spanish-language classes or meetings. It transcribes an imported recording on the user’s computer, keeps a time-linked transcript, and lets the user pin a sentence with their own recall question. Every review is deliberately capped at five pins.

It is not a meeting bot, cloud recording archive, speaker-monitoring tool, or automatic flashcard generator.

## What works

- Imports WAV, MP3, M4A, OGG, or FLAC after explicit consent confirmation.
- Downloads a selected Whisper `tiny`, `base`, or `small` model once, then transcribes locally in Spanish.
- Supports six Spanish regional-context options.
- Seeks between audio and timestamped transcript segments.
- Stores sessions and learner-authored pins locally, with search, JSON export, and complete session deletion.
- Presents no more than five prompts in a review and records completed reviews.
- Works by keyboard: `Space` play/pause, `P` pin active phrase, `[`/`]` seek five seconds, `/` search.
- Includes a useful free tier (3 sessions, 5 pins each) and a one-time €24 license unlock through Sociobot.

## Development

Requirements: Node.js 22+, Rust stable, CMake, libclang, and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your operating system.

```sh
npm ci
npm run dev          # desktop UI in a browser
npm run dev:site     # installer site
npm test
npm run test:e2e
npm run check
```

Build both web targets reproducibly with:

```sh
npm run build
```

The desktop frontend lands in `dist/app/`; the deployable static site, including `index.html`, lands in `dist/site/`. Build a local platform package with `npm run tauri build`. GitHub Actions is the supported path for distributable binaries.

## Install

Download the detected installer at [spanish-audio-notes.sociobot.in](https://spanish-audio-notes.sociobot.in), or use:

```sh
curl -fsSL https://spanish-audio-notes.sociobot.in/install.sh | sh
```

```powershell
irm https://spanish-audio-notes.sociobot.in/install.ps1 | iex
```

Both scripts verify SHA-256 against the release manifest before installing or opening a package. Version 0.1 installers are not code-signed: on macOS use right-click → **Open**; on Windows choose **More info → Run anyway** only if the checksum matches this repository’s release.

## Releases

Tags matching `v*` build macOS arm64/x64 DMGs, Windows MSI/EXE packages, and Linux AppImage/deb packages on GitHub-hosted runners. The workflow publishes `SHA256SUMS` and `latest.json` alongside every release. It does not include an updater because the application does not check for updates automatically.

## Privacy and models

Audio decoding and Whisper inference happen in the Rust process on the device. The app has no telemetry. The only runtime network calls are the user-initiated model download and license checkout/verification. Models are downloaded from the upstream `ggerganov/whisper.cpp` repository; Whisper source code and model weights are provided under the MIT license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), the public `/privacy/` page, and `/terms/`.

## Repository map

- `app/` — desktop UI
- `src-tauri/` — native audio decode and Whisper inference
- `site/` — installer landing and legal pages
- `public/install.*` — checksum-verifying installers
- `.factory/design.md` — visual thesis and asset provenance
- `.github/workflows/release.yml` — cross-platform release matrix

## License

MIT. See [LICENSE](LICENSE).
