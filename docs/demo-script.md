# RakshaNet demo script (3 minutes)

Exact inputs and clicks for the live demo on https://rakshanet-three.vercel.app.
The same story was driven through the real screens in a headless browser (every step passed) and through the API 3 times in a row (36/36 checks).

## Before the demo (5 minutes earlier)

1. **Reset the data** (wipes everything, only do it now). Replace `PASSWORD` with the control room password:
   `curl -X POST https://rakshanet-three.vercel.app/api/seed -H "x-dispatcher-password: PASSWORD"`
   Expect `{"ok":true,"data":{"incidents":3,"resources":26}}`.
2. Open the site, **sign in** with your name and the password. The screen shows 3 open emergencies on the left: flood (Koramangala), road accident (Hebbal), building collapse (Indiranagar).
3. Do **not** press "Ask AI for a plan" while rehearsing right before: Gemini's free limit is shared. Each plan takes 5-15 s (up to 20 s if Google is busy). Keep talking while the four steps tick.
4. Seed facts you can rely on: only **2 fire trucks are free** (FIR-01 Koramangala, FIR-02 Indiranagar; FIR-03 and FIR-04 are out of service). That is what makes step 3 escalate every time.

## The screen

- **Left:** Emergencies (red *New emergency* button on top). Cards say what, where, how serious (Critical / Serious / Moderate / Minor) and the status in words.
- **Centre:** the map. Ring colour = how serious; dashed blue line = unit on its way.
- **Right:** three tabs: **AI Plan**, **Units** (crew radio updates), **Activity** (every AI step).
- Top bar: open emergencies, free units, things waiting for you, *How it works*.

## The story

| Time | Click / input | What appears | What to say |
| --- | --- | --- | --- |
| 0:00 | Signed in, dashboard open | 3 emergencies, units on the map, "3 emergencies are waiting for a plan" | "This is a 112 control room. Three emergencies are already open: a flood, an accident, a building collapse." |
| 0:15 | **AI Plan** tab → **✨ Ask AI for a plan** | Four steps tick: *Understanding the emergency → Finding the nearest units → Deciding who goes where → Writing the plan*. Then the plan: "The building collapse in Indiranagar comes first: …" and *Who goes where* with minutes and km | "Four AI assistants work in sequence. They reason, but every distance and time comes from real calculations, not from the model." |
| 0:45 | **✓ Approve & send units** | "✓ Units sent", dashed lines on the map, cards say *Help on the way* | "Nothing moves until a human approves. Sending re-checks every unit against the live database first." |
| 1:00 | **New emergency** → area **Whitefield** → **Fire** → text `Fire in a Whitefield apartment block, smoke on 3 floors, people trapped on the terrace` → people `12` → **Save emergency** | New card, toast "Emergency saved…" | "Now two more fires come in at once." |
| 1:10 | Again: **New emergency** → **Jayanagar** → **Fire** → same text with Jayanagar → `12` → **Save emergency** | Second card | |
| 1:15 | **AI Plan** → **✨ Ask AI for a plan** | Amber box: "Fire in … is short of help — No free fire unit; the nearest busy one could arrive in about 29-48 min". *Other options the AI considered* shows the trade-off | "The city has run out of fire trucks. The system does not hide it: it says who waits, how long, and what else we could do." |
| 1:40 | **✓ Approve & send units** | Units sent | |
| 1:50 | **Units** tab → under *On a job*, the ambulance at the collapse (usually **AMB-03**) → **Broke down** | "AMB-03 marked as broken down. The AI is finding a replacement." The AI Plan tab opens and re-plans by itself | "An ambulance breaks down on the way." |
| 2:05 | Read the new plan | *What changed*: "AMB-02 replaces AMB-03 … — AMB-03 is now unavailable". Only that one unit changes | "It re-plans only what changed, and says why." |
| 2:15 | **✓ Approve & send units** | Replacement sent | |
| 2:20 | **New emergency** → **Majestic** → **Something else** → `Something happened near the market, people shouting` (no people count) → **Save** → **Ask AI for a plan** | The Majestic card turns amber: *Needs your answer*, with the AI's question | "When a report is too vague, the AI asks instead of guessing." |
| 2:35 | On that card type `Two people collapsed from heat stroke at the market` → **Send answer and re-plan** | Re-assessed (about Serious, needs medical), ambulance in the new plan | "The answer goes straight back through the agents." |
| 2:50 | Optional: **New emergency** a flood right next to the Koramangala flood | Card says "May be the same event as flood in Koramangala" | "Duplicate calls about one event are linked, not double-dispatched." |
| 3:00 | **Activity** tab | Every AI step and approval, per plan, with the approver's name | "Every decision is logged: what each assistant concluded and who approved it." |

## If something goes wrong

- **"The AI could not make a plan" / "Could not call Gemini"**: Google is busy or the per-minute limit was hit. Wait 15-20 s and press **Try again**.
- **"Some units were taken by something else…"**: the app re-plans automatically; approve the new plan.
- **Signed out suddenly**: sign in again (sessions last 12 hours).
- **Data looks messy**: run the reset command from "Before the demo" (only between runs, never during).

## Edge cases this demo shows

| Edge case | Where |
| --- | --- |
| Not enough units (escalation with expected wait) | 1:15 |
| Unit becomes unavailable mid-mission (re-planning with the reason) | 1:50 |
| Vague report (the AI asks, the dispatcher answers) | 2:20 |
| Duplicate report | 2:50 |
| Unit taken between plan and dispatch (re-check, fresh plan) | "If something goes wrong" |
| Human override | Reject this plan, at any step |
