# RakshaNet

**An AI-assisted emergency control room for Bengaluru.** Four AI agents plan which ambulances, fire units and rescue teams go to which emergency, a human dispatcher approves every decision, and the plan updates itself when things change on the ground.

Live demo: https://rakshanet-three.vercel.app
Built in 24 hours by team **CodeStorm** (Ashish, Daksh, Sam) for the Agentic AI hackathon.

---

## The problem

When several emergencies happen at once (a flood, a building collapse, a road accident), a dispatcher has to decide in minutes which of dozens of units goes where, keep track of hospital beds and shelter space, and redo everything when an ambulance breaks down. Doing this by hand is slow and error-prone exactly when it matters most.

## What RakshaNet does

1. **Report**: the dispatcher enters a 112 call on the map (type, description, people affected).
2. **Plan**: four agents assess the incident, find the nearest free units, allocate them across all open incidents by severity, and write the plan in plain language, with alternatives and trade-offs.
3. **Decide**: the dispatcher approves, edits or rejects. Nothing moves without a human.
4. **Dispatch**: units are reserved and hospitals or shelters are booked, re-checked against the live database first.
5. **Adapt**: when a crew reports "vehicle broke down" or "job done", the system replans only what changed and explains why.
6. **Escalate**: when there are not enough units, the plan says who is short of what and how long they will wait.

Every agent step appears live in the **agent timeline**, so the dispatcher sees how the AI reached its plan.

---

## How the agents work

```
            new report / unit update / dispatcher request
                              |
                     +--------v---------+
                     |   Orchestrator   |  loop guard: max 2 "investigate" rounds
                     +--------+---------+
                              |
  1. Incident Assessment  (Gemini)  severity 1-5, confidence, needed capabilities, follow-up questions
  2. Route & Logistics    (tools)   nearest free units, ETAs, hospitals/shelters with space
  3. Resource Allocation  (Gemini)  which unit goes where, most severe first, one unit per incident
     + coverage check     (code)    no free unit left idle while a need is uncovered
     + escalation         (code)    uncovered needs with expected wait
  4. Command & Planning   (Gemini)  plain-language summary, alternatives, what changed, or "investigate"
                              |
                     proposed Plan (versioned)  ->  dispatcher approves / edits / rejects  ->  dispatch
```

**Design principles**

- **Agents reason, tools count.** Gemini never produces a distance, ETA or bed count. Those come from deterministic tool functions (Haversine distance, city speeds: ambulance 30 km/h, fire and rescue 25 km/h). The allocation agent picks from candidates the tools found; the numbers are copied from the tools, not from the model.
- **Human in the loop.** The AI only proposes. Approve, edit and reject are always the dispatcher's. Edits are re-validated against the live database.
- **Safe dispatch.** Dispatch runs in a MongoDB transaction and re-checks every unit and bed at that moment. If anything changed since the plan was made, nothing is committed and the conflicts are returned.
- **Replan only what changed.** The allocation agent sees units already on scene and the previous plan's choices, so a breakdown replaces one unit instead of reshuffling the city. Each change records its real cause ("AMB-03 is now unavailable").
- **Ask, don't guess.** A vague, low-severity report ("something happened near the market") becomes `needs_info` with a question for the dispatcher. Severe incidents always get units immediately.
- **Robust to the model.** Every agent output is validated against a fixed JSON contract. Bad output is repaired or retried with feedback on what was wrong; busy or rate-limited calls wait and retry, and several API keys can be rotated.

---

## Tech stack

| Part | Technology |
| --- | --- |
| App | Next.js (App Router), JavaScript, Tailwind CSS |
| Map | Leaflet + OpenStreetMap |
| AI | Google Gemini via `@google/genai` (JSON-only responses) |
| Database | MongoDB Atlas via Mongoose (transactions for seed and dispatch) |
| Hosting | Vercel (auto-deploys from `main`) |

## Project structure

```
app/                  pages (dashboard, dispatch, fleet, incidents, logs) and API routes
app/api/plan/         plan generate, current, history, approve, reject, edit
app/api/logs/         agent timeline
app/api/incidents/    report and update incidents (duplicate detection)
app/api/resources/    units, hospitals, shelters
app/api/responders/   crew updates: arrived, unavailable, available, cleared
app/api/dispatch/     transactional dispatch with re-validation
app/api/seed/         reset the database to the demo city
lib/agents/           the Gemini agents, prompts and the Gemini helper
lib/orchestrator/     the agent chain, escalation and plan decisions
lib/tools/            deterministic tools: distance, ETA, nearest units, capacity, duplicates, validation
lib/db/               MongoDB connection and models (Incident, Resource, Plan, AgentLog)
components/           dashboard UI
data/, scripts/       Bengaluru seed data and the Python script that generates it
CONTRACT.md           the shared data shapes, API and tool contract the team built against
```

## API overview

All responses use one envelope: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code", "message" } }`.

| Endpoint | Purpose |
| --- | --- |
| `GET/POST /api/incidents`, `GET/PATCH /api/incidents/:id` | Report, list and update incidents |
| `GET /api/resources?kind=` | Units, hospitals and shelters |
| `POST /api/plan/generate` | Run the agents, returns the proposed plan and the agent logs |
| `GET /api/plan/current`, `GET /api/plan/history` | Current plan, all versions |
| `POST /api/plan/:id/approve`, `/reject`, `/edit` | Dispatcher decisions (edit creates a new version) |
| `POST /api/dispatch` | Commit an approved plan |
| `POST /api/responders/update` | Crew events; says whether a replan is needed |
| `GET /api/logs?planVersion=` | Agent timeline |
| `POST /api/seed` | Reset to demo data |

Full shapes: [CONTRACT.md](CONTRACT.md).

---

## Setup

<!-- Sam: local setup steps (clone, npm install, .env.local values, seeding, running) go here in Phase 4. -->

## Team

| Name | Role |
| --- | --- |
| Ashish | Team lead, AI agents and orchestrator, deployment |
| Sam | Database, seed data, tools, incident and dispatch APIs |
| Daksh | Dashboard, map, plan review and agent timeline UI |
