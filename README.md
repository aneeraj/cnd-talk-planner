# Talk Planner · Cloud Native Denmark 2026

An unofficial talk planner for [Cloud Native Denmark 2026](https://cloudnativedenmark.dk/schedule) (Nov 19–20, Copenhagen). Browse the full two-day schedule, pick the talks you want to attend, and keep the plan saved in your browser — no account, no server, nothing leaves your device.

## What it does

- Full schedule for both days — Main stage, Breakout, and Workshop rooms
- One-tap "Add to plan" per talk; picks persist in `localStorage` (key `cnd2026-plan-v1`)
- "My plan" drawer with copy-to-clipboard export and clear-all
- **Shareable plan links** — "Share link" copies a `#plan=…` URL; whoever opens it sees your line-up and can merge it into their own picks (merge-only, never overwrites). A scannable **QR code** of the link renders in the drawer.
- **Now / Up next** — on the live conference day, talks currently on (Europe/Copenhagen time) get a pulsing `NOW` badge and the next slot gets `UP NEXT`.
- **🔔 Reminders** — opt-in chip; 5 minutes before each picked talk you get a system notification with the stage to head to (via the service worker — works in the installed PWA and background tabs; in-page alert fallback on iOS).
- **Installable & offline** — PWA manifest + service worker: add it to your home screen and the schedule keeps working when the venue Wi-Fi doesn't.
- Time-clash detection — flags overlapping picks (e.g., a 90-minute workshop vs. parallel sessions)
- Search by talk / speaker / tag, room filters, per-day pick counts
- Compact cards by default; `☰ Detailed view` toggle (one-line excerpts, remembered in localStorage) and per-talk "more info" expansion
- Deep links to every talk's official page on cloudnativedenmark.dk
- Responsive down to 320px, `prefers-reduced-motion` friendly

## Run it

Fully static — no build step, no dependencies.

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Or just open `index.html` directly; it works from `file://` too.

## Deploy

The included `render.yaml` is a [Render Blueprint](https://render.com/docs/infrastructure-as-code) that publishes the repo root as a static site:

```sh
render blueprints launch
```

## Files

| File | Purpose |
|---|---|
| `index.html` | page, styles |
| `planner.js` | app logic |
| `schedule-data.js` | talk data extracted from the official Sessionize feed |
| `qrcode.js` | vendored QR encoder ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), MIT) — used for plan-share QRs, fully offline |
| `sw.js` | service worker (network-first, offline fallback) |
| `manifest.webmanifest` + `icon-*.png` | PWA install support |
| `render.yaml` | Render deploy blueprint |

---

*Not affiliated with Cloud Native Denmark. Talk data mirrors the official schedule; selections are stored only in your own browser.*
