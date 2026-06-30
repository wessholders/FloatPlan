create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_contacts_channel_check check (phone is not null or email is not null)
);

create table public.saved_people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  age text,
  pfd text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vessels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  vessel_type text,
  name text,
  length text,
  color text,
  registration text,
  propulsion text,
  range text,
  safety_gear text,
  beacons text,
  vehicle text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.float_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  schema_version text not null default 'float-plan.static.v1',
  source text not null default 'web',
  status text not null default 'draft',
  operator_name text,
  operator_phone text,
  activity text,
  people_count integer,
  departure_at timestamptz,
  expected_return_at timestamptz,
  timezone text,
  trip_shape text not null default 'out_and_back',
  destination text,
  route text,
  conditions text,
  launch_description text,
  launch_lat numeric(9, 6),
  launch_lon numeric(9, 6),
  pull_out_description text,
  pull_out_lat numeric(9, 6),
  pull_out_lon numeric(9, 6),
  people jsonb not null default '[]'::jsonb,
  vessel jsonb not null default '{}'::jsonb,
  generated_message text not null,
  client_payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  closed_at timestamptz,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint float_plans_status_check check (status in ('draft', 'sent', 'overdue', 'closed', 'cancelled')),
  constraint float_plans_trip_shape_check check (trip_shape in ('out_and_back', 'different_pull_out')),
  constraint float_plans_people_count_check check (people_count is null or people_count > 0),
  constraint float_plans_launch_lat_check check (launch_lat is null or launch_lat between -90 and 90),
  constraint float_plans_launch_lon_check check (launch_lon is null or launch_lon between -180 and 180),
  constraint float_plans_pull_out_lat_check check (pull_out_lat is null or pull_out_lat between -90 and 90),
  constraint float_plans_pull_out_lon_check check (pull_out_lon is null or pull_out_lon between -180 and 180)
);

create table public.float_plan_recipients (
  id uuid primary key default gen_random_uuid(),
  float_plan_id uuid not null references public.float_plans(id) on delete cascade,
  name text,
  relationship text,
  phone text,
  email text,
  send_initial_plan boolean not null default true,
  send_safe_return boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint float_plan_recipients_channel_check check (phone is not null or email is not null)
);

create table public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  float_plan_id uuid not null references public.float_plans(id) on delete cascade,
  recipient_id uuid references public.float_plan_recipients(id) on delete set null,
  event_type text not null,
  channel text not null,
  provider text,
  provider_message_id text,
  status text not null,
  error_message text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_events_event_type_check check (event_type in ('float_plan', 'safe_return', 'return_reminder', 'delay_update')),
  constraint delivery_events_channel_check check (channel in ('sms', 'email', 'push')),
  constraint delivery_events_status_check check (status in ('queued', 'sent', 'delivered', 'failed', 'cancelled'))
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  float_plan_id uuid not null references public.float_plans(id) on delete cascade,
  checkin_type text not null,
  message text,
  previous_expected_return_at timestamptz,
  new_expected_return_at timestamptz,
  created_at timestamptz not null default now(),
  constraint checkins_type_check check (checkin_type in ('safe_return', 'delay_update', 'manual_note'))
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  float_plan_id uuid not null references public.float_plans(id) on delete cascade,
  job_type text not null,
  run_at timestamptz not null,
  status text not null default 'scheduled',
  attempts integer not null default 0,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_jobs_type_check check (job_type in ('return_reminder', 'overdue_check', 'retention_cleanup')),
  constraint notification_jobs_status_check check (status in ('scheduled', 'running', 'complete', 'failed', 'cancelled')),
  constraint notification_jobs_attempts_check check (attempts >= 0)
);

create index emergency_contacts_owner_id_idx on public.emergency_contacts(owner_id);
create index saved_people_owner_id_idx on public.saved_people(owner_id);
create index vessels_owner_id_idx on public.vessels(owner_id);
create index float_plans_owner_id_idx on public.float_plans(owner_id);
create index float_plans_status_expected_return_idx on public.float_plans(status, expected_return_at);
create index float_plan_recipients_float_plan_id_idx on public.float_plan_recipients(float_plan_id);
create index delivery_events_float_plan_id_idx on public.delivery_events(float_plan_id);
create index delivery_events_provider_message_id_idx on public.delivery_events(provider_message_id);
create index checkins_float_plan_id_idx on public.checkins(float_plan_id);
create index notification_jobs_status_run_at_idx on public.notification_jobs(status, run_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger emergency_contacts_set_updated_at
before update on public.emergency_contacts
for each row execute function public.set_updated_at();

create trigger saved_people_set_updated_at
before update on public.saved_people
for each row execute function public.set_updated_at();

create trigger vessels_set_updated_at
before update on public.vessels
for each row execute function public.set_updated_at();

create trigger float_plans_set_updated_at
before update on public.float_plans
for each row execute function public.set_updated_at();

create trigger float_plan_recipients_set_updated_at
before update on public.float_plan_recipients
for each row execute function public.set_updated_at();

create trigger delivery_events_set_updated_at
before update on public.delivery_events
for each row execute function public.set_updated_at();

create trigger notification_jobs_set_updated_at
before update on public.notification_jobs
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.saved_people enable row level security;
alter table public.vessels enable row level security;
alter table public.float_plans enable row level security;
alter table public.float_plan_recipients enable row level security;
alter table public.delivery_events enable row level security;
alter table public.checkins enable row level security;
alter table public.notification_jobs enable row level security;

create policy "Users can read their profile"
on public.profiles for select
using (id = auth.uid());

create policy "Users can insert their profile"
on public.profiles for insert
with check (id = auth.uid());

create policy "Users can update their profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can manage their emergency contacts"
on public.emergency_contacts for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can manage their saved people"
on public.saved_people for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can manage their vessels"
on public.vessels for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can read their float plans"
on public.float_plans for select
using (owner_id = auth.uid());

create policy "Users can insert their float plans"
on public.float_plans for insert
with check (owner_id = auth.uid());

create policy "Users can update their float plans"
on public.float_plans for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can delete their draft float plans"
on public.float_plans for delete
using (owner_id = auth.uid() and status = 'draft');

create policy "Users can read recipients for their float plans"
on public.float_plan_recipients for select
using (
  exists (
    select 1
    from public.float_plans
    where float_plans.id = float_plan_recipients.float_plan_id
      and float_plans.owner_id = auth.uid()
  )
);

create policy "Users can insert recipients for their float plans"
on public.float_plan_recipients for insert
with check (
  exists (
    select 1
    from public.float_plans
    where float_plans.id = float_plan_recipients.float_plan_id
      and float_plans.owner_id = auth.uid()
  )
);

create policy "Users can update recipients for their float plans"
on public.float_plan_recipients for update
using (
  exists (
    select 1
    from public.float_plans
    where float_plans.id = float_plan_recipients.float_plan_id
      and float_plans.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.float_plans
    where float_plans.id = float_plan_recipients.float_plan_id
      and float_plans.owner_id = auth.uid()
  )
);

create policy "Users can delete recipients for their draft float plans"
on public.float_plan_recipients for delete
using (
  exists (
    select 1
    from public.float_plans
    where float_plans.id = float_plan_recipients.float_plan_id
      and float_plans.owner_id = auth.uid()
      and float_plans.status = 'draft'
  )
);

create policy "Users can read delivery events for their float plans"
on public.delivery_events for select
using (
  exists (
    select 1
    from public.float_plans
    where float_plans.id = delivery_events.float_plan_id
      and float_plans.owner_id = auth.uid()
  )
);

create policy "Users can read checkins for their float plans"
on public.checkins for select
using (
  exists (
    select 1
    from public.float_plans
    where float_plans.id = checkins.float_plan_id
      and float_plans.owner_id = auth.uid()
  )
);

create policy "Users can read notification jobs for their float plans"
on public.notification_jobs for select
using (
  exists (
    select 1
    from public.float_plans
    where float_plans.id = notification_jobs.float_plan_id
      and float_plans.owner_id = auth.uid()
  )
);
