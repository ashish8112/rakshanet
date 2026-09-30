"""Generate repeatable, fictional Bengaluru demo data for RakshaNet."""

import json
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Approximate neighbourhood centres, not addresses of real emergency services.
# Unit names, availability, bed counts, and incidents are fictional demo data.
AREAS = {
    "Koramangala": (12.9352, 77.6245),
    "Indiranagar": (12.9719, 77.6412),
    "Jayanagar": (12.9249, 77.5823),
    "Malleshwaram": (13.0020, 77.5707),
    "Hebbal": (13.0358, 77.5970),
    "Yelahanka New Town": (13.0969, 77.5810),
}

RESOURCE_GROUPS = (
    ("ambulance", "AMB", "Ambulance", "medical", (
        "Koramangala", "Koramangala", "Indiranagar", "Indiranagar",
        "Jayanagar", "Malleshwaram", "Hebbal", "Yelahanka New Town",
    )),
    ("fire_unit", "FIR", "Fire Unit", "fire", (
        "Koramangala", "Indiranagar", "Malleshwaram", "Hebbal",
    )),
    ("rescue_team", "RES", "Rescue Team", "rescue", (
        "Koramangala", "Indiranagar", "Jayanagar", "Yelahanka New Town",
    )),
    ("hospital", "HOS", "Community Hospital", "beds", (
        "Koramangala", "Indiranagar", "Jayanagar", "Malleshwaram", "Hebbal",
        "Yelahanka New Town",
    )),
    ("shelter", "SHE", "Relief Shelter", "shelter", (
        "Koramangala", "Jayanagar", "Hebbal", "Yelahanka New Town",
    )),
)

HOSPITAL_CAPACITIES = ((32, 18), (45, 38), (28, 12), (36, 20), (50, 46), (24, 8))
SHELTER_CAPACITIES = ((80, 31), (60, 48), (45, 12), (70, 55))
# FIR-03 starts unavailable too (demo tuning, step 3.4): only 2 fire units are free, so when two
# new fires are reported after the first dispatch, one of them must escalate with a wait time.
UNAVAILABLE_CODES = {"AMB-08", "FIR-03", "FIR-04"}


# Fictional Karnataka-style registration plates, fixed so every reset gives the same numbers.
# RTO code by area, then a series letter pair per kind.
AREA_RTO = {
    "Koramangala": 1, "Indiranagar": 3, "Jayanagar": 5,
    "Malleshwaram": 4, "Hebbal": 50, "Yelahanka New Town": 50,
}
KIND_SERIES = {"ambulance": "AM", "fire_unit": "FR", "rescue_team": "RS"}


def vehicle_number(kind, area, number):
    if kind not in KIND_SERIES:
        return ""
    digits = 1000 + (number * 2731 + len(area) * 97) % 9000
    return f"KA {AREA_RTO[area]:02d} {KIND_SERIES[kind]} {digits}"


def location(area, index=0):
    lat, lng = AREAS[area]
    # Small fixed offsets keep markers in the neighbourhood without stacking.
    return {
        "lat": round(lat + ((index % 3) - 1) * 0.0012, 4),
        "lng": round(lng + ((index % 4) - 1) * 0.0011, 4),
        "area": area,
    }


def make_resources():
    resources = []
    area_counts = {area: 0 for area in AREAS}
    for kind, prefix, label, capability, areas in RESOURCE_GROUPS:
        for number, area in enumerate(areas, start=1):
            area_counts[area] += 1
            capacity = None
            if kind == "hospital":
                total, used = HOSPITAL_CAPACITIES[number - 1]
                capacity = {"total": total, "used": used}
            elif kind == "shelter":
                total, used = SHELTER_CAPACITIES[number - 1]
                capacity = {"total": total, "used": used}

            code = f"{prefix}-{number:02d}"
            resources.append({
                "code": code,
                "kind": kind,
                "name": f"{area} {label} {number:02d} (demo)",
                "vehicleNumber": vehicle_number(kind, area, number),
                "location": location(area, area_counts[area]),
                "status": "unavailable" if code in UNAVAILABLE_CODES else "available",
                "capabilities": [capability] if kind != "fire_unit" else ["fire", "rescue"],
                "capacity": capacity,
                "assignedIncident": None,
            })
    return resources


def make_incidents():
    stories = (
        ("INC-001", "flood", "Heavy rain has flooded two ground-floor homes; 10 residents need help leaving.",
         "Koramangala", 10),
        ("INC-002", "accident", "Two vehicles collided near a junction; four people are reported injured.",
         "Hebbal", 4),
        ("INC-003", "collapse", "Part of a building has collapsed; the number of trapped people is unknown.",
         "Indiranagar", None),
    )
    return [
        {
            "code": code,
            "type": kind,
            "description": description,
            "location": location(area),
            "peopleAffected": people,
            "status": "new",
            "severity": None,
            "severityConfidence": None,
            "requiredCapabilities": [],
            "followUpQuestions": [],
            "possibleDuplicateOf": None,
            "assignedResources": [],
        }
        for code, kind, description, area, people in stories
    ]


def write_json(filename, records):
    path = DATA_DIR / filename
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    resources = make_resources()
    incidents = make_incidents()
    codes = [item["code"] for item in resources + incidents]
    if len(codes) != len(set(codes)):
        raise ValueError("Seed data has duplicate codes; check RESOURCE_GROUPS and stories")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write_json("resources.json", resources)
    write_json("demo-incidents.json", incidents)


if __name__ == "__main__":
    main()
