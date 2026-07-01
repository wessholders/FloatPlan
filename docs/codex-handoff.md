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
- SMS and email manual handoff links remain in the browser as a fallback.
- Twilio/Postmark provider delivery code exists in `supabase/functions/_shared/delivery.ts`, but `DELIVERY_ENABLED=false` remains the safe default until secrets are configured and test sends are verified.

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

The updated delivery-helper deployment was verified on July 1, 2026:

- `DELIVERY_ENABLED=false` set through Supabase CLI.
- `send-float-plan` and `close-float-plan` deployed as version 5.
- Test plan ID: `97715712-f79e-49b4-8208-824732988f06`.
- Initial-plan response: delivery disabled, 2 queued events, 0 sent/delivered/failed/cancelled/update errors.
- Safe-return response: delivery disabled, 2 queued events, 0 sent/delivered/failed/cancelled/update errors.
- Remote `delivery_events` summary confirmed `provider = pending_provider` and `status = queued` for SMS and email on both event types.

## Local Machine Tooling

As of July 1, 2026, this machine has these tools available on PATH:

- `node`
- `npm`
- `deno`
- `supabase`

Installed tool locations:

- Deno: `C:\Users\wes\.deno\bin\deno.exe`
- Supabase CLI: `C:\Users\wes\.local\bin\supabase.exe`
- Current-session shims: `C:\Users\wes\AppData\Roaming\npm\deno.cmd` and `C:\Users\wes\AppData\Roaming\npm\supabase.cmd`

The shims keep sandbox-friendly writable state inside the current repo:

- Deno cache: `.deno-cache/`
- Supabase home: `.supabase-home/`

Work that fits this machine:

- static HTML/CSS/JS edits
- Supabase Edge Function source edits
- documentation
- PowerShell smoke test
- Deno type checks
- Supabase CLI commands that do not require missing credentials or unavailable Docker services
- Git commits and pushes
- Supabase CLI or dashboard deployment

React/Vite conversion is more feasible now that Node/npm are available, but provider delivery verification and per-recipient delivery status are the recommended next backend/product steps.

## Checks

Run this before pushing UI/backend-source changes:

```powershell
.\scripts\smoke-test.ps1
```

Expected result:

```text
Static prototype smoke test passed.
```

Run this before pushing Edge Function changes:

```powershell
deno check supabase\functions\send-float-plan\index.ts supabase\functions\close-float-plan\index.ts
```

Or run:

```powershell
.\scripts\check-backend-functions.ps1
```

## Recommended Next Task

Verify real provider delivery in the development project:

1. Configure Twilio/Postmark test secrets in Supabase Edge Function secrets.
2. Run `.\scripts\deploy-edge-functions.ps1 -EnableDelivery` only against the development project.
3. Send to phone/email recipients controlled by the tester.
4. Confirm provider message IDs, status, and errors write back to `delivery_events`.
5. Add per-recipient delivery status in the prototype or React app.

Likely files:

- `supabase/functions/_shared/delivery.ts`
- `supabase/functions/send-float-plan/index.ts`
- `supabase/functions/close-float-plan/index.ts`
- `index.html`
- `docs/delivery-setup.md`
- `scripts/deploy-edge-functions.ps1`
- `scripts/check-backend-functions.ps1`
- `scripts/smoke-test.ps1`

## Later, Not Next

Auth should come after backend delivery is working. Use Supabase Auth, probably email magic links first. Anonymous send should remain available so the safety task is not blocked by account creation.
