# RakshaNet demo script (3 minutes)

Exact inputs and clicks for the live demo on https://rakshanet-three.vercel.app.
Rehearsed end to end 3 times in a row on a test database (all checks passed, about 80-100 s of machine time per run).

## Before the demo (5 minutes earlier)

1. **Reset the data** (wipes everything, only do it now):
   `curl -X POST https://rakshanet-three.vercel.app/api/seed`
   Expect `{"ok":true,"data":{"incidents":3,"resources":26}}`.
2. Open the dashboard, check the map shows units and 3 incidents: flood (Koramangala), road accident (Hebbal), building collapse (Indiranagar).
3. Do **not** click Generate Plan while rehearsing just before: Gemini's free limit is shared (about 15 requests per minute per key). Each plan takes 3-8 s; if Google is busy it can take up to 20 s. Keep talking while it thinks.
4. Seed facts you can rely on: only **2 fire units are free** (FIR-01 Koramangala, FIR-02 Indiranagar; FIR-03 and FIR-04 are out of service). That is what makes step 3 escalate every time.

## The story

| Time | Click / input | What appears | What to say |
| --- | --- | --- | --- |
| 0:00 | Dashboard open | Map of Bengaluru, 3 open incidents, units as markers | "This is a 112 control room. Three emergencies are already open: a flood, an accident, a building collapse." |
| 0:15 | **Generate Plan** (plan panel) | Agent timeline fills: assessment for each incident (severity, confidence), route and logistics (nearest units, km, minutes), allocation, command summary. Summary starts "The building collapse in Indiranagar comes first..." | "Four agents work in sequence. The AI reasons, but every distance and ETA comes from our routing tools, not from the model." |
| 0:45 | **Approve & Dispatch** | Units change to reserved, lines on the map, incidents become dispatched | "Nothing moves until a human approves. Dispatch re-checks every unit against the live database first." |
| 1:00 | **Report Emergency**: fire, **Whitefield** (search or click the map there), description `Fire in a Whitefield apartment block, smoke on 3 floors, people trapped on the terrace`, people `12`. Submit. | New incident on the map | "Now two more fires come in at once." |
| 1:10 | **Report Emergency** again: fire, **Jayanagar**, same description with Jayanagar, people `12`. Submit. | Second new incident | |
| 1:15 | **Generate Plan** (or Replan) | Escalation banner / uncovered list: one fire has "No free fire unit; the nearest busy one could arrive in about 29-48 min". Summary names the shortage. Alternatives show the trade-off. | "The city has run out of fire units. The system does not hide it: it says who waits, how long, and offers alternatives with their cost." |
| 1:40 | **Approve & Dispatch** | Plan committed | |
| 1:50 | **Fleet** page: on the ambulance at the collapse (usually **AMB-03**), click **Unavailable** | The app replans automatically (responder update) | "An ambulance breaks down on the way." |
| 2:05 | Back to the plan | Change: "AMB-02 replaces AMB-03 at the building collapse in Indiranagar", why: "AMB-03 is now unavailable". Only that one unit changes. | "It replans only what changed, and says why." |
| 2:15 | **Approve & Dispatch** | Replacement sent | |
| 2:20 | **Report Emergency**: type other, **Majestic**, description `Something happened near the market, people shouting`, no people count. Submit, then **Generate Plan**. | Incident becomes **needs info** with a question like "What kind of incident happened near the market?" | "When a report is too vague, the agents ask instead of guessing." |
| 2:35 | **Incidents** page: answer the question: `Two people collapsed from heat stroke at the market`, people `2` | Reassessed (about severity 4, needs medical), ambulance planned | "The answer goes back through the agents." |
| 2:50 | Optional: **Report Emergency** a flood right next to the Koramangala flood | "Potential Duplicate Incident Linked" warning | "Duplicate calls about the same event are linked, not double-dispatched." |
| 3:00 | **Logs** page | Full agent timeline per plan version | "Every decision is logged: what each agent concluded and what the dispatcher approved." |

## If something goes wrong

- **Plan takes long / error "Could not call Gemini"**: Google is busy or the per-minute limit was hit. Wait 15-20 s and click Generate Plan again.
- **Dispatch returns conflicts**: the app shows them and replans automatically; approve the new version.
- **Data looks messy**: run the reset command from "Before the demo" (only between runs, never during).

## Edge cases this demo shows

| Edge case | Where |
| --- | --- |
| Not enough units (escalation with expected wait) | 1:15 |
| Unit becomes unavailable mid-mission (replanning with reason) | 1:50 |
| Vague report (investigate, ask the dispatcher) | 2:20 |
| Duplicate report | 2:50 |
| Unit taken between plan and dispatch (dispatch re-validation, conflicts, replan) | covered by dispatch; see "If something goes wrong" |
| Human override (edit / reject) | Edit or Reject in the plan panel at any step |
