# Audio Margin visual thesis

## Direction: brutalist concrete and moss

Audio Margin is a quiet workbench, not a meeting dashboard. Its surfaces borrow from cast concrete, field notebooks, fluorescent timecode labels, and moss reclaiming a hard edge. The tension fits the product: exact machine timestamps sit beside imperfect, learner-authored memory cues. The interface is intentionally single-mode and dark; painting every surface explicitly keeps long transcript sessions calm and avoids a decorative theme toggle.

## Tokens

- **Basalt** `#171A17`: page background.
- **Wet concrete** `#252925`: primary surface.
- **Raised concrete** `#30352F`: interactive surface.
- **Chalk** `#F2F0E7`: primary text (13.8:1 on basalt).
- **Dust** `#B8BDB3`: secondary text (8.2:1 on basalt).
- **Moss** `#A9D63F`: action and focus color; **ink** `#11140E` is its contrast color.
- **Lichen** `#D4E9A1`: positive state.
- **Amber tape** `#F3BC58`: warnings.
- **Clay** `#F28C74`: destructive state.
- **Hairline** `#51584F`: dividers and controls.

## Type and spacing

The UI uses two platform-native families to avoid remote font requests and keep the installer small: `Arial Narrow`/`Roboto Condensed`/system sans for headlines and labels, and `ui-monospace` for timestamps, counts, and transcript mechanics. Body text uses the system sans stack at 16–18 px. Type steps are 12, 14, 16, 20, 28, and `clamp(42px, 7vw, 86px)`. Spacing follows an 8 px base with occasional 4 px optical corrections. Long copy is capped at 68 characters.

## Layout and interaction grammar

The app is a three-part desk: a narrow session rail, a central transcript slab, and a right-hand margin for pinned prompts. Transcript rows are not cards; they are one continuous time-indexed page separated by proximity and fine rules. Square corners, exposed borders, blocky labels, and offset shadows create the brutal structure. Moss appears only on the next meaningful action, the active audio passage, and focus rings. On phones, the rail becomes a horizontal header and the margin becomes a bottom sheet-like section; the transcript remains primary.

Keyboard grammar: `Space` plays/pauses when focus is not in a field, `P` pins the active segment, `[` and `]` seek five seconds, and `/` focuses transcript search. All actions remain available as 44 px labelled controls.

## Motion policy

State changes use 180–240 ms opacity and translate transitions with physical origin: a pin moves a few pixels toward the margin, review items rise from the lower edge, and download progress grows linearly. Nothing loops. Under `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and state changes are instant.

## Asset plan and provenance

One generated still-life illustrates the product world on the installer page: a top-down cast-concrete desk holding an anonymous pocket recorder, a rough paper transcript strip, five blank moss-green tabs, and a graphite pencil. It explains local audio plus a deliberately bounded margin without showing fake UI. Crop variants are derived from the same source. Icons are original inline SVG linework authored in the repository.

Prompt sheet:

> Use case: stylized-concept. Asset type: landing-page hero editorial still life. Scene: top-down cast-concrete study desk with honest pores and chipped edges. Subject: an unbranded compact audio recorder, a narrow rough-paper transcript strip with abstract waveform marks (no readable words), a graphite pencil, and exactly five blank moss-green paper tabs aligned in the margin. Style: tactile editorial product photography with brutalist composition, not a glossy render. Composition: landscape, objects weighted to the lower right with calm negative space at upper left. Light: cool overcast window light, hard-edged but soft shadow falloff. Palette: charcoal basalt, wet concrete, chalk paper, living moss green, tiny amber accent. Lens: 50 mm equivalent, top-down. Constraints: no people, no hands, no logos, no text, no watermark, no screens, no brands, no extra tabs. Avoid: gradients, neon, polished SaaS imagery, excessive props, illegible pseudo-writing.

Generation: Azure AI Foundry `factory-image` via `/opt/fleet/lib/gen-image.sh`, generated 2026-08-28. The output is original project artwork. Source PNG and prompt sidecar live in `assets/src/`; optimized WebP is shipped in `public/assets/`.

The three demo walkthrough frames are screenshots of the repository's own sample workspace, captured locally with Playwright on 2026-08-30. They contain only deterministic bundled sample data and are optimized to WebP during `npm run assets`. The sample audio texture is generated deterministically by `scripts/optimize-assets.mjs`; it contains no recorded voice or third-party material.

The native transcription claim fixture at `tests/fixtures/spanish-claim.wav` was generated on 2026-09-06 with the open-source eSpeak NG Spanish voice, then converted to 16 kHz mono PCM with FFmpeg. It contains only the sentence “Este audio en español se transcribe de forma local” and no recorded person.
