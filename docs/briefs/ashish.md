# Brief: Ashish

**Role:** Team lead. Backend, Agents + Orchestrator (the "brain"). Branch: `backend-agents`.

## What I build

Four Gemini agents (Incident Assessment -> Route and Logistics -> Resource Allocation -> Command and Planning), the orchestrator that runs them in a loop, plan versioning and replanning, and the plan and log API routes. Agents REASON; numbers (distance, ETA, availability, capacity) come ONLY from Sam's tool functions in `CONTRACT.md` 5.3.

## Folders I own

`lib/agents/`, `lib/orchestrator/`, `app/api/plan/`, `app/api/logs/`

Read only: `lib/db/`, `lib/tools/` (Sam), `app/page.js`, `components/`, `mock/` (Daksh).
Shared files (package.json, app/layout.js, CONTRACT.md, CLAUDE.md, .env.example, README.md, docs/RUNBOOK.md): I am the only one who edits them, and Claude Code edits them only when I explicitly say so.

## Rules specific to my part

- Agents return JSON only. Parse in try/catch, retry once on bad JSON, then fail safely.
- Until Sam's tools are merged, use `lib/agents/stubTools.js` with the same names and outputs. Switching must be a one-line import change.
- Write an AgentLog entry for every agent step (the dashboard shows them as a live timeline).
- Orchestrator loop guard: at most 2 "investigate" rounds, then propose the best plan with low confidence.
- Every route file starts with `// Owner: Ashish`.

## Lead duties

Review and merge Sam's and Daksh's PRs (Sam reviews mine). Run the 2-hourly syncs. Decide when a feature gets cut. Edit `CONTRACT.md` after the team agrees on a change.

## My steps

See the Ashish sections of each phase in `docs/RUNBOOK.md`.
