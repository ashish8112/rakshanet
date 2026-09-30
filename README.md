# RakshaNet

**An AI-assisted emergency control room for Bengaluru.** Four AI agents plan which ambulances, fire units and rescue teams go to which emergency, a human dispatcher approves every decision, and the plan updates itself when things change on the ground.

Live demo: https://rakshanet-three.vercel.app

Tutorial video (5 min, no login needed, choose English or हिंदी voice): https://rakshanet-three.vercel.app/tutorial · direct files: [English](https://rakshanet-three.vercel.app/tutorial.mp4) · [हिंदी](https://rakshanet-three.vercel.app/tutorial-hi.mp4)
Built in 24 hours by team **CodeStorm** (Ashish, Daksh, Sam) for the Agentic AI hackathon.

---

## The problem

When several emergencies happen at once (a flood, a building collapse, a road accident), a dispatcher has to decide in minutes which of dozens of units goes where, keep track of hospital beds and shelter space, and redo everything when an ambulance breaks down. Doing this by hand is slow and error-prone exactly when it matters most.

## What RakshaNet does

1. **Report**: the dispatcher signs in, presses *New emergency* and enters the 112 call (place, type, what the caller said, people affected).
2. **Plan**: four agents assess the incident, find the nearest free units, allocate them across all open incidents by severity, and write the plan in plain language, with alternatives and trade-offs.
3. **Decide**: the dispatcher approves, edits or rejects. Nothing moves without a human.
4. **Dispatch**: units are reserved and hospitals or shelters are booked, re-checked against the live database first.
5. **Adapt**: when a crew reports "vehicle broke down" or "job done", the system replans only what changed and explains why.
6. **Escalate**: when there are not enough units, the plan says who is short of what and how long they will wait.

**What makes it different**

- **Glass-box agents, live.** While the AI plans, every assistant's step and every tool call ("find nearest free units with medical → AMB-03 1.2 km…") streams onto the screen as it happens.
- **Speak the call in any language.** The dispatcher dictates or pastes the caller's words in English, Hindi or Kannada; the AI fills in the form (type, place, people) and lists what to still ask. The place is searched on the map for the dispatcher to confirm.
- **Acts on its own, never alone.** A new emergency is planned automatically, and the co-pilot watches the city (hospitals filling up, crews that have not reported, clusters of similar calls, questions from the AI) — but nothing is sent until a human approves.
- **Never goes dark.** If Gemini is busy or offline, a rule-based backup planner takes over and the plan is clearly marked "Backup plan".
- **Recognisable vehicles and a live map.** Every vehicle has its registration number; sent vehicles move along their route with an arrival countdown (simulated; "Demo speed" makes time pass 10× faster).
- **Works even when the AI does not.** A ✋ Manual mode lets the dispatcher do everything by hand (choose vehicles nearest-first, set severity and needs), with the same safety checks.
- **Quick actions where you look.** Vehicles on each emergency card have Arrived / Job done; emergencies can be marked resolved or cancelled (reported by mistake); hospitals and shelters record admissions and discharges.
- **Light and dark mode.**
- **Full history and impact.** Every report, plan, approval and crew update is logged with who did it; the History page shows today's emergencies, people helped, call-to-dispatch time and average arrival time.

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
| Access | Dispatcher sign-in: shared password, signed httpOnly cookie, enforced for every page and API in `proxy.js` |

## Project structure

```
app/                  pages: control room (/), fleet, history, login; and the API routes
proxy.js              sign-in guard for every page and API
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

Requirements: Node.js 20+, a MongoDB Atlas cluster (free tier is fine; transactions need a replica set, which Atlas provides), a Gemini API key from Google AI Studio.

```bash
git clone https://github.com/ashish8112/rakshanet.git
cd rakshanet
npm install
cp .env.example .env.local      # then fill in the values below
npm run dev                     # http://localhost:3000
```

`.env.local`:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Your Atlas connection string, ending in `/rakshanet` (the database name) |
| `GEMINI_API_KEY` | Your key from Google AI Studio |
| `GEMINI_MODEL` | A model your key can use, e.g. `gemini-3.5-flash-lite` |
| `GEMINI_API_KEYS` | Optional: several keys, comma separated, to spread the free limit of about 15 requests per minute per key |
| `DISPATCHER_PASSWORD` | The control room password for the sign-in page. Empty = no login (handy locally); always set it when deployed |
| `AUTH_SECRET` | Optional: long random string that signs the login cookie |

Load the demo city (26 units, hospitals and shelters, 3 open incidents). This **wipes** the database:

```bash
curl -X POST http://localhost:3000/api/seed -H "x-dispatcher-password: YOUR_PASSWORD"   # header only needed when a password is set
```

The seed data is generated by `python scripts/generate_seed_data.py` (writes `data/resources.json` and `data/demo-incidents.json`); it is already committed, so you only need Python to change it.

Testing without touching shared data: point `MONGODB_URI` at another database name on the same cluster (for example `/rakshanet_test`), then seed it. The demo walkthrough is in [docs/demo-script.md](docs/demo-script.md).

Deploying: import the repo on Vercel, add the same environment variables, deploy. Every push to `main` redeploys.

## Team

| Name | Role |
| --- | --- |
| Ashish | Team lead, AI agents and orchestrator, deployment |
| Sam | Database, seed data, tools, incident and dispatch APIs |
| Daksh | Dashboard, map, plan review and agent timeline UI |
