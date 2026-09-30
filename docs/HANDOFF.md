# RakshaNet — complete handoff (read this first in a new chat)

Last updated: 1 Oct 2026. Owner of all code now: **Ashish** (team lead). Sam and Daksh finished their parts; Ashish continues alone with Claude Code.
Other docs: `CONTRACT.md` (data shapes + every API), `README.md` (judge-facing), `docs/demo-script.md` (demo clicks, needs refresh for the newest UI), `docs/progress/ashish.md` (step log), `docs/RUNBOOK.md` (original phase plan, historical).

---

## 1. What it is

An AI-assisted **112 emergency control room for Bengaluru** (hackathon theme: Agentic AI, team CodeStorm).
Only user: the **dispatcher**. Citizens call 112; the dispatcher logs the call; four AI assistants propose which ambulances / fire trucks / rescue teams go where; the dispatcher approves (nothing moves without a human); crews report back by radio and the dispatcher presses buttons; the AI re-plans only what changed.

Pitch line: *"A 112 dispatcher speaks the call in Kannada; RakshaNet's agents understand it, plan it live in front of you with real tool calls, watch the city, warn before hospitals fill up, never act without human approval — and keep working (backup planner, manual mode) even when the AI is down."*

## 2. Live, accounts, secrets

- Live: **https://rakshanet-three.vercel.app** — Vercel project `ashish-shukla81/rakshanet`, **auto-deploys every push to `main`**. Vercel CLI is logged in on Ashish's laptop (`vercel env ls`, `vercel redeploy <url> --target production`).
- GitHub: `ashish8112/rakshanet`.
- Login is ON in production (`DISPATCHER_PASSWORD`, `AUTH_SECRET` on Vercel). **The password is known to Ashish; never write it into the repo.** Scripts can send header `x-dispatcher-password: <password>`.
- MongoDB Atlas: DB `rakshanet` (live) and **`rakshanet_test`** (for testing; same cluster: replace `/rakshanet?` with `/rakshanet_test?` in the URI).
- Gemini: model `gemini-3.5-flash-lite` (bigger Flash models were overloaded; `gemini-2.5-*` closed to new users). Free tier = 15 requests/min per key → `GEMINI_API_KEYS` holds 2 keys (rotation). All in `.env.local` (git-ignored) and on Vercel.
- Reset demo data (WIPES the DB): `curl -X POST <site>/api/seed -H "x-dispatcher-password: <password>"`. Live data was last reset on 1 Oct.
- After the hackathon: change the Atlas DB password, regenerate the Gemini keys and the control room password (all were typed in chat). Private notes (not in git): `docs/ashish-notes.md`.

## 3. Stack and layout

Next.js **16** App Router (breaking changes vs older Next: middleware is `proxy.js`; read `node_modules/next/dist/docs/` before using unfamiliar APIs), JavaScript, Tailwind **v4**, Leaflet/react-leaflet, Mongoose, `@google/genai`.

```
app/page.js                 Control room: emergencies (left), map (centre), plan panel (right) with ✨ AI / ✋ Manual switch
app/fleet/page.js           Fleet: vehicles grouped (on a job by emergency, free/out of service by type), crew buttons, add/remove, hospital & shelter beds
app/history/page.js         History: impact numbers + full activity log (filters, "Show the AI's steps")
app/login/page.js           Sign-in (name + shared password)
app/layout.js               Theme boot script (dark mode before paint)
app/globals.css             Styles + DARK MODE palette (re-maps Tailwind colour variables under .dark)
proxy.js                    Guards every page and API (401 JSON for APIs, redirect for pages)
app/api/...                 All routes (see CONTRACT.md 5.2 + 5.6 + 5.7)
components/AppShell.js      Header (page links, co-pilot bell, theme button, help dialog, sign out) + phone bottom bar
components/useControlRoom.js  Shared data hook (incidents, resources, plan, 15 s refresh)
components/EmergencyList.js Cards: plates + arrival countdown, Arrived / Job done per vehicle, Mark resolved, Cancel report, AI question box
components/NewEmergency.js  Form + ⚡ Quick fill (speak/paste the call → AI fills) + PlaceSearch (OpenStreetMap)
components/PlanTab.js       AI plan: live agent stream while thinking, plan, approve & send / reject
components/ManualTab.js     Manual mode: choose emergency, set severity/needs, tick nearest free vehicles, send (no AI)
components/UnitsTab.js      Fleet page body (sections, crew buttons, AddUnitForm, PlaceRow beds)
components/HistoryTab.js, ImpactStrip.js, CopilotBell.js, MapView.js, movement.js (simulated driving), labels.js (plain words), theme.js, useMode.js, ui.js, api.js (all fetch calls), geo.js
lib/db/                     Mongoose models: Incident, Resource (+vehicleNumber), Plan (+source ai|backup|manual), AgentLog, Activity
lib/tools/index.js          Deterministic tools (distance, ETA, nearest free units, capacity, duplicates, validateAssignments)
lib/agents/                 gemini.js (JSON calls, retries, key rotation, 429 retryDelay), incidentAssessment, routeLogistics (tools only), resourceAllocation, commandPlanning, backupRules, prompts/
lib/orchestrator/           generatePlan.js (the agent chain + coverage check + escalation + backup + onStep live events), planActions.js (approve/reject/edit/manual), planActivity, planRequest, respond
lib/activity.js             logActivity(), actorFrom(request) (dispatcher name from the session)
lib/auth.js                 Signed session cookie (HMAC, Web Crypto)
scripts/generate_seed_data.py → data/resources.json (26 units with plates; FIR-03 & FIR-04 out of service on purpose) + data/demo-incidents.json
```

## 4. Features (all live unless noted)

1. **Single control room** + Fleet + History pages; light/**dark mode** (🌙 in header/login, follows device until chosen).
2. **New emergency**: ⚡ Quick fill — speak (browser speech, en-IN / hi-IN / kn-IN) or paste the caller's words → `POST /api/intake` (Gemini; keyword backup) fills type, description, people, place query, and "also ask" questions. Place search via `/api/geocode` (Nominatim, Bengaluru box, tries shorter queries: "Kristu Jayanti College hostel" → finds Kristu Jayanti University).
3. **AI mode**: saving an emergency plans automatically. `POST /api/plan/stream` streams every step and tool call live into the plan panel. Agents: assessment (Gemini) → route & logistics (tools only) → allocation (Gemini, repaired + coverage check) → command (Gemini). Escalation: uncovered needs with expected wait. Replans change only what changed ("AMB-02 replaces AMB-03 — AMB-03 is now unavailable"). Vague low-severity reports → `needs_info` + question on the card.
4. **Backup planner**: if Gemini fails, rules finish the plan (`source: "backup"`, "🛟 Backup plan" badge).
5. **Manual mode** (✋): the dispatcher does everything without AI — `POST /api/plan/manual` then `/api/dispatch`; severity/needs set by hand via PATCH incident.
6. **Vehicles**: plates everywhere (e.g. KA 03 AM 1260); simulated movement from base to incident over the tools ETA, "arriving in N min", ⏩ Demo speed 10× (localStorage).
7. **Cards on the home page**: Arrived / Job done per vehicle; ✓ Mark resolved; ✕ Cancel report (status `cancelled`, kept for the record); Open / Closed tabs.
8. **Fleet**: crew buttons (Arrived, Broke down → replan on home via `/?replan=<id>`, Job done, Out of service / Back in service); ＋ Add unit (plate, base via place search); Remove (not while on a job); hospitals & shelters: ＋ Admitted / − Discharged / Edit total.
9. **Co-pilot bell** (rule-based on live data): AI questions, plan waiting, no free vehicles of a type, hospital/shelter almost full, crews silent ≥20 min, clusters of ≥3 similar reports.
10. **History**: `activities` collection — who reported, AI plans, approvals/rejections, manual plans, units sent, crew updates, capacity changes, resolved/cancelled, fleet changes, resets; filter by emergency/kind; impact numbers (today's emergencies, resolved, people helped, call→dispatch, average arrival).
11. **Login** (name + shared password), 12 h signed cookie.

## 5. How to test (never test on live data without asking)

```bash
# app against the TEST database, with a demo password
MONGODB_URI="<uri with /rakshanet_test?>" DISPATCHER_PASSWORD=demo-shift npx next start -p 3058   # after npm run build
curl -X POST http://localhost:3058/api/seed -H "x-dispatcher-password: demo-shift"
```
Browser end-to-end tests are written as Node scripts that drive headless Chrome over the DevTools protocol (no extra packages): see `brag-output/work/*.mjs` on Ashish's laptop (git-ignored), e.g. `e2e2.mjs` (full AI flow), `e2e-manual.mjs`, `cards.mjs`, `dark.mjs`, `beds.mjs`. Always `npx eslint app components lib` and `npm run build` before merging.

## 6. Gotchas learned (save time)

- **Only render one layout** (desktop or phone) — a hidden second Leaflet map crashed with "Invalid LatLng (NaN, NaN)" (`useIsDesktop` in `app/page.js`).
- React lint forbids setState directly in effects → defer with `setTimeout(…, 0)` or restructure.
- Dark mode: Tailwind v4 colours are CSS variables → re-mapped once under `.dark` in `globals.css`; `bg-white` overridden separately (`--color-white` is also used for text on buttons). Elements that must stay dark use fixed colours like `bg-[#0f172a]`.
- `components/*` files with `"use client"` can't export constants to server files (`lib/themeScript.js` exists for that reason).
- Headless Chrome: minimum window ~500 px wide; wait ~2–3 s after page load before clicking (hydration); `innerText` shows CSS-uppercased headings in CAPITALS.
- Windows Git Bash mangles non-ASCII in curl args (test Kannada/Hindi with a Node script).
- Stopping a background `next start` task doesn't kill the port on Windows: `Get-NetTCPConnection -LocalPort 3058 | Stop-Process`.
- Gemini free tier 429 → the helper waits Google's `retryDelay` and rotates keys; one plan ≈ 3 calls + 1 per new incident.
- Never add Claude as co-author in commits (Ashish's rule).

## 7. What is left

1. DONE: **Tutorial video** (4:56, 13 chapters, recorded from the real app). Web copy `public/tutorial.mp4` (12.6 MB, 720p) + poster `public/tutorial.jpg`, public without login at https://rakshanet-three.vercel.app/tutorial.mp4 (`proxy.js` matcher skips .mp4). Played by "▶ Watch video" in the header (`VideoDialog` in `components/AppShell.js`) and "▶ Watch the demo video" on the login page. Full-quality master + working files in git-ignored `brag-output/` (`brag.mp4`, `brag.jpg`, `brag-plan.md`, `share-copy.txt`, recorder `work/record2.mjs` + `work/record-tail.mjs`, `work/build-clips.mjs`, `work/build-comp.mjs`, Hyperframes project `composition/`). Re-render: `cd brag-output/composition && NODE_OPTIONS=--max-old-space-size=8192 npx -y hyperframes@0.8.97 render --video-frame-format jpg --workers 3`.
2. DONE: `docs/demo-script.md` rewritten for the newest UI.
3. Hackathon delivery: slides, final checklist; security to-dos after the event.
