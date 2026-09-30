# RakshaNet demo script (about 4 minutes)

Live: https://rakshanet-three.vercel.app — sign in with any name and the password `rakshak@digital5600` (for judging day only; it will be changed after the evaluation).
Tutorial video with voice-over (works without signing in): https://rakshanet-three.vercel.app/tutorial (page with the 🔊 English / हिंदी choice); direct files: English https://rakshanet-three.vercel.app/tutorial.mp4, Hindi https://rakshanet-three.vercel.app/tutorial-hi.mp4 (the player has a 🔊 English / हिंदी switch) — also "▶ Watch the demo video" on the login page and "▶ Watch video" in the app header.

## Before the demo (5 minutes earlier)

1. **Reset the data** (wipes everything, only now):
   `curl -X POST https://rakshanet-three.vercel.app/api/seed -H "x-dispatcher-password: <password>"`
   → `{"ok":true,"data":{"incidents":3,"resources":26}}`
2. Sign in. You should see 3 open emergencies (flood Koramangala, road accident Hebbal, building collapse Indiranagar), the map, and the plan panel with **✨ AI / ✋ Manual**.
3. Keep **✨ AI** selected. Don't click around right before (Gemini free limit is shared). Plans take 5-15 s; keep talking while the live feed runs.
4. Only 2 fire trucks are free (FIR-03 and FIR-04 are out of service on purpose): a second fire always shows the "short of help" warning.
5. If the Wi-Fi is bad, play the offline video instead.

## The story

| # | Do | What appears | Say |
| --- | --- | --- | --- |
| 1 | Show the screen | Control room / Fleet / History, emergencies, map, plan panel, 🔔 Co-pilot | "This is a 112 control room. Everything is on one screen; the AI helps, the dispatcher decides." |
| 2 | **New emergency** → ⚡ Quick fill: type or 🎙️ speak `Kristu Jayanti college hostel mein aag lagi hai, 40 students bahar aa rahe hain, dhuaan bahut hai` → **✨ Fill the form** | Type Fire, English description, 40 people, place search "Kristu Jayanti…", "Also ask the caller: …" | "Callers speak Hindi, Kannada, English. The AI fills the form; the dispatcher checks it." |
| 3 | Pick **Kristu Jayanti University** → **Save emergency** | The AI starts planning by itself; live feed of real steps and tool calls ("find nearest free units with fire → FIR-02 0.4 km") | "Four agents, live. The AI reasons; every distance and time comes from real calculations." |
| 4 | Read the plan → **✓ Approve & send units** → **⏩ Demo speed** | Plan in plain words, vehicles by number plate; vehicles drive on the map, cards count down "arriving in N min" | "Nothing moves until a human approves." |
| 5 | **New emergency** → type `Whitefield`, pick it → Fire → a few words → 12 → Save | Amber box: "No free fire unit; the nearest busy one could arrive in about N min" + other options with their cost | "It doesn't hide a shortage: it says who waits, how long, and what else we could do." |
| 6 | Approve. On the Kristu card press **Arrived** then **Job done** | Vehicle free again | "Crew updates are one tap on the card." |
| 7 | **Fleet** → under *On a job*, the ambulance at the collapse → **Broke down** | Back on the control room, the AI replaces only that vehicle: "What changed: AMB-02 replaces AMB-03 — AMB-03 is now unavailable" | "It re-plans only what changed, and says why." |
| 8 | **New emergency** → Majestic → Something else → `Something happened near the market, people shouting` → Save | The card asks "The AI needs to know: …" | "When a report is vague, the AI asks instead of guessing." |
| 9 | Type the answer on the card: `Two people collapsed from heat stroke at the market` → **Send answer and re-plan** → approve | Re-assessed, ambulance planned | |
| 10 | Switch to **✋ Manual** → click a card → set Serious + Medical → tick 2 vehicles → **🚀 Send** | Sent without any AI; History says "Manual plan … by <name>" | "If the AI is down, the control room keeps working: manual mode, and a backup planner." |
| 11 | **Fleet** → Hospitals & shelters → **− Discharged** | Beds free again | |
| 12 | On a card **✕ Cancel report** → Yes → **Closed** tab | Kept for the record, vehicles freed | |
| 13 | **History** | Today's numbers (call → dispatch time, people helped), every action with who did it; "Show the AI's steps" | "Every decision is logged with who made it." |
| 14 | **🌙 Dark** (optional) and **❔ How it works** | | "Built for a night shift, and for a first-day dispatcher." |

## If something goes wrong

- **Plan takes long / "AI busy"**: it retries by itself; a 🛟 Backup plan appears if Gemini stays down. Or switch to ✋ Manual.
- **"Some units were taken…"**: the app re-plans automatically; approve the new plan.
- **Signed out**: sign in again (12 h sessions).
- **Messy data**: reset (only between runs).

## Edge cases shown

| Edge case | Step |
| --- | --- |
| Not enough units (escalation with expected wait) | 5 |
| Vehicle breaks down mid-mission (re-planning with the reason) | 7 |
| Vague report (the AI asks) | 8-9 |
| AI unavailable (manual mode, backup planner) | 10 |
| Duplicate report (warning on the card) | report the same place twice |
| Unit taken between plan and dispatch (re-check, fresh plan) | automatic |
| Report added by mistake (cancel) | 12 |
