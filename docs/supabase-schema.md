# Supabase Schema Plan

The initial migration lives at:

`supabase/migrations/20260630190000_initial_schema.sql`

The development project details live in `docs/supabase-project.md`.

## Tables

- `profiles`: account profile data for authenticated users.
- `emergency_contacts`: saved contacts for repeat use.
- `saved_people`: saved passengers or crew for repeat use.
- `vessels`: saved vessel, safety gear, beacon, vehicle, and photo metadata.
- `float_plans`: one row per drafted or sent plan.
- `float_plan_recipients`: people selected to receive a plan or closeout.
- `delivery_events`: SMS, email, push, and provider delivery records.
- `checkins`: safe-return, delay-update, and manual check-in records.
- `notification_jobs`: scheduled reminders, overdue checks, and retention cleanup jobs.

## MVP Maintenance Path

The schema has room for accounts and saved data, but the first working backend should stay small.

Use these tables first:

- `float_plans`
- `float_plan_recipients`
- `delivery_events`
- `checkins`

Hold these tables until their features are needed:

- `profiles`
- `emergency_contacts`
- `saved_people`
- `vessels`
- `notification_jobs`

The first backend feature should be one Edge Function named `send-float-plan`. It should validate the browser payload, insert the float plan and recipients, and write delivery events. That keeps the browser simple and keeps provider credentials off GitHub Pages.

## Anonymous Sends

The first backend milestone should allow anonymous sends. Anonymous users should not write directly to these tables from the browser. Instead, a Supabase Edge Function should validate the payload and write with a service role key.

Authenticated users can later manage their own saved contacts, people, vessels, and float plans through normal Supabase Auth sessions.

## Row-Level Security

The migration enables row-level security on every table.

Authenticated users can only read or manage rows they own. Delivery events, check-ins, recipients, and notification jobs are readable to the owner through their parent `float_plans` row.

Backend delivery functions should use the service role key because they must create delivery records, check-ins, and notification jobs for both anonymous and authenticated plans.
