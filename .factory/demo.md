# Audio Margin sample demo

- Public URL: `https://spanish-audio-notes.sociobot.in/demo/`
- Local URL: `http://127.0.0.1:5173/demo/` after `npm run dev:site`
- Desktop first-run action: `Probar con un ejemplo`

The demo opens directly into “Cómo recordamos”. It includes one original 12-second synthesized audio texture, six Spanish transcript segments, and five learner-written questions ready for review. The sample is deterministic and bundled at `public/assets/audio-margin-sample.wav`; it needs no account, model download, or external request.

Demo state uses only `localStorage["demo:audio-margin:sessions:v1"]`. Real sessions use `localStorage["audio-margin:sessions:v1"]`. The demo never reads or writes the real key.

`Restablecer demo` deletes the demo key and recreates the original sample. `Empezar de verdad` deletes the demo key; on the public demo it returns to the installer page, while the desktop app returns to the empty real workspace.
