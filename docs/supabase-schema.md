# Supabase Schema Plan

The initial migration lives at:

`supabase/migrations/20260630190000_initial_schema.sql`

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

## Anonymous Sends

The first backend milestone should allow anonymous sends. Anonymous users should not write directly to these tables from the browser. Instead, a Supabase Edge Function should validate the payload and write with a service role key.

Authenticated users can later manage their own saved contacts, people, vessels, and float plans through normal Supabase Auth sessions.

## Row-Level Security

The migration enables row-level security on every table.

Authenticated users can only read or manage rows they own. Delivery events, check-ins, recipients, and notification jobs are readable to the owner through their parent `float_plans` row.

Backend delivery functions should use the service role key because they must create delivery records, check-ins, and notification jobs for both anonymous and authenticated plans.
