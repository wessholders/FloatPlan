# Close Float Plan Edge Function

The safe-return closeout function is:

`supabase/functions/close-float-plan/index.ts`

## Purpose

This function keeps closeout simple:

- Validate a saved `floatPlanId`.
- Mark the matching `float_plans` row as `closed`.
- Insert one `checkins` row with `checkin_type = safe_return`.
- Queue safe-return `delivery_events` for recipients who have `send_safe_return = true`.

It does not send SMS or email yet. The queued delivery events prepare the path for Twilio/Postmark.

The function is idempotent. If the plan is already closed, it returns success without creating duplicate check-ins or delivery events.

## Endpoint

After deployment:

`https://zrcmwlfabypxqlqtnjom.supabase.co/functions/v1/close-float-plan`

## Request Body

```json
{
  "floatPlanId": "...",
  "message": "I am home safe. Please close my float plan."
}
```

## Expected Response

```json
{
  "ok": true,
  "floatPlanId": "...",
  "status": "closed",
  "closedAt": "...",
  "deliveryEnabled": false,
  "deliveryEventCount": 2
}
```

## Deployment

Use the Supabase dashboard for now:

1. Open the Supabase project.
2. Open `Edge Functions`.
3. Create a function named `close-float-plan`.
4. Paste the contents of `supabase/functions/close-float-plan/index.ts`.
5. Deploy it.

After deployment, test with:

`supabase/functions/close-float-plan/sample-payload.json`

The sample payload uses the first verified GitHub Pages test plan ID. If that plan has already been closed, the function should return success with `alreadyClosed = true`.

## Verified Test

Verified from the GitHub Pages prototype on June 30, 2026:

```json
{
  "ok": true,
  "floatPlanId": "a4e6ddfb-e2ce-4ba4-a7e0-702c064b7f72",
  "status": "closed",
  "closedAt": "2026-06-30T20:17:00.240Z",
  "deliveryEnabled": false,
  "deliveryEventCount": 2
}
```

Prototype message shown:

`Backend plan closed. Safe-return events queued: 2`
