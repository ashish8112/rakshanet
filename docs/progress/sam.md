# Progress: Sam

Claude Code updates this file after every finished step. When asking for help in the Claude chat, paste this whole file.

**Current phase:** 3 done (all Sam steps done; only team gates and Phase 4 wrap-up left)
**Next step:** nothing to build. Join the team gate checks (Gate 2 and Gate 3 on the live link) and Phase 4 (4.1 shifts, 4.2 bug fixes, 4.4 final checklist)
**Branch:** backend-data (already exists on GitHub, created by Ashish)

Full step details: `docs/RUNBOOK.md`. Tick `[x]` when a step's "Done when" is true.

## IMPORTANT for Sam's AI (Codex / Claude): read before doing anything

Some of Sam's steps were already done by Ashish. Do NOT redo them.

- Do NOT create a MongoDB Atlas cluster: it exists (database `rakshanet`). Get the `MONGODB_URI` privately from Ashish and put it in `.env.local`.
- Do NOT run `git checkout -b backend-data` (that would create a new empty branch from `main` and hide the work below). Instead run:
  `git fetch origin` then `git checkout backend-data` then `git pull`
- Do NOT rewrite `lib/db/`. Step 1.1 is finished; build on it.
- Do NOT deploy to Vercel. Ashish owns deployment.
- Do NOT redo 3.3, 3.4, 3.5 or 4.3: Ashish finished them on 30 Sep (see below). `docs/demo-script.md`, the seed tuning (FIR-03 unavailable) and the README Setup section already exist on `main`.

## Phase 0: Setup and skeleton (1:15 PM to 2:00 PM)

- [x] 0.1 MongoDB Atlas (done by Ashish): cluster + user exist, connection tested, database `rakshanet` (empty until seeding)
- [x] 0.2 Pull `main`, `npm install`, create `.env.local` from `.env.example` (get `MONGODB_URI` from Ashish). Dependencies are installed, Sam confirmed the app opens locally, database API calls succeeded, and all three environment values are set. The Gemini model API was intermittent during checks (HTTP 503); one request succeeded without text at a very low output limit.
- [x] 0.3 Vercel: NOT Sam's job anymore (Ashish owns deployment)
- [x] 0.4 Branch `backend-data` created and pushed (by Ashish)

**Gate 0 (whole team)**
- [ ] All 3 laptops show the app at `localhost:3000`
- [x] Vercel live link opens
- [x] 3 branches exist on GitHub
- [ ] Everyone has read `CONTRACT.md` and has no open questions

## Phase 1: Foundations (2:00 PM to 4:30 PM)

- [x] 1.1 DB layer (done by Ashish): `lib/db/connect.js` (cached connection), models Incident, Resource, Plan, AgentLog in `lib/db/models/`, exported from `lib/db/index.js`. Tested: shapes match CONTRACT.md 5.1, JSON uses `id`, bad enums rejected, real Atlas connection works, build passes.
- [x] 1.2 Seed data: `scripts/generate_seed_data.py` writes `data/resources.json` (8 ambulances, 4 fire units, 4 rescue teams, 6 hospitals, 4 shelters across six Bengaluru areas) and `data/demo-incidents.json` (3 incidents). Fictional facilities and availability; coordinates are approximate neighbourhood positions. Checked counts, contract shapes, unique codes and resource positions, capacities, and identical output on rerun.
- [x] 1.3 `POST /api/seed`: route validates the seed data and resets incidents, resources, plans, and logs in one transaction. Approved live test returned 3 incidents and 26 resources; follow-up reads confirmed the counts and removal of the temporary incident.
- [x] 1.4 `GET /api/resources` (optional `?kind=`), `GET /api/incidents`, `POST /api/incidents`; routes tested with local curl commands. A temporary incident was created, read by id and list, then removed by the approved seed reset. PR #1 merged into `main` on 2026-09-30.

**Gate 1 (whole team)**
- [x] All Phase 1 PRs merged into `main`
- [ ] Report form saves a real incident to MongoDB
- [ ] Map shows the real seeded resources (not mock)
- [ ] Assessment agent returns valid JSON for all 3 test incidents

## Phase 2: Core loop (4:30 PM to 8:00 PM)

- [x] 2.1 All 7 tool functions implemented in `lib/tools/index.js` with contract names and outputs. Worked examples passed against seeded Atlas data: Koramangala to Indiranagar 4.5 km, ambulance ETA 9 min; 7 available ambulances; nearest medical units AMB-01/02/03; HOS-01 has 14 free places for 10 needed; a same-location incident is detected as a duplicate; an available assignment validates and an unavailable unit conflicts. Hospital over-capacity also conflicts. ESLint and webpack build pass. PR #1 merged into `main` on 2026-09-30.
- [x] 2.2 `POST /api/responders/update` and `PATCH /api/incidents/:id` implemented. Pushed in `3b93242` and merged through PR #1. A later branch fix makes an unavailable assigned unit return a dispatched incident to `planned`, and clearing its final unit sets it to `resolved`. Lint, build, and live Atlas checks passed, including a two-unit case; temporary records were removed and counts returned to 3 incidents and 26 resources. The fix awaits a separate PR.
- [x] 2.3 `POST /api/dispatch` revalidates approved plan assignments, then reserves units, marks incidents `dispatched`, and commits the plan in one transaction. A conflict returns `committed: false` with no writes. Lint, production build with local font responses, and live Atlas success/conflict/repeat-dispatch tests passed; temporary records were removed. Pushed in `3b93242`.

**Gate 2 (CORE FREEZE)**
- [ ] On the live link: report -> plan with agent timeline -> approve -> dispatch -> units en route on the map
- [ ] `POST /api/seed` resets everything for a clean demo
- [x] Everyone's work is merged; nothing important lives only on a laptop

## Phase 3: Replanning, edge cases, polish (8:00 PM to 1:00 AM)

- [x] 3.1 Duplicate detection in `POST /api/incidents` using Sam's tool. The response includes nearby recent reports, and `possibleDuplicateOf` points to the nearest match. Lint, build, and live Atlas tests for nearby, distant, and older reports passed; temporary reports were removed and the incident count returned to 3. The change awaits a separate PR.
- [x] 3.2 Hospital and shelter capacity updated on dispatch in the same transaction as unit and plan changes. One place is reserved per assignment. Lint, build, and live Atlas tests for both destination kinds and a full-capacity conflict passed; temporary records were removed and counts returned to 3 incidents, 26 resources, and 0 plans. The change awaits a separate PR.
- [x] 3.3 `docs/demo-script.md` (done by Ashish): minute-by-minute clicks, inputs and talking points using the real UI labels (Generate Plan, Approve & Dispatch, Report Emergency, Fleet -> Unavailable, Incidents -> answer), a pre-demo checklist (reset with `curl -X POST .../api/seed`), recovery steps, and which edge case each step shows
- [x] 3.4 Seed tuning (done by Ashish): `scripts/generate_seed_data.py` now also starts FIR-03 unavailable, so only FIR-01 and FIR-02 are free. When two fires are reported after the first dispatch, one always escalates ("No free fire unit; nearest busy one about 29-48 min"). Regenerated `data/resources.json` (only FIR-03 changed)
- [x] 3.5 Edge cases (done by Ashish): full demo story rehearsed via the API on the separate `rakshanet_test` DB, 3 runs in a row, 36/36 checks passed: first plan + dispatch, escalation on the second fire, ambulance breakdown -> replan replaces only it with the real reason, vague report -> needs_info -> answered -> reassessed and planned, duplicate flagged, all units cleared -> resolved. No new bugs. NOTE: the Round 1 doc is not in the repo; the 6 cases used are the ones in the demo script's edge-case table, check them against the real doc

**Gate 3 (FEATURE FREEZE)**
- [ ] Demo script runs 3 times in a row on the live link with no failure
- [ ] All 6 edge cases from the Round 1 doc are visibly handled
- [ ] From now on: bug fixes only

## Phase 4: Deliver (1:00 AM to 6:30 AM)

- [ ] 4.1 Sleep in shifts, one person always awake
- [ ] 4.2 Bug fixes only, through PRs
- [x] 4.3 README Setup section (done by Ashish): clone, install, `.env.local` values, reset data, run, test on a separate DB
- [ ] 4.4 Final checklist, submit by 6:30 AM

## Blockers

- Gate 2 still needs the team's live report-to-dispatch check. The "Approve & Dispatch" bug Sam reported is FIXED by Daksh (PlanPanel now approves then dispatches) and merged into `main`.

## Notes

- Local check on 2026-09-30: `backend-data` tracks `origin/backend-data`; the working tree was clean before step 2.2 began.
- Fetched and fast-forward merged `origin/main` through `8988721` into `backend-data` on 2026-09-30; no conflicts, and all four local work files matched their pre-merge backups. Lint and webpack build passed after the merge. Responder, duplicate, and capacity checks passed against the separate `rakshanet_test` database; temporary records were removed.
- PR #1 merged: https://github.com/ashish8112/rakshanet/pull/1 (data, seed, tools, and Phase 2 routes). Phase 3.1, 3.2, and the responder status fix are on `backend-data` pending a separate PR.
- Step 2.2 responder behavior: arrived moves an assigned reserved/en-route unit to on_scene; unavailable releases its assignment, returns a dispatched incident to `planned`, and requests replanning; available restores an unassigned unavailable unit; cleared releases an assigned unit and resolves the incident only when no assigned units remain. Incident and resource changes happen in one transaction.
- Current `POST /api/incidents` generates random `INC-` codes, not sequential `INC-00X` codes. Duplicate detection is complete, but the team's preferred code format should be settled before changing it.
- Capacity accounting currently reserves one place per assignment, matching the route agent's `needed: 1`. A teammate's proposed `peopleAffected` accounting needs a coordinated change to destination selection and dispatch validation before use.
- Phase 1 routes pass ESLint and `npm run build -- --webpack`. The default Turbopack build failed in this environment while fetching fonts or binding a worker port. The seed endpoint follows the current contract and has no access control; the team should settle access before deploying it.
- The shared Atlas database now contains 26 seeded resources and 3 seeded incidents. No plans or agent logs were seeded.
- `findNearestAvailable` handles mobile capabilities (`medical`, `fire`, `rescue`); hospital and shelter destinations use `findNearestWithCapacity`. Assignment destination capacity currently counts one place per assignment because the Plan assignment contract has no patient or occupant count.
- Import with: `import { connectDB, Incident, Resource, Plan, AgentLog } from "@/lib/db";` and `await connectDB()` before any query.
- `toJSON` turns `_id` into `id`. It does NOT apply to `.lean()` results, so routes should send documents (or `doc.toJSON()`), not lean objects.
- ID fields in plans/logs (`incidentId`, `resourceId`, `destinationId`) are real ObjectIds: saving a plan with a fake id like `"66f..."` fails validation.
- Timestamps: Incident `reportedAt`/`updatedAt`, Resource `updatedAt`, Plan/AgentLog `createdAt` (set automatically on save).
