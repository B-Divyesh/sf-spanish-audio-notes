# Independent verification — FAIL

- **Candidate:** `147ec24368ceb5aa0a29b66043ae518c63dc2d55` (`147ec24 docs: record verified v0.1.3 release`)
- **Live URL:** https://spanish-audio-notes.sociobot.in/
- **Verified:** 2026-08-30, from a clean `npm ci` checkout.
- **Result:** **FAIL — do not release/accept this candidate.**

## Release-blocking findings

### P0 — Required claim contract is absent

`.factory/claims.json` does not exist in the candidate. Consequently there are
no listed claim tests that can be run from the demo entry point. The factory
contract explicitly makes a missing claims file release-blocking. The landing
and README nevertheless make numerous relied-on claims (local processing,
audio never uploaded, no tracking/cloud, model checksum verification,
five-item review, installer SHA-256 verification, and license behaviour) with
no sandboxed claim test.

### P0 — No one-click sample demo on the first live screen

Cold-load evidence for the live landing page has a single primary action,
`Descargar para Linux`; it has no “Try it with sample data” action, `/demo`
route, or `?demo=1` entry. The first screen explains the product in Spanish
well enough, but does not tell a visitor how to try it without installing it.
This independently fails the plain-words and demo-sandbox acceptance tests.

### P0 — The app’s sample mode is not an isolated demo

The browser app does expose `Probar con un ejemplo`, but it writes directly to
`localStorage["audio-margin:sessions:v1"]`, the same real-data key used by
`saveState`. There is no `demo:` namespace, persistent demo notice, Reset
demo, Start for real action, or documented demo URL. In a fresh context the
sample flow created that real key and rendered no demo banner. It therefore
cannot meet the requirement that demo activity never touches real data.

### P1 — Live deployment logs a browser error on every cold page load

Both desktop and 390 px mobile cold loads request
`https://github.com/B-Divyesh/sf-spanish-audio-notes/releases/latest/download/latest.json`.
GitHub blocks that cross-origin fetch with CORS, producing:

```
Access to fetch at 'https://github.com/.../latest.json' ... has been blocked by CORS policy
Failed to load resource: net::ERR_FAILED
```

The source and deployed JavaScript match, so this is in the candidate, not a
stale deployment. The installer contract requires the CORS-enabled GitHub API
for release metadata, rather than the release-download redirect.

### P1 — Required site security/404 delivery is missing

Live responses for `/`, `/privacy/`, `/terms/`, `/robots.txt`, `/sitemap.xml`,
and `/latest.json` have no `Content-Security-Policy` response header. A request
to `/not-a-real-page` returns HTTP 200 and the landing page rather than a real
404. Both violate the published site-structure contract.

### P2 — Required factory artefacts are absent

`.factory/demo.md` and `.factory/copy-audit.md` are absent. The shipped sample
also has only four text segments and no bundled audio, so it cannot demonstrate
the stated five-item review limit with an audible sample project.

## What passed

- `npm ci` completed from the clean checkout (0 audit vulnerabilities).
- `npm test`: **PASS**, 2/2 Vitest tests.
- `npm run test:e2e`: **PASS**, 3/3 existing Playwright tests.
- `npm run build`: **PASS**; it produced `dist/app` and `dist/site`.
  Production sizes: app JS 18.79 KB (7.12 KB gzip), app CSS 13.10 KB
  (3.50 KB gzip), site JS 2.17 KB (1.12 KB gzip), site CSS 8.39 KB
  (2.50 KB gzip), responsive hero 125 KB.
- Local and live deployed site asset SHA-256 values match exactly:
  `site-iPEJwW_F.js` =
  `89e30dfd67a57c333afb2d1af8aea2f5a8a0cf3612c9c47dd630ff3407ee3efc`;
  `site-QPXQPlhQ.css` =
  `5532b163c9217048b40497de1805f68c9948eda97c780dbd217a1c8b758b6a0a`.
  Thus the live error and missing demo are confirmed candidate behaviour.
- Live desktop and 390 px page loads have one h1, `lang="es"`, a visible
  main landmark, no horizontal overflow at 390 px, visible 3 px focus rings,
  and no axe serious/critical findings. Reduced-motion media preference was
  active for the mobile run.
- The local browser fallback sample flow successfully created four pins, opened
  a 4-item review, handled a no-results transcript search and recovery, and
  had no console/page errors. Its 390 px empty and workspace layouts had no
  horizontal overflow; a pin target measured 290 x 44 px. These positive
  checks do not cure the lack of a real demo sandbox or a native app run.
- Site static assets use immutable one-year caching; document/legal pages use
  `max-age=30`. HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and the
  camera/microphone/geolocation Permissions-Policy were present.

## Tests blocked by the verification environment

`npm run check` reached Rust compilation but failed because this disposable
container does not have the system `glib-2.0` development package discoverable
by `pkg-config`; `cargo test --manifest-path src-tauri/Cargo.toml` fails for
the same reason. This is an environment prerequisite documented in the README,
not evidence of an application-source compilation failure. The Tauri desktop
binary and real audio import/transcription could therefore not be independently
executed here.

No direct request to the Sociobot billing API was made: the work order's
resource restriction prohibits connecting to resources other than the
`sf-spanish-audio-notes` scope. Accordingly, the billing rate-limit/429
allowance and license endpoint behaviour remain unverified.

## Evidence

- Cold desktop screenshot: `.factory/evidence/qa-live-cold-desktop.png`
- Cold 390 px screenshot: `.factory/evidence/qa-live-cold-mobile.png`
- Live request log: only same-origin document/CSS/JS/hero requests plus the
  failing GitHub manifest fetch above; no trackers were observed in that flow.

## Required remediation before re-verification

1. Add complete `.factory/claims.json` and one independently runnable,
   observable demo-entry test for every user-facing claim.
2. Add a first-screen `Try it with sample data` route/action and implement a
   genuinely isolated, resettable demo namespace with its documented banner
   and `.factory/demo.md`.
3. Replace the GitHub release-download `fetch` with the documented GitHub API
   metadata request; require a clean console on the deployed page.
4. Send a correct CSP and ship a true 404 response/page.
5. Re-run native checks in an environment containing the documented Tauri
   system dependencies, then verify actual import, model download/integrity,
   transcription, deletion, and local persistence.
