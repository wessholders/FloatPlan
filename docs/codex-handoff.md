# Codex Handoff

Use this file to resume the Float Plan work from another computer or another Codex session.

## How To Resume

1. Clone or pull `main` from `https://github.com/wessholders/FloatPlan`.
2. Open this repo in Codex.
3. Tell Codex: `Read docs/codex-handoff.md and docs/mvp-todo.md, then continue from the next recommended task.`
4. Do not paste service-role keys, Twilio tokens, Postmark tokens, or any other private credentials into frontend files or chat unless intentionally rotating them afterward.

## Current Product State

- Static mobile-first float plan prototype lives in `index.html`.
- GitHub Pages deploys from `main` using `.github/workflows/pages.yml`.
- The app can save a float plan to Supabase through `send-float-plan`.
- The app can close a saved plan as home safe through `close-float-plan`.
- The People step remains visible even when `People aboard` is `1`.
- The first People row auto-fills from operator name and phone unless the user manually changes it.
- SMS and email are still manual handoff links from the browser. Backend provider delivery is not implemented yet.

## Supabase Project

- Project ref: `zrcmwlfabypxqlqtnjom`
- Project URL: `https://zrcmwlfabypxqlqtnjom.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/zrcmwlfabypxqlqtnjom`
- Deployed functions:
  - `send-float-plan`
  - `close-float-plan`
- Tables exist for profiles, contacts, saved people, vessels, float plans, recipients, delivery events, check-ins, and notification jobs.

Public anon keys can be used in the frontend. Service-role keys and provider tokens must stay only in Supabase Edge Function secrets.

## Verified Backend Tests

`send-float-plan` has been verified from GitHub Pages and writes rows to Supabase.

`close-float-plan` has been verified from GitHub Pages with:

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

## Local Machine Constraints

As of June 30, 2026, this machine does not have these tools available on PATH:

- `node`
- `npm`
- `deno`
- `supabase`

Work that fits this machine:

- static HTML/CSS/JS edits
- Supabase Edge Function source edits
- documentation
- PowerShell smoke test
- Git commits and pushes
- manual Supabase dashboard deployment

Avoid starting the React/Vite conversion until Node/npm are available.

## Checks

Run this before pushing UI/backend-source changes:

```powershell
.\scripts\smoke-test.ps1
```

Expected result:

```text
Static prototype smoke test passed.
```

## Recommended Next Task

Build backend delivery support while keeping delivery disabled by default:

1. Add a shared delivery helper for Supabase Edge Functions.
2. Support Twilio SMS using plain `fetch`.
3. Support Postmark email using plain `fetch`.
4. Keep `DELIVERY_ENABLED=false` behavior as the safe default.
5. Record provider success/failure details in `delivery_events`.
6. Document exactly which Supabase Edge Function secrets are required.

Likely files:

- `supabase/functions/_shared/delivery.ts`
- `supabase/functions/send-float-plan/index.ts`
- `supabase/functions/close-float-plan/index.ts`
- `docs/delivery-setup.md`
- `scripts/smoke-test.ps1`

## Later, Not Next

Auth should come after backend delivery is working. Use Supabase Auth, probably email magic links first. Anonymous send should remain available so the safety task is not blocked by account creation.
