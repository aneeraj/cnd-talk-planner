# Talk Planner · Cloud Native Denmark 2026

An unofficial talk planner for [Cloud Native Denmark 2026](https://cloudnativedenmark.dk/schedule) (Nov 19–20, Copenhagen). Browse the full two-day schedule, pick the talks you want to attend, and keep the plan saved in your browser — no account, no server, nothing leaves your device.

## What it does

- Full schedule for both days — Main stage, Breakout, and Workshop rooms
- One-tap "Add to plan" per talk; picks persist in `localStorage` (key `cnd2026-plan-v1`)
- "My plan" drawer with copy-to-clipboard export and clear-all
- Time-clash detection — flags overlapping picks (e.g., a 90-minute workshop vs. parallel sessions)
- Search by talk / speaker / tag, room filters, per-day pick counts
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
| `app.js` | app logic |
| `schedule-data.js` | talk data extracted from the official Sessionize feed |
| `render.yaml` | Render deploy blueprint |

---

*Not affiliated with Cloud Native Denmark. Talk data mirrors the official schedule; selections are stored only in your own browser.*
