# Progress: Ashish

Claude Code updates this file after every finished step. When asking for help in the Claude chat, paste this whole file.

**Current phase:** 3
**Next step:** 3.3 (escalation: expected delay for uncovered incidents, alternatives with trade-offs)
**Branch:** backend-agents (on GitHub, merged into `main`)

Full step details: `docs/RUNBOOK.md`. Tick `[x]` when a step's "Done when" is true.

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
- [ ] 3 branches exist on GitHub
- [ ] Everyone has read `CONTRACT.md` and has no open questions

## Phase 1: Foundations (2:00 PM to 4:30 PM)

- [x] 1.1 `lib/agents/gemini.js`: JSON-only Gemini call, safe parse, one retry on bad JSON (controlled test passed)
- [x] 1.2 `lib/agents/stubTools.js`: all 7 contract-named fake tools with contract-shaped outputs and 24-hex ids
- [x] 1.3 Incident Assessment agent + prompt: exact contract output validation; orchestrator writes an AgentLog for each successful assessment (controlled tests passed)
- [x] 1.4 Orchestrator v1 + `POST /api/plan/generate`: proposed plan with empty assignments and response envelope (controlled tests and production build passed)
- [x] 1.5 Tested 3 incidents (clear flood sev 4 high, vague 'market' sev 1 low + follow-up questions, building collapse sev 5 high): all valid contract JSON, 2 runs each, ~1-2 s. Fixed on the way: Gemini helper retries on 'high demand'/429/503 and on wrong-shape output; assessment drops extra keys Gemini adds (e.g. `location`). Model: `gemini-3.5-flash-lite` (Flash models were overloaded).

**Gate 1 (whole team)**
- [ ] All Phase 1 PRs merged into `main`
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
- [ ] Everyone's work is merged; nothing important lives only on a laptop

## Phase 3: Replanning, edge cases, polish (8:00 PM to 1:00 AM)

- [x] 3.1 Replanning only what changed: allocation sees units already on scene (fills only missing capabilities) and the previous plan's units (keeps them unless needed elsewhere); reopened incidents still fully covered go back to `dispatched`; Command agent is told what triggered the replan so `changes[].why` names the real cause. Tested: AMB-03 breaks down on INC-003 -> v2 = only AMB-04 -> INC-003, why "AMB-03 is now unavailable", ~3 s
- [x] 3.2 Investigate loop: vague incident -> `needs_info` + question (done in 2.4). Fixed: only low-confidence, severity <= 3 incidents with no units may be investigated; severe ones get units now and keep their follow-up questions
- [ ] 3.3 Escalation and conflicts: `uncovered` with reason and delay; alternatives with trade-offs
- [ ] 3.4 Prompt tuning so reasons and summaries read clearly to a non-technical judge

**Gate 3 (FEATURE FREEZE)**
- [ ] Demo script runs 3 times in a row on the live link with no failure
- [ ] All 6 edge cases from the Round 1 doc are visibly handled
- [ ] From now on: bug fixes only

## Phase 4: Deliver (1:00 AM to 6:30 AM)

- [ ] 4.1 Sleep in shifts, one person always awake
- [ ] 4.2 Bug fixes only, through PRs (keep the Vercel deploy green)
- [ ] 4.3 README technical part + voice for the demo video
- [ ] 4.4 Final checklist, submit by 6:30 AM

## Blockers

- Live Phase 1 test is pending: configured Gemini model returned 503 high demand on two assessment attempts. No shared Atlas collections were changed by these attempts.
- Production build passes using Next's local font mock because this environment cannot reach Google Fonts. Normal build still needs a networked environment.
- `backend-agents` is local only. Phase 1 PR review and merge are pending, as are Ashish's Phase 0 team handoff and Vercel deployment.

## Notes

- Sam's `responders/update` must reopen an incident (`planned`) when a unit goes `unavailable`, or replanning never covers it. Fix written by Ashish, kept in a local git stash on `backend-data` (not pushed); waiting to hear from Sam.

- `POST /api/plan/generate` now accepts `incidentId: null` (Daksh's api.js sends null). Gemini failures return code `AGENT_ERROR` (502).
- `expectedDelayMinutes` in `uncovered` is null for now; estimate comes in 3.3.
- Test safely with a separate DB: run `next dev` with `MONGODB_URI` pointing at `/rakshanet_test` (never seed the shared `rakshanet` DB while others test).

- All branches (backend-data, backend-agents, frontend) merged into `main` and deployed. Kept main's package-lock.json (branch version only had npm metadata changes).

- Deployment moved from Sam to Ashish: Vercel project, env variables, live link.
- Models for agents: `import { connectDB, Plan, AgentLog } from "@/lib/db";` They are on `backend-data`, not yet on `main`. Merge `backend-data` into `backend-agents` (or wait for Sam's Phase 1 PR) to use them.
- Plan/AgentLog id fields are real ObjectIds: stub tools must return 24-hex ids, not `"66f..."`.
