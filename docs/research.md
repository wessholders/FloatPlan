# Float Plan Research And MVP Notes

## Core Finding

A successful float plan is not a filing with the Coast Guard. It is a practical handoff to a reliable person who can act if the boater does not return or check in as planned.

The U.S. Coast Guard Auxiliary float plan instructs boaters to complete the plan before departure, leave it with a reliable person, notify that person if plans change, and close the plan when home safely. It also explicitly says not to file the plan with the Coast Guard.

Source: https://floatplancentral.cgaux.org/download/USCGFloatPlan.pdf

## Safety Context

The Coast Guard's 2024 Recreational Boating Statistics reported 3,887 incidents, 556 deaths, 2,170 injuries, and about $88 million in property damage. Where cause of death was known, 76% of fatal victims drowned; where PFD use was known, 87% were not wearing one. Open motorboats and paddlecraft represented major fatality categories, which supports targeting all recreational and working water users, not only larger powerboats.

Source: https://uscgboating.org/library/accident-statistics/Recreational-Boating-Statistics-2024.pdf

## What A Useful Float Plan Needs

Minimum viable information:

- Operator name and phone
- Activity type
- Number of people aboard
- Launch Location description and optional map pin
- Pull Out Location description and optional map pin
- Destination or operating area
- Departure time
- Expected return time
- Emergency contacts

High-value optional information:

- Planned route, stops, waypoints, and alternate pull out
- Passenger names, ages, phone numbers, PFD color, and medical notes
- Vessel type, length, color, name, registration, propulsion, and visible features
- Communications equipment: cell, VHF, satellite messenger, DSC/MMSI
- Safety and survival gear: PFDs, visual distress signals, audible signals, anchor, dewatering, lights, food, water, first aid
- Beacon information: EPIRB, PLB, AIS MOB, satellite messenger
- Tow vehicle/trailer description, license plate, and parking location
- Vessel photo

Source: https://floatplancentral.cgaux.org/download/USCGFloatPlan.pdf

## Emergency Contact Workflow

The Coast Guard Auxiliary emergency guide starts with whether there is genuine concern for people who have not returned or checked in within a reasonable time. The guide tells the holder to use the float plan, contact listed contacts, avoid speculation, and then contact the local rescue authority that handles marine emergencies.

Product implication:

- The app should not create panic by default.
- Contacts need clear "what to do if overdue" instructions.
- The generated plan must tell contacts not to guess or embellish missing facts.
- A safe-return closeout is as important as the initial send.

Source: https://floatplancentral.cgaux.org/help/BoatingEmergencyGuide.htm

## UX Principles

- The dock workflow must be under two minutes for common repeat users.
- Required fields should be limited to what materially improves a search.
- Launch Location and Pull Out Location should support a simple map pin popup, current-location capture, and manual editing.
- Round trips should be the default. A separate Pull Out Location pin should only appear when the user says they are pulling out somewhere different.
- Departure and expected return should both be explicit calendar and time selections.
- Phone formatting should follow the user's country preference; during US-first development, display phone numbers as `(xxx) xxx-xxxx`.
- Optional sections should be skippable but easy to save for reuse later.
- The first version should work without auth.
- SMS matters because recipients actually see it; email is useful for complete detail and attachments.
- A native app can eventually capture better data than a web form: GPS, photos, contacts, push reminders, offline use, and one-tap repeat trips.

## MVP Product Shape

Version 1 should be a mobile-first web app with:

- Build plan
- Save browser draft
- Send by SMS and email handoff links
- Copy generated plan
- Prompt near return time
- Send safe-return message

Important static-web limitation:

- A browser-only prototype can prefill SMS and email using `sms:` and `mailto:` links. It cannot reliably send SMS/email automatically, verify delivery, run background reminders after the browser closes, or escalate overdue trips. Those require a backend and/or native app capabilities.

## Test Delivery Plan

GitHub Pages is useful for testing the user handoff flow on real phones:

- Open the page on iOS and Android.
- Confirm the launch map popup opens and can save a hybrid-map pin.
- Confirm the Pull Out Location map only appears when the user checks that they are pulling out somewhere different.
- Confirm departure and return both use date and time controls.
- Confirm US phone numbers format as `(xxx) xxx-xxxx`.
- Enter one phone contact and one email contact.
- Confirm SMS opens with the float plan prefilled.
- Confirm email opens with recipients, subject, and body prefilled.
- Confirm the user can send the safe-return message.

Production delivery should not depend on `sms:` or `mailto:` links. It should use backend delivery:

- SMS: Twilio, Telnyx, or a similar programmable messaging provider.
- Email: Postmark, SendGrid, AWS SES, or a similar transactional email provider.
- Scheduler: backend job or queue for return prompts and overdue workflow.
- Audit log: sent time, recipient, channel, delivery status, and safe-return closeout.

## Backend Requirements For Paid Product

- Account profiles
- Saved boats, passengers, contacts, and repeat trips
- SMS/email delivery service
- Delivery status and audit log
- Return reminder scheduler
- Delayed-return updates
- Safe-return closeout
- Emergency-contact escalation instructions
- Privacy controls and retention policy
- Photo storage
- Optional location snapshots at send time and safe-return time

## Monetization Recommendation

Use a freemium safety model:

- Free: create and send basic float plans manually.
- Paid individual subscription: saved vessels, contacts, repeat trips, SMS delivery tracking, photos, reminders, and history.
- Family/crew plan: shared contacts, household vessels, recurring passengers.
- Organization plan: clubs, marinas, guide services, rentals, sailing schools, and outfitters.

Avoid paywalling the basic act of sending a float plan. Charge for convenience, reliability, saved data, automation, delivery tracking, and multi-user workflows.
