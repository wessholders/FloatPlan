# Backend Payload Contract

The static prototype now builds a backend-ready JSON payload beside the visible float plan text.

The payload is written to the hidden `#generatedPayload` field in `index.html` every time the generated plan refreshes. A future backend send endpoint can use this shape as the starting contract for anonymous sends.

## Current Schema Version

`float-plan.static.v1`

## Top-Level Shape

```json
{
  "schemaVersion": "float-plan.static.v1",
  "source": "static-prototype",
  "clientGeneratedAt": "2026-06-30T18:00:00.000Z",
  "operator": {},
  "activity": "power",
  "peopleCount": 2,
  "schedule": {},
  "trip": {},
  "people": [],
  "vessel": {},
  "recipients": [],
  "status": {},
  "generatedMessage": "FLOAT PLAN..."
}
```

## Field Notes

- `operator`: name and phone for the person responsible for the trip.
- `activity`: selected water activity.
- `peopleCount`: simple count used for fast emergency context.
- `schedule.departureLocal`: local departure date/time from the browser form.
- `schedule.expectedReturnLocal`: local expected return date/time from the browser form.
- `schedule.timezone`: browser time zone when available.
- `trip.shape`: `out_and_back` or `different_pull_out`.
- `trip.launchLocation`: Launch Location description and optional coordinate object.
- `trip.pullOutLocation`: Pull Out Location description and optional coordinate object.
- `trip.destination`: destination or operating area.
- `trip.route`: route, stops, waypoints, hazards, or alternate pull out.
- `trip.conditions`: weather, tide, current, visibility, or water notes.
- `people`: optional passenger details.
- `vessel`: optional vessel, safety, beacon, vehicle, and photo details.
- `recipients`: emergency contacts selected to receive the plan.
- `status.safeReturnReported`: whether the user has marked the plan closed from the prototype.
- `generatedMessage`: plain text float plan sent through SMS/email handoff.

## Coordinate Shape

```json
{
  "latitude": 29.28529,
  "longitude": -94.8366,
  "display": "(29.28529, -94.83660)",
  "mapsUrl": "https://maps.google.com/?q=29.28529,-94.83660"
}
```

## Backend Mapping

This payload maps cleanly to the first backend milestone:

- `operator`, `activity`, `peopleCount`, `schedule`, `trip`, `vessel`, and `generatedMessage` become the `float_plans` record.
- `recipients` becomes `float_plan_recipients`.
- SMS/email send attempts become `delivery_events`.
- Safe-return actions become `checkins`.
- Return reminders become `notification_jobs`.

The backend should still validate every field server-side. The browser payload is a convenience contract, not a trusted source of truth.
