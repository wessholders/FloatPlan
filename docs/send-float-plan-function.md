# Send Float Plan Edge Function

The first backend function is:

`supabase/functions/send-float-plan/index.ts`

## Purpose

This function keeps the MVP backend path narrow:

- Validate the browser payload.
- Insert one `float_plans` row.
- Insert `float_plan_recipients`.
- Insert queued `delivery_events`.
- Return the created `floatPlanId`.

It does not send SMS or email yet. Twilio and Postmark will be added behind the delivery-events path later.

## Endpoint

After deployment:

`https://zrcmwlfabypxqlqtnjom.supabase.co/functions/v1/send-float-plan`

## Required Environment

Supabase hosted functions provide these values by default:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEYS`
- Legacy fallback: `SUPABASE_SERVICE_ROLE_KEY`

The function uses a server-side key because anonymous users should not write directly to the database from GitHub Pages.

## Deployment

If using the dashboard:

1. Open the Supabase project.
2. Open `Edge Functions`.
3. Create a function named `send-float-plan`.
4. Paste the contents of `supabase/functions/send-float-plan/index.ts`.
5. Deploy it.

If using the CLI later:

```powershell
supabase link --project-ref zrcmwlfabypxqlqtnjom
supabase functions deploy send-float-plan
```

The Supabase CLI is not installed on this machine yet, so dashboard deployment is the practical path right now.

## Test Payload

Use:

`supabase/functions/send-float-plan/sample-payload.json`

Expected response shape:

```json
{
  "ok": true,
  "floatPlanId": "...",
  "status": "queued_for_delivery",
  "deliveryEnabled": false,
  "recipientCount": 1,
  "deliveryEventCount": 2
}
```

After a successful test, confirm rows exist in:

- `float_plans`
- `float_plan_recipients`
- `delivery_events`
