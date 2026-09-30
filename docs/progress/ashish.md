# Progress: Ashish

Claude Code updates this file after every finished step. When asking for help in the Claude chat, paste this whole file.

**Current phase:** 4 (post-feature improvements; Ashish now owns frontend + backend, Sam and Daksh are done)
**Next step:** see "WHERE WE ARE NOW" below
**Branch:** work happens on feature branches merged into `main` (current: `ops-improvements`)

Full step details: `docs/RUNBOOK.md`. Tick `[x]` when a step's "Done when" is true.

## WHERE WE ARE NOW (read this first in a new chat) — updated 30 Sep 2026 evening

Live: https://rakshanet-three.vercel.app (Vercel project `ashish-shukla81/rakshanet`, auto-deploys every push to `main`).
Login is ON in production (env `DISPATCHER_PASSWORD` + `AUTH_SECRET` on Vercel; password known to Ashish, never commit it).
Scripts can call APIs with header `x-dispatcher-password`. Reset live demo data: `curl -X POST https://rakshanet-three.vercel.app/api/seed -H "x-dispatcher-password: <password>"` (wipes live data; the live DB still has the OLD seed, run this before any demo).

Done since Phase 3:
- New single-screen UI (`app/page.js` + `components/`): emergencies left, map centre, AI Plan / Units / Activity tabs right; phone layout with bottom tabs; plain words everywhere (`components/labels.js`).
- Login page `app/login`, guard `proxy.js`, `lib/auth.js`, `/api/auth/login|logout|me`.
- Place search in New emergency (`/api/geocode`, OpenStreetMap Nominatim, Bengaluru only).
- Fixed crash on "Change" location (only one layout/map rendered, `useIsDesktop`).
- Emergency list: newest first. Gemini key rotation (`GEMINI_API_KEYS`, 2 keys on Vercel), model `gemini-3.5-flash-lite`.
- Seed tuned: FIR-03 + FIR-04 out of service so escalation always happens with 2 new fires. `docs/demo-script.md` written.

DONE on branch `ops-improvements` (1 Oct, tested end to end on the test DB: 24/25 UI checks, the 1 miss was a test mistake):
- Pages split: `/` control room (emergencies, map, AI plan only), `/fleet`, `/history`; shared shell `components/AppShell.js`, shared data hook `components/useControlRoom.js`.
- A. Live glass-box planning: `POST /api/plan/stream` (NDJSON) + `streamPlan()`; orchestrator `onStep` emits status/step/tool events; PlanTab shows the real steps and tool calls.
- B. Quick fill: `POST /api/intake` (Gemini reads the caller's words in English/Hindi/Kannada; keyword backup) + mic dictation (browser speech) in New emergency; place search pre-filled; geocode retries shorter queries.
- C. Moving vehicles: `components/movement.js` (simulated from base to incident over the tools ETA; "Demo speed" 10x toggle on the map); cards show plates + "arriving in N min".
- D. Agentic: new emergency is planned automatically; co-pilot bell `components/CopilotBell.js` (AI questions, plan waiting, no units of a type, hospital/shelter almost full, silent crews, clusters).
- E. Backup planner `lib/agents/backupRules.js`; plan `source: "backup"` badge.
- F. Impact strip on History (`components/ImpactStrip.js`).
- I. History log (`activities` collection, `lib/activity.js`, `GET /api/activity`, History page with filters and "Show the AI's steps"); Fleet page grouped (on a job by emergency, free/out of service by type, hospitals & shelters), per-button spinners, instant updates; vehicle plates (`vehicleNumber`, seed script); add unit / remove unit.
- CONTRACT.md 5.6 and README updated.
DONE (1 Oct, merged into main): ops-improvements; LIVE data reset done. Then on branches manual-mode → dark-mode (merged together):
- Manual mode (✋): dispatcher plans without AI (`/api/plan/manual`, severity/needs by hand). 14/14 browser checks.
- Dark mode: theme switch in header and login. Screens checked.
- Hospital/shelter beds: admitted / discharged / edit total (`PATCH /api/resources/:id`).
- Card actions on the home page: Arrived / Job done per vehicle, Mark resolved, Cancel report (`POST /api/incidents/:id/close`, status `cancelled`). 13/13 browser checks.
FULL PROJECT KNOWLEDGE FOR A NEW CHAT: `docs/HANDOFF.md`.

DONE (1 Oct, branch tutorial-video → main): tutorial video (4:56) at `public/tutorial.mp4` (+ `public/tutorial.jpg` poster), public link https://rakshanet-three.vercel.app/tutorial.mp4, "▶ Watch video" in the header, "▶ Watch the demo video" on login. Recording found and fixed: manual send to an already-dispatched incident (reinforcements now allowed), double plates in History, new card not shown while planning, Fleet 0/0 flash. New `docs/demo-script.md`. Third Gemini key added on Vercel (GEMINI_API_KEYS has 3). Full-quality master in `brag-output/brag.mp4` (git-ignored).

NEXT: slides, final checklist; security rotations after the event.

Testing without touching live data: run the app locally against the separate DB `rakshanet_test` (same Atlas cluster, replace `/rakshanet?` with `/rakshanet_test?` in MONGODB_URI), e.g. `MONGODB_URI=... DISPATCHER_PASSWORD=demo-shift npx next start -p 3058`.

Security to-do after the hackathon (also in Ashish's private notes `docs/ashish-notes.md`): change MongoDB password, regenerate Gemini keys and the control room password (they were typed in chat), protect/limit geocode usage.

## Phase 0: Setup and skeleton (1:15 PM to 2:00 PM)

- [x] 0.1 Inspect the repo (only .git, .gitignore, README.md, docs/ existed)
- [x] 0.2 Create the skeleton: Next.js app, .gitignore, packages, folders, CONTRACT.md, .env.example, build passes
- [x] 0.3 First commit and push to `main` (commit `29dd297`)
- [ ] 0.4 Tell the team: "Phase 0 pushed. Pull main, run npm install, copy .env.example to .env.local, checkout your branch."
- [x] 0.5 Vercel deploy: live at https://rakshanet-three.vercel.app (project `ashish-shukla81/rakshanet`, auto-deploys on every push to `main`). Env: `MONGODB_URI`, `GEMINI_API_KEY` set; `GEMINI_MODEL` still MISSING
- [x] 0.6 Branch `backend-agents` exists on GitHub
- Extra (done for Sam): Sam's 0.1 MongoDB Atlas, 0.4 `backend-data` branch, 1.1 DB layer. See `docs/progress/sam.md`.

**Gate 0 (whole team)**
- [ ] All 3 laptops show the app at `localhost:3000`
- [x] Vercel live link opens
- [x] 3 branches exist on GitHub
- [ ] Everyone has read `CONTRACT.md` and has no open questions

## Phase 1: Foundations (2:00 PM to 4:30 PM)

- [x] 1.1 `lib/agents/gemini.js`: JSON-only Gemini call, safe parse, one retry on bad JSON (controlled test passed)
- [x] 1.2 `lib/agents/stubTools.js`: all 7 contract-named fake tools with contract-shaped outputs and 24-hex ids
- [x] 1.3 Incident Assessment agent + prompt: exact contract output validation; orchestrator writes an AgentLog for each successful assessment (controlled tests passed)
- [x] 1.4 Orchestrator v1 + `POST /api/plan/generate`: proposed plan with empty assignments and response envelope (controlled tests and production build passed)
- [x] 1.5 Tested 3 incidents (clear flood sev 4 high, vague 'market' sev 1 low + follow-up questions, building collapse sev 5 high): all valid contract JSON, 2 runs each, ~1-2 s. Fixed on the way: Gemini helper retries on 'high demand'/429/503 and on wrong-shape output; assessment drops extra keys Gemini adds (e.g. `location`). Model: `gemini-3.5-flash-lite` (Flash models were overloaded).

**Gate 1 (whole team)**
- [x] All Phase 1 PRs merged into `main`
- [ ] Report form saves a real incident to MongoDB
- [ ] Map shows the real seeded resources (not mock)
- [x] Assessment agent returns valid JSON for all 3 test incidents

## Phase 2: Core loop (4:30 PM to 8:00 PM)

- [x] 2.1 Route and Logistics agent (`lib/agents/routeLogistics.js`): tool-only, no Gemini. Nearest 3 free units per needed capability + nearest hospitals/shelters with space
- [x] 2.2 Resource Allocation agent (`lib/agents/resourceAllocation.js`): Gemini picks units from candidates only, one unit per incident, severity first; distance/ETA copied from tools; missing incidents auto-added to `uncovered`
- [x] 2.3 Command and Planning agent (`lib/agents/commandPlanning.js`): plain-language summary, alternatives with trade-offs, `changes` vs previous plan, or `investigate`
- [x] 2.4 Orchestrator chain (`lib/orchestrator/generatePlan.js`): assess (only unassessed / triggering incident) -> route -> allocate -> command; max 2 investigate rounds; too-vague incidents go straight to `needs_info`; older proposed plans -> `superseded`. Tested end to end on a separate test DB (`rakshanet_test`): 3 incidents -> 6-7 assignments in ~8 s; vague report -> needs_info + question; answered via PATCH -> reassessed sev 5, 3 units, `changes` listed
- [x] 2.5 Real tools used from the start (Sam's `lib/tools` was already on `main`); `stubTools.js` no longer imported
- [x] 2.6 Plan routes: `GET /api/plan/current`, `GET /api/plan/history`, `POST /api/plan/:id/approve|reject|edit`, `GET /api/logs?planVersion=`. Logic in `lib/orchestrator/planActions.js`. Edit re-checks units with `validateAssignments`, recomputes distance/ETA with tools, saves a new proposed version (old one superseded) with a `changes` list. Only `proposed` plans can be approved/rejected (409 otherwise). Tested on test DB incl. full flow generate -> edit -> approve -> Sam's dispatch -> committed

**Gate 2 (CORE FREEZE)**
- [ ] On the live link: report -> plan with agent timeline -> approve -> dispatch -> units en route on the map
- [ ] `POST /api/seed` resets everything for a clean demo
- [x] Everyone's work is merged; nothing important lives only on a laptop (all 3 branches merged into main, 30 Sep evening)

## Phase 3: Replanning, edge cases, polish (8:00 PM to 1:00 AM)

- [x] 3.1 Replanning only what changed: allocation sees units already on scene (fills only missing capabilities) and the previous plan's units (keeps them unless needed elsewhere); reopened incidents still fully covered go back to `dispatched`; Command agent is told what triggered the replan so `changes[].why` names the real cause. Tested: AMB-03 breaks down on INC-003 -> v2 = only AMB-04 -> INC-003, why "AMB-03 is now unavailable", ~3 s
- [x] 3.2 Investigate loop: vague incident -> `needs_info` + question (done in 2.4). Fixed: only low-confidence, severity <= 3 incidents with no units may be investigated; severe ones get units now and keep their follow-up questions
- [x] 3.3 Escalation: incidents still missing a capability are `uncovered` with reason + `expectedDelayMinutes` (nearest busy capable unit: 20 min on scene + tools ETA), logged as "Escalation" in the timeline. Coverage check: after Gemini, code gives any unmet need the nearest free unused unit (8 -> 14 assignments in a 8-incident shortage test). Allocation repairs bad Gemini output instead of failing; retries tell Gemini what was wrong; 4 Gemini tries with backoff
- [x] 3.4 Prompt tuning: summary max 2 sentences / 45 words (longer ones are sent back to Gemini), leads with top priority by label ("building collapse in Indiranagar"), then the biggest shortage with its wait; unit reasons max 15 words with real km from tools; alternatives with minutes; clear message when a replan needs no new units. Gemini 429 per-minute limit (free tier 15/min): retries now wait Google's `retryDelay` (max 20 s)

**Gate 3 (FEATURE FREEZE)**
- [ ] Demo script runs 3 times in a row on the live link with no failure
- [ ] All 6 edge cases from the Round 1 doc are visibly handled
- [ ] From now on: bug fixes only

## Phase 4: Deliver (1:00 AM to 6:30 AM)

- [ ] 4.1 Sleep in shifts, one person always awake
- [ ] 4.2 Bug fixes only, through PRs (keep the Vercel deploy green)
- [ ] 4.3 README technical part DONE (what it does, agent pipeline, design principles, stack, structure, API; Setup section left for Sam). Voice for the demo video still to do
- [ ] 4.4 Final checklist, submit by 6:30 AM

## Blockers

- Live Phase 1 test is pending: configured Gemini model returned 503 high demand on two assessment attempts. No shared Atlas collections were changed by these attempts.
- Production build passes using Next's local font mock because this environment cannot reach Google Fonts. Normal build still needs a networked environment.
- `backend-agents` is local only. Phase 1 PR review and merge are pending, as are Ashish's Phase 0 team handoff and Vercel deployment.

## Notes

- Gemini key rotation: optional `GEMINI_API_KEYS=key1,key2,key3` (comma separated) on Vercel spreads the 15 requests/minute free limit; a rate-limited key hands over to the next, invalid keys are skipped. Tested with a fake + real key. To use it: collect Sam's and Daksh's keys, add `GEMINI_API_KEYS` on Vercel, redeploy.

- Gemini free tier = 15 requests/minute per model for the whole app (Vercel uses Ashish's key). One plan = ~3 calls + 1 per new incident. Avoid clicking Generate Plan repeatedly during the demo.

- Sam's `responders/update` must reopen an incident (`planned`) when a unit goes `unavailable`, or replanning never covers it. Fix written by Ashish, kept in a local git stash on `backend-data` (not pushed); waiting to hear from Sam.

- `POST /api/plan/generate` now accepts `incidentId: null` (Daksh's api.js sends null). Gemini failures return code `AGENT_ERROR` (502).
- `expectedDelayMinutes` in `uncovered` is null for now; estimate comes in 3.3.
- Test safely with a separate DB: run `next dev` with `MONGODB_URI` pointing at `/rakshanet_test` (never seed the shared `rakshanet` DB while others test).

- All branches (backend-data, backend-agents, frontend) merged into `main` and deployed. Kept main's package-lock.json (branch version only had npm metadata changes).

- Deployment moved from Sam to Ashish: Vercel project, env variables, live link.
- Models for agents: `import { connectDB, Plan, AgentLog } from "@/lib/db";` They are on `backend-data`, not yet on `main`. Merge `backend-data` into `backend-agents` (or wait for Sam's Phase 1 PR) to use them.
- Plan/AgentLog id fields are real ObjectIds: stub tools must return 24-hex ids, not `"66f..."`.
