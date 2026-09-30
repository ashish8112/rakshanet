# Progress: Sam

Claude Code updates this file after every finished step. When asking for help in the Claude chat, paste this whole file.

**Current phase:** 1
**Next step:** 1.2 (seed data Python script)
**Branch:** backend-data (already exists on GitHub, created by Ashish)

## IMPORTANT for Sam's AI (Codex / Claude): read before doing anything

Some of Sam's steps were already done by Ashish. Do NOT redo them.

- Do NOT create a MongoDB Atlas cluster: it exists (database `rakshanet`). Get the `MONGODB_URI` privately from Ashish and put it in `.env.local`.
- Do NOT run `git checkout -b backend-data` (that would create a new empty branch from `main` and hide the work below). Instead run:
  `git fetch origin` then `git checkout backend-data` then `git pull`
- Do NOT rewrite `lib/db/`. Step 1.1 is finished; build on it.

## Done

- [x] 0.1 MongoDB Atlas (done by Ashish): cluster + database user exist, connection tested from Ashish's laptop, database `rakshanet` (empty until seeding).
- [x] 0.4 Branch `backend-data` created and pushed (by Ashish).
- [x] 1.1 DB layer (done by Ashish on `backend-data`): `lib/db/connect.js` (cached connection), models Incident, Resource, Plan, AgentLog in `lib/db/models/`, all exported from `lib/db/index.js`. Tested: shapes match CONTRACT.md 5.1, JSON uses `id`, invalid enums/severity rejected, real Atlas connection works. Build passes. No separate PR (Ashish's call).

## Still to do from Phase 0

- [ ] 0.2 Pull, `npm install`, create `.env.local` from `.env.example` (get `MONGODB_URI` from Ashish).
- [ ] 0.3 Vercel: import the repo, add the 3 env variables, deploy, share the live link.

## Blockers

- (none)

## Notes

- Import with: `import { connectDB, Incident, Resource, Plan, AgentLog } from "@/lib/db";` and `await connectDB()` before any query.
- `toJSON` turns `_id` into `id`. It does NOT apply to `.lean()` results, so routes should send documents (or `doc.toJSON()`), not lean objects.
- ID fields in plans/logs (`incidentId`, `resourceId`, `destinationId`) are real ObjectIds: saving a plan with a fake id like `"66f..."` fails validation.
- Timestamps: Incident `reportedAt`/`updatedAt`, Resource `updatedAt`, Plan/AgentLog `createdAt` (set automatically on save).
