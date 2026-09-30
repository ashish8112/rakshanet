# RakshaNet Runbook: phases and steps

Claude Code works through this file one step at a time for the current person, and records progress in `docs/progress/<name>.md`. A step is finished only when its "Done when" is true. Nobody starts the next phase until the whole team has ticked the phase gate together (10 minute check on the call).

Details behind each step (data shapes, endpoints, tool functions) are in `CONTRACT.md`. Git commands and the PR checklist are in section 6 of `docs/RakshaNet Development Playbook (CodeStorm).md`.

---

## Phase 0: Setup and skeleton (target 1:15 PM to 2:00 PM)

### Ashish (on `main`, the only time anyone works directly on `main`)

- **0.1 Inspect the repo.** List files, check whether a Next.js app exists, branch, uncommitted changes. Create nothing.
  Done when: user knows exactly what exists.
- **0.2 Create the skeleton (local only, no commit).**
  1. Create the Next.js app: JavaScript, App Router, Tailwind, ESLint, no `src/` directory, import alias `@/*`, npm. If `create-next-app` refuses because of existing files, generate it in a temp folder and copy it in, keeping the existing `README.md` and `docs/`.
  2. `.gitignore`: Next.js version, must ignore `node_modules` and `.env*`, plus the line `!.env.example`.
  3. `npm install mongoose @google/genai leaflet react-leaflet` (report any peer dependency error to the user).
  4. Every folder from section 3 of the playbook with a `.gitkeep`, including all `app/api/` subfolders: incidents, resources, responders, dispatch, seed, plan, logs.
  5. `CONTRACT.md` in the root: section 5 of the playbook copied word for word.
  6. `.env.example` with `MONGODB_URI`, `GEMINI_API_KEY`, `GEMINI_MODEL` and placeholder values.
  7. `app/layout.js` title "RakshaNet". Leave `app/page.js` as the default (Daksh owns it).
  8. `npm run build` passes.
  Done when: build passes, `docs/` and `README.md` are intact, folder tree matches section 3.
- **0.3 First commit and push to `main`.** Check `git status` shows no `.env.local` and no `node_modules`. Commit message: `phase 0: next.js skeleton, contract, folders, docs`. Push to `origin main`.
  Done when: GitHub shows the files on `main`.
- **0.4 Tell the team.** Message: "Phase 0 pushed. Pull main, run npm install, copy .env.example to .env.local, create your branch."
- **0.5 Vercel deploy (Ashish owns deployment):** import the repo on Vercel, add the 3 env variables (`MONGODB_URI`, `GEMINI_API_KEY`, `GEMINI_MODEL`), deploy, share the live link with the team (it opens the default Next.js page).
  Done when: live link opens.
- **0.6 Create your branch:** `git checkout -b backend-agents` then `git push -u origin backend-agents`.
  Done when: branch visible on GitHub.

### Sam

- **0.1 MongoDB Atlas:** DONE by Ashish (database `rakshanet`). Get the connection string from Ashish privately (never in the repo).
- **0.2 Pull `main`** after Ashish's 0.3, `npm install`, create `.env.local` from `.env.example` with real values.
- **0.3 Vercel:** NOT Sam's job. Ashish owns deployment (his 0.5). Skip.
- **0.4 Your branch:** ALREADY EXISTS (created by Ashish). Do not use `-b`. Run `git fetch origin`, `git checkout backend-data`, `git pull`.

### Daksh

- **0.1 Gemini API key** from Google AI Studio (for your own `.env.local`).
- **0.2 Sketch the dashboard on paper:** top bar, left incident queue, centre map, right panel (plan + agent timeline).
- **0.3 Pull `main`** after Ashish's 0.3, `npm install`, create `.env.local`.
- **0.4 Create your branch:** `git checkout -b frontend` then `git push -u origin frontend`.

### Gate 0 (whole team)

- [ ] All 3 laptops show the app at `localhost:3000`
- [ ] Vercel live link opens
- [ ] 3 branches exist on GitHub
- [ ] Everyone has read `CONTRACT.md` and has no open questions

---

## Phase 1: Foundations (target 2:00 PM to 4:30 PM)

### Sam (`backend-data`)

- **1.1 DB layer:** DONE by Ashish on `backend-data` (`lib/db/`: cached connection + Incident, Resource, Plan, AgentLog). Do not rewrite it. It reaches `main` with the Phase 1 PR.
- **1.2 Seed data:** Python script in `scripts/` that writes `data/resources.json` (about 8 ambulances, 4 fire units, 4 rescue teams, 6 hospitals with bed capacity, 4 shelters with capacity, real Bengaluru areas and coordinates). Also `data/demo-incidents.json` with the incidents from the demo story.
- **1.3 `POST /api/seed`:** resets the database to the seed data.
- **1.4 `GET /api/resources`** (optional `?kind=`), **`GET /api/incidents`**, **`POST /api/incidents`**.
  Done when: each route tested with a curl command, PR merged.

### Ashish (`backend-agents`)

- **1.1 `lib/agents/gemini.js`:** one helper that calls Gemini, asks for JSON only, parses safely, retries once on bad JSON.
- **1.2 `lib/agents/stubTools.js`:** fake versions of every tool in `CONTRACT.md` 5.3, same names, same output shapes.
- **1.3 Incident Assessment agent** + prompt, output exactly as `CONTRACT.md` 5.4. Writes an AgentLog for every step (uses Sam's models once merged).
- **1.4 Orchestrator v1** (assessment only) and `POST /api/plan/generate` returning a plan with empty assignments.
- **1.5 Test** with 3 sample incidents: clear, vague, very severe.
  Done when: all 3 return valid JSON, PR merged.

### Daksh (`frontend`)

- **1.1 `mock/` files** copied from the contract examples, and `components/api.js` with all fetch calls and a `USE_MOCK` switch.
- **1.2 Layout** from the paper sketch.
- **1.3 Map** with resource and incident markers (colour by severity and status).
- **1.4 Report form:** click the map to set location, then type, description, people affected.
- **1.5 Incident queue** sorted by severity with status badges.
  Done when: all of it works on mock data, PR merged.

### Gate 1 (target 4:30 PM, first real integration)

- [ ] All Phase 1 PRs merged into `main`
- [ ] Report form saves a real incident to MongoDB
- [ ] Map shows the real seeded resources (not mock)
- [ ] Assessment agent returns valid JSON for all 3 test incidents

---

## Phase 2: Core loop (target 4:30 PM to 8:00 PM)

### Sam

- **2.1 All 7 tool functions** in `lib/tools/index.js` (`CONTRACT.md` 5.3), each checked with one worked example (Koramangala to Indiranagar is roughly 5 km). Open a PR early so Ashish can switch from stubs.
- **2.2 `POST /api/responders/update`** and **`PATCH /api/incidents/:id`**.
- **2.3 `POST /api/dispatch`** with revalidation (`validateAssignments`), reserves units, sets incidents to `dispatched`. If anything is no longer valid, commit nothing and return conflicts.

### Ashish

- **2.1 Route and Logistics agent.**
- **2.2 Resource Allocation agent.**
- **2.3 Command and Planning agent.**
- **2.4 Full orchestrator chain** with loop guard (at most 2 "investigate" rounds).
- **2.5 Switch to real tools** (one import change) after Sam's 2.1 is merged.
- **2.6 Plan versioning** and routes: approve, reject, edit, current, history, `GET /api/logs`.

### Daksh

- **2.1 Plan review panel:** assignments with reason and ETA, uncovered incidents, alternatives, Approve / Edit / Reject.
- **2.2 Agent activity timeline** from `GET /api/logs`, with loading states (agents take several seconds).
- **2.3 Approve then dispatch flow** (`CONTRACT.md` 5.2), lines on the map from unit to incident.
- **2.4 Responder simulator buttons:** Arrived, Unavailable, Available, Cleared. If a response says `replanNeeded`, call `POST /api/plan/generate`.
- **2.5 Turn `USE_MOCK` off** everywhere.

### Gate 2 (target 8:00 PM, CORE FREEZE)

- [ ] On the live link: report -> plan with agent timeline -> approve -> dispatch -> units shown en route on the map
- [ ] `POST /api/seed` resets everything for a clean demo
- [ ] Everyone's work is merged; nothing important lives only on a laptop

---

## Phase 3: Replanning, edge cases, polish (target 8:00 PM to 1:00 AM)

### Ashish

- **3.1 Replanning** of only affected incidents, with a `changes` list compared to the previous plan version.
- **3.2 Investigate loop:** vague incident -> status `needs_info` with follow-up questions.
- **3.3 Escalation and conflicts:** `uncovered` with reason and expected delay; alternatives with trade-offs.
- **3.4 Prompt tuning** so reasons and summaries read clearly to a non-technical judge.

### Sam

- **3.1 Duplicate detection** in `POST /api/incidents` (within 0.5 km and 30 minutes).
- **3.2 Hospital and shelter capacity** updated on dispatch.
- **3.3 `docs/demo-script.md`:** exact inputs and clicks for the 3-minute demo.
- **3.4 Tune seed data** so the demo really runs out of units at the escalation step.
- **3.5 Test every edge case** from the Round 1 doc and report bugs to the owner.

### Daksh

- **3.1 Before and after view** for replanned plans ("what changed and why").
- **3.2 Escalation banner, duplicate warning, follow-up questions form** (answer -> `PATCH` -> regenerate).
- **3.3 Polish** and phone-screen check.

### Gate 3 (target 1:00 AM, FEATURE FREEZE)

- [ ] Demo script runs 3 times in a row on the live link with no failure
- [ ] All 6 edge cases from the Round 1 doc are visibly handled
- [ ] From now on: bug fixes only

---

## Phase 4: Deliver (target 1:00 AM to 6:30 AM)

- **4.1** Sleep in shifts, one person always awake.
- **4.2** Bug fixes only, still through PRs.
- **4.3** README: Ashish (technical) + Sam (setup steps). Slides: Daksh. Demo video: Daksh records the screen, Ashish does the voice.
- **4.4** Final checklist (section 11 of the playbook), submit by 6:30 AM.
