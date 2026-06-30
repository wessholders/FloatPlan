# Supabase Project

## Development Project

- Dashboard: https://supabase.com/dashboard/project/zrcmwlfabypxqlqtnjom
- Project ref: `zrcmwlfabypxqlqtnjom`
- Project URL: `https://zrcmwlfabypxqlqtnjom.supabase.co`

## Client Environment

The frontend should use:

```text
VITE_SUPABASE_URL=https://zrcmwlfabypxqlqtnjom.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_ANON_KEY=...
```

Use `.env.local` for local development. Do not commit `.env.local`.

The publishable key and anon public key are designed for browser use, but the service role key is not. The service role key must only be stored as a backend secret, such as a Supabase Edge Function secret.

## Migration

Apply the initial schema from:

`supabase/migrations/20260630190000_initial_schema.sql`

The initial schema has been applied to the development project. If it needs to be reapplied in a fresh project, use the dashboard SQL Editor:

1. Open the project dashboard.
2. Open `SQL Editor`.
3. Create a new query.
4. Paste the full migration SQL.
5. Run the query.
6. Confirm the tables are visible in `Table Editor`.

Expected tables:

- `checkins`
- `delivery_events`
- `emergency_contacts`
- `float_plan_recipients`
- `float_plans`
- `notification_jobs`
- `profiles`
- `saved_people`
- `vessels`

## Verified Backend Writes

The `send-float-plan` Edge Function has been deployed and tested with `supabase/functions/send-float-plan/sample-payload.json`.

Verified response:

```json
{
  "ok": true,
  "floatPlanId": "3e017d7b-9661-472e-9886-dd36069c4660",
  "status": "queued_for_delivery",
  "deliveryEnabled": false,
  "recipientCount": 1,
  "deliveryEventCount": 2
}
```

## Values Not Stored In Git

These values should not be committed:

- Supabase service role key
- Supabase secret key
- Database password
- Twilio tokens
- Postmark tokens
