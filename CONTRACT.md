## Shared contract (copy into CONTRACT.md)

This section is copied word for word into `CONTRACT.md` in the repo in Phase 0, and every AI builds against it.

### 5.1 Data models (MongoDB collections)

**Incident** (`incidents`)

```json
{
  "id": "66f...",
  "code": "INC-001",
  "type": "flood | fire | collapse | accident | medical | other",
  "description": "Water entering ground floors, 10 people stuck",
  "location": { "lat": 12.9352, "lng": 77.6245, "area": "Koramangala" },
  "peopleAffected": 10,
  "status": "new | assessing | needs_info | planned | dispatched | resolved",
  "severity": 4,
  "severityConfidence": "high | low",
  "requiredCapabilities": ["medical", "rescue"],
  "followUpQuestions": ["Exact floor of trapped people?"],
  "possibleDuplicateOf": null,
  "assignedResources": ["66f..."],
  "reportedAt": "2026-09-30T14:05:00.000Z",
  "updatedAt": "2026-09-30T14:06:00.000Z"
}
```

`severity`, `severityConfidence` are `null` until assessed. `peopleAffected` can be `null` (unknown).

**Resource** (`resources`)

```json
{
  "id": "66f...",
  "code": "AMB-01",
  "kind": "ambulance | fire_unit | rescue_team | hospital | shelter",
  "name": "Ambulance 01 (St. John's)",
  "location": { "lat": 12.9299, "lng": 77.6188, "area": "Koramangala" },
  "status": "available | reserved | en_route | on_scene | unavailable",
  "capabilities": ["medical"],
  "capacity": { "total": 40, "used": 12 },
  "assignedIncident": null,
  "updatedAt": "2026-09-30T14:00:00.000Z"
}
```

Capabilities: ambulance `["medical"]`, fire\_unit `["fire", "rescue"]`, rescue\_team `["rescue"]`, hospital `["beds"]`, shelter `["shelter"]`. `capacity` only for hospital and shelter (null for units). Hospitals and shelters stay `available` and only their `capacity.used` changes.

**Plan** (`plans`)

```json
{
  "id": "66f...",
  "version": 3,
  "status": "proposed | approved | rejected | committed | superseded | stale",
  "trigger": "new_incident | resource_change | responder_update | manual | edit",
  "summary": "Collapse in Indiranagar takes priority; AMB-02 moved from flood.",
  "assignments": [
    {
      "incidentId": "66f...",
      "resourceId": "66f...",
      "destinationId": "66f...",
      "distanceKm": 3.2,
      "etaMinutes": 9,
      "reason": "Nearest free ambulance with medical capability"
    }
  ],
  "uncovered": [
    { "incidentId": "66f...", "reason": "No free rescue team", "expectedDelayMinutes": 25 }
  ],
  "alternatives": [
    { "summary": "Keep AMB-02 on flood", "tradeoff": "Collapse waits 14 min longer" }
  ],
  "changes": [
    { "what": "AMB-02 moved from INC-001 to INC-002", "why": "INC-002 severity 5 vs 3" }
  ],
  "dispatcherNote": "",
  "createdAt": "2026-09-30T14:10:00.000Z",
  "decidedAt": null
}
```

`destinationId` = hospital or shelter, or `null`. `changes` is empty for the first plan.

**AgentLog** (`agentlogs`)

```json
{
  "id": "66f...",
  "planVersion": 3,
  "incidentId": "66f... or null",
  "agent": "orchestrator | incident_assessment | route_logistics | resource_allocation | command_planning",
  "message": "Severity 5, high confidence: structural collapse with people trapped",
  "output": {},
  "createdAt": "2026-09-30T14:09:30.000Z"
}
```

### 5.2 API endpoints

All return the envelope from section 4. Owner in brackets.

| Method + URL | Owner | Request body | Response `data` |
| --- | --- | --- | --- |
| `GET /api/incidents` | Sam | none | `Incident[]` sorted by severity desc, then reportedAt |
| `POST /api/incidents` | Sam | `{ type, description, location, peopleAffected? }` | `Incident` (status `new`) + `duplicates: [{ incidentId, distanceKm, minutesApart }]` |
| `GET /api/incidents/:id` | Sam | none | `Incident` |
| `PATCH /api/incidents/:id` | Sam | any of `{ description, peopleAffected, location, status }` | `Incident` |
| `GET /api/resources?kind=ambulance` | Sam | none (kind optional) | `Resource[]` |
| `POST /api/responders/update` | Sam | `{ resourceId, event: "arrived" / "unavailable" / "available" / "cleared" }` | `{ resource, replanNeeded, affectedIncidentIds }` |
| `POST /api/dispatch` | Sam | `{ planId }` | `{ committed: true, plan }` or `{ committed: false, conflicts: [{ resourceId, reason }], replanNeeded: true }` |
| `POST /api/seed` | Sam | none | `{ incidents: n, resources: n }` (resets DB to seed data, used before every demo) |
| `POST /api/plan/generate` | Ashish | `{ trigger, incidentId?, resourceId? }` | `{ plan, logs: AgentLog[] }` |
| `GET /api/plan/current` | Ashish | none | latest `Plan` (proposed, approved or committed) or `null` |
| `GET /api/plan/history` | Ashish | none | `Plan[]` newest first |
| `POST /api/plan/:id/approve` | Ashish | `{ note? }` | `Plan` (status `approved`) |
| `POST /api/plan/:id/reject` | Ashish | `{ note }` | `Plan` (status `rejected`) |
| `POST /api/plan/:id/edit` | Ashish | `{ assignments, note }` | new `Plan` version (status `proposed`, trigger `edit`) |
| `GET /api/logs?planVersion=3` | Ashish | none | `AgentLog[]` oldest first |

Frontend flow after approve: call `/api/plan/:id/approve`, then `/api/dispatch`. If dispatch returns `committed: false`, show the conflicts and call `/api/plan/generate` with trigger `resource_change`.

**Sign-in (added after Phase 3).** When `DISPATCHER_PASSWORD` is set, every page and API needs a session: `POST /api/auth/login { name, password }` sets an httpOnly cookie (12 h), `POST /api/auth/logout` clears it, `GET /api/auth/me` returns `{ name, authEnabled }`. Without a session, pages redirect to `/login` and APIs return `401 { ok: false, error: { code: "UNAUTHORIZED" } }`. Scripts may send the header `x-dispatcher-password: <password>` instead (e.g. `curl -X POST .../api/seed -H "x-dispatcher-password: ..."`). Enforced in `proxy.js`.

### 5.3 Tool functions (Sam builds in `lib/tools/`, Ashish's agents call them)

All exported from `lib/tools/index.js`.

| Function | Input | Output |
| --- | --- | --- |
| `distanceKm(a, b)` | two `{lat, lng}` | number, 1 decimal |
| `etaMinutes(a, b, kind)` | two `{lat, lng}`, resource kind | whole number (ambulance 30 km/h, fire\_unit 25, rescue\_team 25 city speed) |
| `getAvailableResources({ kind?, capability? })` | filters | `Promise<Resource[]>` with status `available` |
| `findNearestAvailable({ location, capability, limit = 3 })` | location + one capability | `Promise<[{ resource, distanceKm, etaMinutes }]>` nearest first |
| `findNearestWithCapacity({ location, kind, needed })` | kind `hospital` or `shelter` | `Promise<[{ resource, distanceKm, free }]>` |
| `detectDuplicates(incident)` | an incident | `Promise<[{ incidentId, distanceKm, minutesApart }]>` within 0.5 km and 30 min |
| `validateAssignments(assignments)` | plan assignments | `Promise<{ valid, conflicts: [{ resourceId, reason }] }>` |

Until Sam merges these, Ashish uses fake versions with the same names and outputs in `lib/agents/stubTools.js`.

### 5.4 Agent outputs (Ashish, JSON only)

```json
// incident_assessment
{ "severity": 4, "confidence": "high", "requiredCapabilities": ["medical", "rescue"],
  "peopleEstimate": 10, "followUpQuestions": [], "reasoning": "..." }

// route_logistics
{ "incidentId": "...", "candidates": [{ "resourceId": "...", "distanceKm": 2.1, "etaMinutes": 6 }],
  "destinationOptions": [{ "resourceId": "...", "distanceKm": 3.4, "free": 28 }] }

// resource_allocation
{ "assignments": [/* same shape as Plan.assignments */], "uncovered": [], "conflicts": [] }

// command_planning
{ "action": "propose | investigate", "summary": "...", "alternatives": [], "changes": [],
  "investigate": { "incidentId": "...", "question": "..." } }
```

### 5.5 Environment variables

`.env.example` is committed; each person copies it to `.env.local` with real values (never committed).

```
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=your_own_key_from_ai_studio
GEMINI_MODEL=gemini-model-name-shown-in-ai-studio
```

Each person uses their **own** Gemini key locally to spread the free limits. Vercel uses Ashish's key. Optional `GEMINI_API_KEYS` (comma separated) lets the app rotate between several keys; `GEMINI_API_KEY` alone still works. All three use the **same** `MONGODB_URI` but Daksh and Ashish should not run `/api/seed` while Sam is testing (it wipes data).
