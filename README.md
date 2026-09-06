# Audio Margin

Audio Margin turns Spanish recordings into private, time-linked study notes. It is for students and professionals who need to revisit the exact moment behind a question.

The Tauri desktop app asks for consent before import. Its Rust process decodes the chosen file and runs Whisper locally. Sessions stay in the app’s local storage, can be exported as JSON, and can be deleted in full. Each review contains at most five learner-written questions.

Try the isolated sample at [spanish-audio-notes.sociobot.in/demo/](https://spanish-audio-notes.sociobot.in/demo/). It ships with a 12-second audio texture, six transcript segments, and five questions. Demo changes use a separate `demo:` storage key and never touch real sessions.

The free version includes three sessions and five pins per session. A one-time €24 purchase activates unlimited sessions and pins plus the large local model. A token activates paid limits only after a valid Sociobot response. A cached valid verdict keeps that access available offline. There are no analytics or third-party scripts.

## Run and verify

Requirements: Node.js 22+, Rust stable, CMake, libclang, and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your operating system. Full installer claim checks also require PowerShell 7. Linux AppImage checks require Xvfb, D-Bus, PulseAudio, xdotool, and the GStreamer base, good, bad, and ALSA plug-ins.

```sh
npm ci
npm run dev          # desktop UI at http://127.0.0.1:1420
npm run dev:site     # site and demo at http://127.0.0.1:5173
npm test
npm run test:e2e
npm run test:claims
npm run check
npm run build
```

The full build writes the desktop frontend to `dist/app/` and the deployable static site to `dist/site/`. Each entry in [.factory/claims.json](.factory/claims.json) includes its independent command and clean-state sandbox.

## Install and release

Download the detected package from [spanish-audio-notes.sociobot.in](https://spanish-audio-notes.sociobot.in), or run one of these commands:

```sh
curl -fsSL https://spanish-audio-notes.sociobot.in/install.sh | sh
```

```powershell
irm https://spanish-audio-notes.sociobot.in/install.ps1 | iex
```

Both installers verify SHA-256 before opening or installing a package. Version 0.1 packages are unsigned, so the operating system displays its normal warning.

Tags matching `v*` run the GitHub Actions release matrix for macOS arm64/x64, Windows, and Linux. The release includes `SHA256SUMS` and `latest.json`. The public site reads release metadata through `api.github.com` and shows a quiet fallback when an installer is absent.

Deploy only `dist/site/`. Infrastructure, DNS, and billing configuration stay outside this repository.

## Privacy and licensing

The app sends no recording during transcription. It downloads the selected model and contacts Sociobot for checkout and license verification. The public site calls GitHub’s API for release metadata. See [/privacy/](https://spanish-audio-notes.sociobot.in/privacy/) and [/terms/](https://spanish-audio-notes.sociobot.in/terms/).

Whisper source and model weights use the MIT license. Details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Audio Margin itself is MIT licensed; see [LICENSE](LICENSE).
