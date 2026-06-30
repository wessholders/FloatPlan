# Float Plan MVP Todo

## Product Goal

Make it fast for any water user to send enough reliable trip information to trusted people before launch, then close the plan when they return safely.

The product should reduce friction first. A perfect form that people avoid is worse than a short plan they actually send.

## Working Stack Decision

- Web app: React, TypeScript, and Vite.
- Mobile apps later: Expo / React Native, reusing the same product model and API.
- Backend: Supabase for Postgres, Auth, row-level security, storage, and edge functions.
- SMS: Twilio first, wrapped behind our own delivery function so we can change providers later.
- Email: Postmark first, also wrapped behind our own delivery function.
- Payments: Stripe, after the free MVP flow is working.
- Hosting: Vercel or Netlify for the web app, with Supabase handling backend services.
- Maps: keep Leaflet for the MVP; choose a production tile provider before launch if terms, cost, or attribution become a concern.

## Current Machine Constraint

As of June 30, 2026, this computer does not have `node`, `npm`, `deno`, or the Supabase CLI available on PATH.

Most feasible work on this machine right now:

- Static `index.html` prototype improvements.
- Supabase dashboard-deployed Edge Function updates.
- SQL migrations through the Supabase dashboard.
- Documentation, smoke checks, and GitHub Pages deployment.

Less feasible until tooling is installed:

- React/Vite migration.
- Local TypeScript frontend tests.
- Local Edge Function compilation or deployment.
- Supabase CLI migration workflow.

## Non-Negotiables

- Users must be able to create and send a basic float plan without making an account.
- The first send path should be usable on a phone in roughly two minutes.
- Basic safety sending should not be blocked behind payment.
- SMS and email provider credentials must never live in the browser.
- Every sent float plan needs a delivery record.
- Every plan needs a safe-return closeout path.
- Emergency contacts need clear instructions without panic language or unsupported claims.

## Phase 1: Harden The Static Prototype

- [x] Add a GitHub Pages deployment workflow for the static prototype.
- [x] Add a static smoke test for required fields, map hooks, SMS/email handoff links, and safe-return hooks.
- [x] Add a real-device phone test script.
- [x] Publish the current static prototype to GitHub Pages for phone testing.
- [x] Keep the People step visible and auto-fill the primary person from operator details.
- [ ] Test the flow on iPhone Safari, Android Chrome, and desktop Chrome.
- [ ] Confirm Launch Location pin selection works on real devices.
- [ ] Confirm Pull Out Location only appears when the trip shape needs it.
- [ ] Confirm hybrid map tiles load consistently on mobile data.
- [ ] Confirm SMS handoff opens the native messaging app with plan text.
- [ ] Confirm email handoff opens the native mail app with plan text.
- [ ] Confirm safe-return message handoff works.
- [ ] Time the first-use flow with at least five people who did not build the app.
- [ ] Record where users hesitate, abandon, or type too much.

## Phase 2: Convert To A Real Web App

- [ ] Move the static prototype into a Vite React TypeScript app.
- [ ] Keep the first screen as the actual float-plan builder, not a marketing page.
- [ ] Split the UI into focused components: trip timing, locations, people, vessel, contacts, send preview, and status.
- [ ] Keep browser-local draft saving for anonymous users.
- [ ] Add field-level validation for required send data.
- [x] Add a backend-ready plan payload shape to the current prototype.
- [ ] Add automated tests for plan generation, phone formatting, location formatting, and trip-shape behavior.
- [x] Add a basic CI smoke check for the current static prototype on every push.
- [ ] Add a full app CI check that runs linting and tests after the React conversion.

## Phase 3: Backend Foundation

- [x] Create a Supabase project for development.
- [x] Define database tables for profiles, contacts, vessels, float plans, recipients, delivery events, check-ins, and notification jobs.
- [x] Add row-level security policies before storing user data.
- [x] Apply the initial schema to the Supabase development project.
- [x] Add Edge Function source for creating a float plan send event.
- [x] Store generated float plan content server-side for sent plans.
- [x] Add server-side validation so the backend does not trust browser data blindly.
- [x] Deploy `send-float-plan` and verify it writes rows in Supabase.
- [x] Connect the static prototype to `send-float-plan`.
- [x] Test the GitHub Pages prototype saving a real form submission to Supabase.
- [x] Add local environment placeholders for Supabase development config.
- [ ] Add environment-based config for development, preview, and production after the React conversion.

## Phase 4: Real SMS And Email Delivery

- [ ] Create a delivery service abstraction in the backend.
- [ ] Implement SMS sending through Twilio in test mode first.
- [ ] Implement email sending through Postmark in test mode first.
- [ ] Record every send attempt in `delivery_events`.
- [ ] Record provider message IDs and delivery status when available.
- [ ] Show the user whether each recipient was queued, sent, failed, or needs manual retry.
- [ ] Keep `sms:` and `mailto:` handoff links as a fallback while real delivery matures.

## Phase 5: Return Reminder And Safe Closeout

- [ ] Let the user choose who receives the initial plan and who receives the safe-return closeout.
- [ ] Schedule a reminder near expected return time.
- [ ] Send the user an "Are you home safe?" prompt.
- [x] Add Edge Function source for closing a saved float plan as home safe.
- [x] Connect the static prototype safe-return button to backend closeout when a saved plan ID exists.
- [x] Deploy `close-float-plan` and verify it closes a saved plan in Supabase.
- [x] Let the user mark safe return from the web app.
- [ ] Send a short safe-return message to selected recipients.
- [ ] Let the user extend the expected return time before escalation language appears.
- [x] Store closeout time, method, and queued recipient delivery records.

## Phase 6: Optional Accounts

- [ ] Add passwordless auth using email magic links or phone OTP.
- [ ] Let anonymous users send first, then offer account creation after the safety task is complete.
- [ ] Save emergency contacts for reuse.
- [ ] Save vessels, passengers, and common trip locations.
- [ ] Add repeat-trip creation from a previous float plan.
- [ ] Add account deletion and data export.

## Phase 7: Paid Product

- [ ] Keep manual basic float-plan creation free.
- [ ] Use Stripe for subscriptions after backend delivery and saved data are working.
- [ ] Candidate paid features: saved contacts, saved vessels, repeat trips, delivery tracking, plan history, photos, reminders, and family/crew sharing.
- [ ] Add organization plans for marinas, clubs, guides, rentals, outfitters, and schools after the individual workflow is proven.
- [ ] Add billing status checks server-side, not only in the client.

## Phase 8: Native Apps

- [ ] Start Expo / React Native once the web app data model is stable.
- [ ] Reuse the backend, delivery service, and plan-generation rules.
- [ ] Add native contact picker support.
- [ ] Add better GPS capture and location permission handling.
- [ ] Add camera support for vessel and vehicle photos.
- [ ] Add offline draft support.
- [ ] Add push notifications for return reminders.
- [ ] Add share-sheet support for sending plan summaries through other apps.

## First Engineering Milestone

Build the React web MVP with no auth and no payment:

- Anonymous float-plan creation.
- Browser-local draft save.
- Launch Location and Pull Out Location map pins.
- Explicit departure and return date/time.
- One or more recipients.
- Generated plan preview.
- Backend-ready plan data shape.
- Manual SMS/email handoff retained until real delivery is added.

This milestone proves the user flow before we spend money on provider integration or native app stores.

## First Backend Milestone

Add real delivery without accounts:

- Anonymous send creates a server-side float plan record.
- Backend queues SMS and/or email delivery events.
- User gets delivery status.
- User can close the plan as home safe.
- Recipients get the safe-return closeout.

This milestone proves the paid-product foundation: reliable delivery, audit records, reminders, and saved history.

## Maintenance Rule

Keep the first backend path narrow:

- One public client action: send a float plan.
- One backend entry point: `send-float-plan`.
- Four active MVP tables: `float_plans`, `float_plan_recipients`, `delivery_events`, and `checkins`.
- Saved contacts, saved people, vessels, profiles, and notification jobs stay dormant until their feature is actually built.
- Twilio, Postmark, and any future providers stay behind a backend delivery wrapper so the app does not care which vendor sends the message.

## Open Decisions

- Whether to use Twilio Verify for login or keep login email-first at launch.
- Whether SMS delivery should be included in free usage with a monthly cap.
- How long to retain anonymous float plans.
- Whether emergency contacts should get a private web link to view the full plan.
- Which production map tile provider best balances cost, reliability, and satellite/hybrid quality.
- Whether to support commercial users in the first paid release or after the individual product works.
