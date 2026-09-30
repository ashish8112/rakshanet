# Brief: Sam

**Role:** Backend, Data + Tools + Dispatch (the "hands"). Branch: `backend-data`.

Sam knows Python well; the app is JavaScript. Explain any JavaScript in simple terms when asked, and show one worked example with real numbers for every tool function so Sam can verify it.

## What I build

The database layer (connection + Mongoose models), the Bengaluru seed data (generated with a Python script), the deterministic tool functions the agents rely on, and the routes that create incidents, update responders and commit dispatches.

## Folders I own

`lib/db/`, `lib/tools/`, `data/`, `scripts/`, `app/api/incidents/`, `app/api/resources/`, `app/api/responders/`, `app/api/dispatch/`, `app/api/seed/`

Read only: `lib/agents/`, `lib/orchestrator/`, `app/api/plan/`, `app/api/logs/` (Ashish), `app/page.js`, `components/`, `mock/` (Daksh).
Never edit shared files (package.json, app/layout.js, CONTRACT.md, CLAUDE.md, .env.example, README.md, docs/RUNBOOK.md); ask Ashish.

## Rules specific to my part

- Tool function names, inputs and outputs must match `CONTRACT.md` 5.3 exactly: Ashish's agents call them.
- `lib/db/connect.js` caches the connection (serverless safe).
- Haversine distance in km, 1 decimal. ETA in whole minutes, city speeds: ambulance 30 km/h, fire_unit 25, rescue_team 25.
- Dispatch re-checks the approved plan against the LATEST database state (`validateAssignments`) before reserving anything. If any unit is no longer free, commit nothing and return the conflicts.
- JSON sent out uses `id` (string), not `_id`.
- Every route file starts with `// Owner: Sam`.

## Extra duties

(Vercel deployment is NOT Sam's job: Ashish owns it.)

Demo scenario script (`docs/demo-script.md`). Edge case testing. README setup steps in Phase 4.

## My steps

See the Sam sections of each phase in `docs/RUNBOOK.md`.
