# Progress: Sam

Claude Code updates this file after every finished step. When asking for help in the Claude chat, paste this whole file.

**Current phase:** 1
**Next step:** 0.2 (setup) if not done, then 1.2 (seed data Python script)
**Branch:** backend-data (already exists on GitHub, created by Ashish)

Full step details: `docs/RUNBOOK.md`. Tick `[x]` when a step's "Done when" is true.

## IMPORTANT for Sam's AI (Codex / Claude): read before doing anything

Some of Sam's steps were already done by Ashish. Do NOT redo them.

- Do NOT create a MongoDB Atlas cluster: it exists (database `rakshanet`). Get the `MONGODB_URI` privately from Ashish and put it in `.env.local`.
- Do NOT run `git checkout -b backend-data` (that would create a new empty branch from `main` and hide the work below). Instead run:
  `git fetch origin` then `git checkout backend-data` then `git pull`
- Do NOT rewrite `lib/db/`. Step 1.1 is finished; build on it.
- Do NOT deploy to Vercel. Ashish owns deployment.

## Phase 0: Setup and skeleton (1:15 PM to 2:00 PM)

- [x] 0.1 MongoDB Atlas (done by Ashish): cluster + user exist, connection tested, database `rakshanet` (empty until seeding)
- [ ] 0.2 Pull `main`, `npm install`, create `.env.local` from `.env.example` (get `MONGODB_URI` from Ashish)
- [x] 0.3 Vercel: NOT Sam's job anymore (Ashish owns deployment)
- [x] 0.4 Branch `backend-data` created and pushed (by Ashish)

**Gate 0 (whole team)**
- [ ] All 3 laptops show the app at `localhost:3000`
- [ ] Vercel live link opens
- [ ] 3 branches exist on GitHub
- [ ] Everyone has read `CONTRACT.md` and has no open questions

## Phase 1: Foundations (2:00 PM to 4:30 PM)

- [x] 1.1 DB layer (done by Ashish): `lib/db/connect.js` (cached connection), models Incident, Resource, Plan, AgentLog in `lib/db/models/`, exported from `lib/db/index.js`. Tested: shapes match CONTRACT.md 5.1, JSON uses `id`, bad enums rejected, real Atlas connection works, build passes.
- [ ] 1.2 Seed data: Python script in `scripts/` writing `data/resources.json` (~8 ambulances, 4 fire units, 4 rescue teams, 6 hospitals, 4 shelters, real Bengaluru areas) + `data/demo-incidents.json`
- [ ] 1.3 `POST /api/seed`: resets the database to the seed data
- [ ] 1.4 `GET /api/resources` (optional `?kind=`), `GET /api/incidents`, `POST /api/incidents`; each tested with curl, PR merged

**Gate 1 (whole team)**
- [ ] All Phase 1 PRs merged into `main`
- [ ] Report form saves a real incident to MongoDB
- [ ] Map shows the real seeded resources (not mock)
- [ ] Assessment agent returns valid JSON for all 3 test incidents

## Phase 2: Core loop (4:30 PM to 8:00 PM)

- [ ] 2.1 All 7 tool functions in `lib/tools/index.js` (CONTRACT.md 5.3), one worked example each; open PR early
- [ ] 2.2 `POST /api/responders/update` and `PATCH /api/incidents/:id`
- [ ] 2.3 `POST /api/dispatch` with revalidation (`validateAssignments`); reserve units, incidents -> `dispatched`; on conflict commit nothing

**Gate 2 (CORE FREEZE)**
- [ ] On the live link: report -> plan with agent timeline -> approve -> dispatch -> units en route on the map
- [ ] `POST /api/seed` resets everything for a clean demo
- [ ] Everyone's work is merged; nothing important lives only on a laptop

## Phase 3: Replanning, edge cases, polish (8:00 PM to 1:00 AM)

- [ ] 3.1 Duplicate detection in `POST /api/incidents` (within 0.5 km and 30 minutes)
- [ ] 3.2 Hospital and shelter capacity updated on dispatch
- [ ] 3.3 `docs/demo-script.md`: exact inputs and clicks for the 3-minute demo
- [ ] 3.4 Tune seed data so the demo really runs out of units at the escalation step
- [ ] 3.5 Test every edge case from the Round 1 doc, report bugs to the owner

**Gate 3 (FEATURE FREEZE)**
- [ ] Demo script runs 3 times in a row on the live link with no failure
- [ ] All 6 edge cases from the Round 1 doc are visibly handled
- [ ] From now on: bug fixes only

## Phase 4: Deliver (1:00 AM to 6:30 AM)

- [ ] 4.1 Sleep in shifts, one person always awake
- [ ] 4.2 Bug fixes only, through PRs
- [ ] 4.3 README setup steps
- [ ] 4.4 Final checklist, submit by 6:30 AM

## Blockers

- (none)

## Notes

- Import with: `import { connectDB, Incident, Resource, Plan, AgentLog } from "@/lib/db";` and `await connectDB()` before any query.
- `toJSON` turns `_id` into `id`. It does NOT apply to `.lean()` results, so routes should send documents (or `doc.toJSON()`), not lean objects.
- ID fields in plans/logs (`incidentId`, `resourceId`, `destinationId`) are real ObjectIds: saving a plan with a fake id like `"66f..."` fails validation.
- Timestamps: Incident `reportedAt`/`updatedAt`, Resource `updatedAt`, Plan/AgentLog `createdAt` (set automatically on save).
