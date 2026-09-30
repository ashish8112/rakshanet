# Progress: Ashish

Claude Code updates this file after every finished step. When asking for help in the Claude chat, paste this whole file.

**Current phase:** 1 (Phase 0 team handoff and deployment still need Ashish)
**Next step:** 1.5 (live assessments for 3 reports and Phase 1 PR review/merge)
**Branch:** backend-agents (local worktree; remote branch not pushed yet)

Full step details: `docs/RUNBOOK.md`. Tick `[x]` when a step's "Done when" is true.

## Phase 0: Setup and skeleton (1:15 PM to 2:00 PM)

- [x] 0.1 Inspect the repo (only .git, .gitignore, README.md, docs/ existed)
- [x] 0.2 Create the skeleton: Next.js app, .gitignore, packages, folders, CONTRACT.md, .env.example, build passes
- [x] 0.3 First commit and push to `main` (commit `29dd297`)
- [ ] 0.4 Tell the team: "Phase 0 pushed. Pull main, run npm install, copy .env.example to .env.local, checkout your branch."
- [ ] 0.5 Vercel deploy (Ashish owns deployment): import repo, add 3 env variables, deploy, share live link
- [ ] 0.6 Create your branch from `main`: `git checkout -b backend-agents`, `git push -u origin backend-agents`
- Extra (done for Sam): Sam's 0.1 MongoDB Atlas, 0.4 `backend-data` branch, 1.1 DB layer. See `docs/progress/sam.md`.

**Gate 0 (whole team)**
- [ ] All 3 laptops show the app at `localhost:3000`
- [ ] Vercel live link opens
- [ ] 3 branches exist on GitHub
- [ ] Everyone has read `CONTRACT.md` and has no open questions

## Phase 1: Foundations (2:00 PM to 4:30 PM)

- [x] 1.1 `lib/agents/gemini.js`: JSON-only Gemini call, safe parse, one retry on bad JSON (controlled test passed)
- [x] 1.2 `lib/agents/stubTools.js`: all 7 contract-named fake tools with contract-shaped outputs and 24-hex ids
- [x] 1.3 Incident Assessment agent + prompt: exact contract output validation; orchestrator writes an AgentLog for each successful assessment (controlled tests passed)
- [x] 1.4 Orchestrator v1 + `POST /api/plan/generate`: proposed plan with empty assignments and response envelope (controlled tests and production build passed)
- [ ] 1.5 Test with 3 sample incidents (clear, vague, very severe), all valid JSON, PR merged

**Gate 1 (whole team)**
- [ ] All Phase 1 PRs merged into `main`
- [ ] Report form saves a real incident to MongoDB
- [ ] Map shows the real seeded resources (not mock)
- [ ] Assessment agent returns valid JSON for all 3 test incidents

## Phase 2: Core loop (4:30 PM to 8:00 PM)

- [ ] 2.1 Route and Logistics agent
- [ ] 2.2 Resource Allocation agent
- [ ] 2.3 Command and Planning agent
- [ ] 2.4 Full orchestrator chain with loop guard (max 2 "investigate" rounds)
- [ ] 2.5 Switch to real tools (one import change) after Sam's 2.1 is merged
- [ ] 2.6 Plan versioning + routes: approve, reject, edit, current, history, `GET /api/logs`

**Gate 2 (CORE FREEZE)**
- [ ] On the live link: report -> plan with agent timeline -> approve -> dispatch -> units en route on the map
- [ ] `POST /api/seed` resets everything for a clean demo
- [ ] Everyone's work is merged; nothing important lives only on a laptop

## Phase 3: Replanning, edge cases, polish (8:00 PM to 1:00 AM)

- [ ] 3.1 Replanning of only affected incidents, with a `changes` list vs the previous plan version
- [ ] 3.2 Investigate loop: vague incident -> status `needs_info` with follow-up questions
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

- Deployment moved from Sam to Ashish: Vercel project, env variables, live link.
- Models for agents: `import { connectDB, Plan, AgentLog } from "@/lib/db";` They are on `backend-data`, not yet on `main`. Merge `backend-data` into `backend-agents` (or wait for Sam's Phase 1 PR) to use them.
- Plan/AgentLog id fields are real ObjectIds: stub tools must return 24-hex ids, not `"66f..."`.
