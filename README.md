# Float Plan

Mobile-first prototype for creating and sending a float plan before a user launches.

## Current MVP

- Static HTML app in `index.html`
- No auth or backend
- Browser-local draft autosave
- Required fast path: operator, activity, launch pin/site, destination, departure date/time, return date/time, contacts
- Optional detail: passengers, vessel, safety gear, beacons, vehicle/trailer, route notes
- Generated float plan message
- SMS and email handoff links
- Popup Leaflet satellite map picker for launch and optional return/stop pins
- US phone formatting for operator, passenger, and contact numbers
- Browser location capture for launch and return/stop shortcuts
- Browser return prompt and "I'm home safe" message

## Open Locally

Open `index.html` in a browser.

For best map and SMS testing, publish to GitHub Pages and open the page on a phone. The prototype uses Leaflet from a CDN and Esri satellite tiles, so the map needs network access. It also uses `sms:` and `mailto:` links, which can prefill the message in the user's native SMS or email app. The user still has to tap send.

Static GitHub Pages cannot send SMS/email automatically, verify delivery, or run overdue escalation by itself. Real delivery requires a backend or serverless function using a provider such as Twilio for SMS and SendGrid/Postmark/AWS SES for email.

## Product Direction

The first product should keep sending friction extremely low. The core safety action is not filling out a perfect government-style form; it is getting enough reliable information to a trusted person before the user leaves shore.

Near-term priorities:

1. Tighten the mobile flow with real user testing at ramps, marinas, and paddle launches.
2. Add backend delivery for SMS/email so delivery can be tracked.
3. Add optional accounts for saved vessels, contacts, passengers, and repeat trips.
4. Add return-time workflows: reminders, delayed-return update, safe-return closeout, and escalation instructions for contacts.
5. Add native app features: camera vessel photos, contact picker, location capture, offline drafts, push notifications, and share sheet integration.

See `docs/research.md` for source-backed requirements and product notes.
