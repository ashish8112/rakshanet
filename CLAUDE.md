# RakshaNet: instructions for Claude Code

Claude Code reads this file automatically at the start of every session. It applies to all three team members.

RakshaNet is an emergency control room dashboard for Bengaluru, built by team CodeStorm (Ashish, Sam, Daksh) in a 24-hour hackathon (theme: Agentic AI). Four Gemini agents plan which emergency units go to which incidents, a human dispatcher approves, and the system replans when things change.

## At the start of every session

1. If the user has not said who they are, ask: "Who am I working with: Ashish, Sam or Daksh?"
2. Read these files, in this order:
   - `CONTRACT.md` (source of truth for all names, URLs and JSON shapes). If it does not exist yet, we are in Phase 0: read section 5 of `docs/RakshaNet Development Playbook (CodeStorm).md` instead.
   - `docs/briefs/<name>.md` (that person's role, owned folders, tasks)
   - `docs/RUNBOOK.md` (the phases and numbered steps)
   - `docs/progress/<name>.md` (where that person left off)
3. Run `git status` and `git branch --show-current`.
4. Tell the user in a few lines: current branch, current phase and step, the next step, and anything odd (uncommitted changes, wrong branch, missing files).
5. Wait for the user's OK before doing anything.

## How to work

- One step from `docs/RUNBOOK.md` at a time. Before writing code for a step, explain the approach in a few lines and wait for OK.
- After each step: tell the user exactly how to test it (command, URL or clicks), then update `docs/progress/<name>.md` (tick the step, note anything important), then STOP and wait.
- Never jump ahead to the next phase. At the end of a phase, tell the user the phase gate is next; gates are checked by the whole team together.
- Keep code simple and readable. The team must explain it to judges.

## Rules for everyone (never break these)

1. `CONTRACT.md` is law. Copy field names, URLs, function names and JSON shapes exactly. Never rename anything.
2. Only create or edit files inside the folders the person owns (see their brief). Never edit another person's folder.
3. Shared files (`package.json`, `app/layout.js`, `CONTRACT.md`, `CLAUDE.md`, `.env.example`, `README.md`, `docs/RUNBOOK.md`) are changed only by Ashish, and only when he explicitly says so.
4. Never install npm packages unless the user explicitly says so. If one is needed, stop and say which and why.
5. Never push to `main` directly (the only exception is Ashish in Phase 0). Work on the person's own branch and merge through a Pull Request.
6. Never commit `.env.local`, API keys or connection strings.
7. If the contract seems wrong or missing something: STOP, explain the problem, and let the team decide. Do not work around it.
8. If a git merge shows a CONFLICT: STOP and tell the user. Do not resolve it by guessing.

## Stack and conventions

- Next.js App Router, JavaScript (no TypeScript), Tailwind CSS.
- Components with state, effects, clicks or the map start with `"use client"`.
- Leaflet map loaded with `dynamic(() => import(...), { ssr: false })`.
- MongoDB Atlas via Mongoose (only code in `lib/db/` connects to the database).
- Gemini via `@google/genai`, model from `process.env.GEMINI_MODEL`, key from `process.env.GEMINI_API_KEY`.
- Every API response: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code": "...", "message": "..." } }`.
- JSON uses `id` (string), never `_id`. Dates are ISO strings. Locations are `{ lat, lng, area }`.
- Every API route file starts with `// Owner: <name>`.

## Branches

| Person | Branch |
| --- | --- |
| Ashish | `backend-agents` |
| Sam | `backend-data` |
| Daksh | `frontend` |

Git commands, PR checklist and merge order: section 6 of the playbook in `docs/`.
