# Float Plan

Mobile-first prototype for creating and sending a float plan before a user launches.

## Current MVP

- Static HTML app in `index.html`
- No auth required for MVP send path
- Supabase backend save through `send-float-plan`
- Browser-local draft autosave
- Required fast path: operator, activity, Launch Location, Pull Out Location, destination, departure date/time, return date/time, contacts
- Optional detail: passengers, vessel, safety gear, beacons, vehicle/trailer, route notes
- Passenger/crew detail step only appears when `People aboard` is greater than 1
- Generated float plan message
- SMS and email handoff links
- Popup Leaflet hybrid map picker for Launch Location and optional Pull Out Location pins
- Trip-shape control for Out and Back vs Different Pull Out Location
- US phone formatting for operator, passenger, and contact numbers
- Browser location capture for Launch Location and Pull Out Location shortcuts
- Sidebar trip status with departure, return, locations, recipients, and safe-return state
- Hybrid sidebar thumbnails when launch/return coordinates are present
- Clear-plan action to wipe the current browser draft and start over
- Browser return prompt and "I'm home safe" message

## Open Locally

Open `index.html` in a browser.

For best map and SMS testing, publish to GitHub Pages and open the page on a phone. The prototype uses Leaflet from a CDN and Esri imagery/reference tiles, so the map needs network access. It also uses `sms:` and `mailto:` links, which can prefill the message in the user's native SMS or email app. The user still has to tap send.

Static GitHub Pages now saves submitted float plans through a Supabase Edge Function. It still cannot send SMS/email automatically, verify provider delivery, or run overdue escalation by itself. Real delivery requires backend provider integration such as Twilio for SMS and Postmark/SendGrid/AWS SES for email.

## GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

To publish the prototype, enable GitHub Pages for the repository and choose `GitHub Actions` as the source. Pushes to `main` will run the static smoke test and deploy the site.

Expected Pages URL after setup:

`https://wessholders.github.io/FloatPlan/`

## Quality Checks

Run the static prototype smoke test before pushing UI changes:

```powershell
.\scripts\smoke-test.ps1
```

Use `docs/phone-test-script.md` for iPhone, Android, and desktop browser testing.

## Product Direction

The first product should keep sending friction extremely low. The core safety action is not filling out a perfect government-style form; it is getting enough reliable information to a trusted person before the user leaves shore.

Near-term priorities:

1. Tighten the mobile flow with real user testing at ramps, marinas, and paddle launches.
2. Add backend delivery for SMS/email so delivery can be tracked.
3. Add optional accounts for saved vessels, contacts, passengers, and repeat trips.
4. Add return-time workflows: reminders, delayed-return update, safe-return closeout, and escalation instructions for contacts.
5. Add native app features: camera vessel photos, contact picker, location capture, offline drafts, push notifications, and share sheet integration.

See `docs/research.md` for source-backed requirements and product notes.
See `docs/mvp-todo.md` for the current build checklist and platform plan.
See `docs/backend-payload.md` for the current browser-to-backend payload shape.
See `docs/supabase-schema.md` for the initial Supabase data model and RLS plan.
See `docs/supabase-project.md` for the development Supabase project details.
See `docs/send-float-plan-function.md` for the first Edge Function deployment notes.
