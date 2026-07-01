# Delivery Setup

FloatPlan now has provider delivery code for Supabase Edge Functions, but delivery stays off until explicitly enabled.

The static browser handoff links remain useful while provider delivery is tested. Do not remove `sms:` or `mailto:` fallback links yet.

## Current Behavior

Both Edge Functions create `delivery_events` rows before any provider request:

- `send-float-plan` records initial float-plan delivery events.
- `close-float-plan` records safe-return delivery events.
- `DELIVERY_ENABLED=false` or an unset value keeps events queued with `provider = pending_provider`.
- `DELIVERY_ENABLED=true` attempts provider delivery and updates each event with provider status, message ID when available, error text, and a redacted provider payload.

This order matters. A delivery event should exist before an SMS or email provider receives a request.

## Required Supabase Secrets

Set these in Supabase Edge Function secrets, not in `index.html` and not in committed files.

Required for all deployed functions:

```text
SUPABASE_URL
SUPABASE_SECRET_KEYS
```

Supabase hosted functions usually provide those automatically. The code still supports the legacy fallback:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Delivery safety switch:

```text
DELIVERY_ENABLED=false
```

Keep this false until test recipients, provider accounts, and dashboard deployment are confirmed.

## Twilio SMS

Required when SMS delivery is enabled:

```text
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

Use one sender option:

```text
TWILIO_MESSAGING_SERVICE_SID=MG...
```

or:

```text
TWILIO_FROM_NUMBER=+15555550100
```

Optional:

```text
DEFAULT_SMS_COUNTRY_CODE=1
```

The helper normalizes 10-digit US-style numbers into E.164 using `DEFAULT_SMS_COUNTRY_CODE`. SMS bodies are capped at 1600 characters; longer messages are truncated with a note. Email should carry the full plan when available.

Official API reference: https://www.twilio.com/docs/messaging/api/message-resource

## Postmark Email

Required when email delivery is enabled:

```text
POSTMARK_SERVER_TOKEN=...
POSTMARK_FROM_EMAIL=floatplan@example.com
```

Optional:

```text
POSTMARK_REPLY_TO=support@example.com
POSTMARK_MESSAGE_STREAM=outbound
```

Official API reference: https://postmarkapp.com/developer/api/email-api

## Deployment Notes

The functions now import:

```ts
../_shared/delivery.ts
```

Deploy the shared helper with both functions. The Supabase CLI is the preferred path once installed:

```powershell
supabase functions deploy send-float-plan
supabase functions deploy close-float-plan
```

If using the Supabase Dashboard editor, make sure the shared file is present in the function bundle. If the Dashboard editor only allows a single file in the current project view, install the Supabase CLI before enabling delivery.

From this repo, after `supabase login`, use the helper script to keep delivery disabled and deploy both functions:

```powershell
.\scripts\deploy-edge-functions.ps1
```

To preview the commands without changing the remote project:

```powershell
.\scripts\deploy-edge-functions.ps1 -PrintOnly
```

That runs:

```powershell
supabase secrets set DELIVERY_ENABLED=false --project-ref zrcmwlfabypxqlqtnjom
supabase functions deploy --project-ref zrcmwlfabypxqlqtnjom --use-api send-float-plan close-float-plan
```

Only use live provider delivery in the development project after test recipients and provider secrets are configured:

```powershell
.\scripts\deploy-edge-functions.ps1 -EnableDelivery
```

## Test Order

1. Deploy with `DELIVERY_ENABLED=false`.
2. Save a float plan from GitHub Pages.
3. Confirm `delivery_events` rows are created with `provider = pending_provider` and `status = queued`.
4. Close the plan as home safe.
5. Confirm safe-return `delivery_events` rows are queued.
6. Configure Twilio and Postmark test credentials.
7. Set `DELIVERY_ENABLED=true` only in the development project.
8. Send to recipient phone/email addresses you control.
9. Confirm provider message IDs and statuses are written back to `delivery_events`.

Do not test with emergency services, public safety contacts, or people who have not agreed to receive test messages.

## Verified Disabled-Delivery Deploy

Verified against FloatPlan Dev on July 1, 2026:

- `send-float-plan` deployed as version 5.
- `close-float-plan` deployed as version 5.
- `DELIVERY_ENABLED=false` was set before deployment.
- Test plan ID: `97715712-f79e-49b4-8208-824732988f06`.
- A test plan saved through the deployed function returned `deliveryEnabled: false`, `deliveryEventCount: 2`, `deliveryQueuedCount: 2`, and zero sent/delivered/failed/cancelled/update-error counts.
- Closing the same test plan returned `deliveryEnabled: false`, `deliveryEventCount: 2`, `deliveryQueuedCount: 2`, and zero sent/delivered/failed/cancelled/update-error counts.
- Remote `delivery_events` rows for the test plan showed `provider = pending_provider` and `status = queued` for both SMS and email initial-plan and safe-return events.
