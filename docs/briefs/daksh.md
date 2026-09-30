# Brief: Daksh

**Role:** Frontend, the control room dashboard (the "face"). Branch: `frontend`.

## What I build

The screens judges will see: report form, Leaflet map, incident queue, plan review panel (approve, edit, reject, before and after view), agent activity timeline, responder simulator buttons, escalation and duplicate alerts. The screens must make the AI agents' work VISIBLE and the dispatcher's control obvious.

## Folders I own

`app/page.js`, `app/globals.css`, `components/`, `mock/` (new pages under `app/` only if Daksh explicitly asks)

Read only: `app/api/`, `lib/`, `data/`, `scripts/` (backend).
Never edit shared files (package.json, app/layout.js, CONTRACT.md, CLAUDE.md, .env.example, README.md, docs/RUNBOOK.md); ask Ashish.

## Rules specific to my part

- Talk to the backend ONLY through the `fetch("/api/...")` calls in `CONTRACT.md` 5.2. Never invent fields; if the UI needs data the contract lacks, STOP and tell Daksh.
- All fetch calls live in ONE file, `components/api.js`, with a `USE_MOCK` switch. Mock data in `mock/` is shaped exactly like the contract examples. Switching to real data = flipping `USE_MOCK`, nothing else.
- Every response is `{ ok: true, data }` or `{ ok: false, error }`: handle both.
- Agents take several seconds: always show loading states, disable buttons while waiting, show errors.
- Map: `leaflet` + `react-leaflet`, OpenStreetMap tiles, `dynamic(..., { ssr: false })`, import `leaflet/dist/leaflet.css`.
- Look: clean control room style, dark header, clear severity colours 1 to 5, readable at a glance.

## Extra duties

Testing edge cases through the UI after 8 PM. Slides. Screen recording for the demo video.

## My steps

See the Daksh sections of each phase in `docs/RUNBOOK.md`.
