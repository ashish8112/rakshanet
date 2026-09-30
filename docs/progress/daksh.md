# Progress: Daksh

Claude Code updates this file after every finished step. When asking for help in the Claude chat, paste this whole file.

**Current phase:** 0
**Next step:** Gate 0
**Branch:** frontend

Full step details: `docs/RUNBOOK.md`. Tick `[x]` when a step's "Done when" is true.

## Phase 0: Setup and skeleton (1:15 PM to 2:00 PM)

- [x] 0.1 Gemini API key configured in .env.local
- [x] 0.2 Dashboard layout planned
- [x] 0.3 Pulled main, npm install completed, .env.local created
- [x] 0.4 Created `frontend` branch and pushed to origin

**Gate 0 (whole team)**
- [ ] All 3 laptops show the app at `localhost:3000`
- [ ] Vercel live link opens
- [ ] 3 branches exist on GitHub
- [ ] Everyone has read `CONTRACT.md` and has no open questions

## Phase 1: Foundations (2:00 PM to 4:30 PM)

- [ ] 1.1 `mock/` files copied from the contract examples + `components/api.js` with all fetch calls and a `USE_MOCK` switch
- [ ] 1.2 Layout from the paper sketch (top bar, left incident queue, centre map, right panel)
- [ ] 1.3 Map with resource and incident markers (colour by severity and status)
- [ ] 1.4 Report form: click the map to set location, then type, description, people affected
- [ ] 1.5 Incident queue sorted by severity with status badges; all on mock data, PR merged

**Gate 1 (whole team)**
- [ ] All Phase 1 PRs merged into `main`
- [ ] Report form saves a real incident to MongoDB
- [ ] Map shows the real seeded resources (not mock)
- [ ] Assessment agent returns valid JSON for all 3 test incidents

## Phase 2: Core loop (4:30 PM to 8:00 PM)

- [ ] 2.1 Plan review panel: assignments with reason and ETA, uncovered, alternatives, Approve / Edit / Reject
- [ ] 2.2 Agent activity timeline from `GET /api/logs`, with loading states
- [ ] 2.3 Approve then dispatch flow (CONTRACT.md 5.2), lines on the map from unit to incident
- [ ] 2.4 Responder simulator buttons: Arrived, Unavailable, Available, Cleared (`replanNeeded` -> `POST /api/plan/generate`)
- [ ] 2.5 Turn `USE_MOCK` off everywhere

**Gate 2 (CORE FREEZE)**
- [ ] On the live link: report -> plan with agent timeline -> approve -> dispatch -> units en route on the map
- [ ] `POST /api/seed` resets everything for a clean demo
- [ ] Everyone's work is merged; nothing important lives only on a laptop

## Phase 3: Replanning, edge cases, polish (8:00 PM to 1:00 AM)

- [ ] 3.1 Before and after view for replanned plans ("what changed and why")
- [ ] 3.2 Escalation banner, duplicate warning, follow-up questions form (answer -> `PATCH` -> regenerate)
- [ ] 3.3 Polish and phone-screen check

**Gate 3 (FEATURE FREEZE)**
- [ ] Demo script runs 3 times in a row on the live link with no failure
- [ ] All 6 edge cases from the Round 1 doc are visibly handled
- [ ] From now on: bug fixes only

## Phase 4: Deliver (1:00 AM to 6:30 AM)

- [ ] 4.1 Sleep in shifts, one person always awake
- [ ] 4.2 Bug fixes only, through PRs
- [ ] 4.3 Slides + screen recording for the demo video
- [ ] 4.4 Final checklist, submit by 6:30 AM

## Blockers

- (none)

## Notes

- Deployment is owned by Ashish (Vercel live link).
