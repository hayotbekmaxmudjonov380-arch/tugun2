-- Tugun: database schema (PostgreSQL 15+, Supabase-compatible)
-- Every business table carries org_id so one database can later serve many companies.
-- Primary keys are uuid; legacy_id keeps the id from the current claude.ai version for traceability.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;  -- Supabase already has it there

create schema if not exists app;      -- helper functions used by policies
create schema if not exists private;  -- secrets, never exposed through the API

-- ───────────────────────── enums ─────────────────────────
create type app.member_role  as enum ('rahbar', 'xodim', 'mehmon', 'terminal');
create type app.task_status  as enum ('new', 'progress', 'review', 'done');
create type app.att_source   as enum ('kiosk', 'manual', 'phone', 'auto');
create type app.mark_kind    as enum ('in', 'out');
create type app.doc_kind     as enum ('charter', 'position');

-- ───────────────────────── organisation ─────────────────────────
create table public.orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text not null default 'Asia/Tashkent',
  grace_min   int  not null default 5   check (grace_min between 0 and 120),
  work_days   int[] not null default '{1,2,3,4,5}',
  pin_len     int  not null default 4   check (pin_len between 4 and 8),
  max_staff   int  not null default 100,
  created_at  timestamptz not null default now()
);

create table public.branches (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs on delete cascade,
  legacy_id  text,
  name       text not null,
  sort       int  not null default 0,
  unique (org_id, legacy_id)
);

create table public.departments (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs on delete cascade,
  branch_id      uuid not null references public.branches on delete restrict,
  legacy_id      text,
  name           text not null,
  sort           int  not null default 0,
  work_start     time not null default '09:00',
  work_end       time not null default '18:00',
  head_staff_id  uuid,                      -- FK added after staff exists
  unique (org_id, legacy_id)
);

create table public.positions (               -- lavozim yo'riqnomalari
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs on delete cascade,
  dept_id     uuid references public.departments on delete set null,
  legacy_id   text,
  title       text not null,
  reports_to  text,
  summary     text,
  duties      text[] not null default '{}',
  daily       text[] not null default '{}',
  kpi         text[] not null default '{}',
  rights      text[] not null default '{}',
  first_week  text[] not null default '{}',
  sort        int  not null default 0,
  version     int  not null default 1,
  updated_at  timestamptz not null default now(),
  unique (org_id, legacy_id)
);

create table public.staff (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs on delete cascade,
  dept_id      uuid not null references public.departments on delete restrict,
  position_id  uuid references public.positions on delete set null,
  legacy_id    text,
  full_name    text not null,
  job_title    text,
  phone        text,
  sort         int  not null default 0,
  is_admin     boolean not null default false,  -- 'rahbar' access level for a staff member
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (org_id, legacy_id),
  unique (id, org_id)
);

alter table public.departments
  add constraint departments_head_fk foreign key (head_staff_id) references public.staff on delete set null;

-- A login account (auth.users) belongs to an org with one role and, usually, one staff card.
create table public.members (
  user_id    uuid not null,                  -- auth.users.id
  org_id     uuid not null references public.orgs on delete cascade,
  role       app.member_role not null,
  staff_id   uuid references public.staff on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, org_id),
  unique (org_id, staff_id)                  -- one account per staff card
);

-- PINs live in a private schema: no API role can read them, only security-definer functions.
create table private.org_secrets (
  org_id  uuid primary key references public.orgs on delete cascade,
  pepper  bytea not null default extensions.gen_random_bytes(32)
);

create table private.staff_pins (
  staff_id  uuid primary key references public.staff on delete cascade,
  org_id    uuid not null references public.orgs on delete cascade,
  pin_hash  text not null,                   -- hex(hmac_sha256(pin, org pepper))
  unique (org_id, pin_hash)                  -- the kiosk finds the person by PIN alone
);

create table private.kiosk_attempts (
  user_id   uuid primary key,                -- the terminal account
  fails     int  not null default 0,
  locked_until timestamptz
);

-- ───────────────────────── tasks ─────────────────────────
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs on delete cascade,
  legacy_id        text,
  title            text not null check (length(title) between 1 and 200),
  description      text,
  owner_staff_id   uuid not null,                  -- mas'ul: exactly one
  status           app.task_status not null default 'new',
  progress         int  not null default 0 check (progress between 0 and 100),
  start_date       date,
  due_date         date,
  done_at          timestamptz,
  created_by       uuid,                            -- staff id, null = rahbar account without card
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_comment_at  timestamptz,
  unique (org_id, legacy_id),
  foreign key (owner_staff_id, org_id) references public.staff (id, org_id),
  check (due_date is null or start_date is null or due_date >= start_date)
);

create table public.task_depts (
  task_id  uuid not null references public.tasks on delete cascade,
  dept_id  uuid not null references public.departments on delete cascade,
  org_id   uuid not null references public.orgs on delete cascade,
  primary key (task_id, dept_id)
);

create table public.task_staff (
  task_id   uuid not null references public.tasks on delete cascade,
  staff_id  uuid not null references public.staff on delete cascade,
  org_id    uuid not null references public.orgs on delete cascade,
  primary key (task_id, staff_id)
);

create table public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs on delete cascade,
  task_id    uuid not null references public.tasks on delete cascade,
  staff_id   uuid references public.staff on delete set null,
  user_id    uuid,
  body       text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.task_files (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs on delete cascade,
  task_id       uuid not null references public.tasks on delete cascade,
  storage_path  text not null,                -- bucket object key: <org>/<task>/<uuid>-<name>
  name          text not null,
  mime          text,
  size_bytes    bigint,
  uploaded_by   uuid references public.staff on delete set null,
  created_at    timestamptz not null default now()
);

-- Task history is written only by triggers, so nobody can forge it.
create table public.task_events (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.orgs on delete cascade,
  task_id     uuid not null references public.tasks on delete cascade,
  actor_staff uuid,
  actor_user  uuid,
  kind        text not null,                  -- create | status | progress | edit | file | comment
  detail      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ───────────────────────── attendance ─────────────────────────
create table public.attendance (              -- one row per person per day (what the UI shows)
  org_id    uuid not null references public.orgs on delete cascade,
  staff_id  uuid not null references public.staff on delete cascade,
  day       date not null,
  in_time   time,
  out_time  time,
  source    app.att_source not null default 'kiosk',
  updated_at timestamptz not null default now(),
  primary key (staff_id, day),
  check (out_time is null or in_time is null or out_time >= in_time)
);

create table public.attendance_edits (        -- audit trail for manual corrections
  id         bigint generated always as identity primary key,
  org_id     uuid not null references public.orgs on delete cascade,
  staff_id   uuid not null references public.staff on delete cascade,
  day        date not null,
  actor_staff uuid,
  actor_user uuid,
  prev       jsonb,
  next       jsonb,
  reason     text not null check (length(reason) >= 3),
  created_at timestamptz not null default now()
);

-- Stage 3 (selfie + geofence). Created now so stage 3 needs no schema migration.
create table public.work_sites (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references public.orgs on delete cascade,
  name      text not null,
  lat       double precision not null,
  lng       double precision not null,
  radius_m  int not null default 150 check (radius_m between 30 and 2000)
);

create table public.attendance_marks (        -- raw events: every check-in / check-out
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.orgs on delete cascade,
  staff_id    uuid not null references public.staff on delete cascade,
  kind        app.mark_kind not null,
  at          timestamptz not null default now(),
  source      app.att_source not null,
  site_id     uuid references public.work_sites on delete set null,
  inside_site boolean,                         -- result only; the route is never stored
  accuracy_m  int,
  photo_path  text,                            -- object key; storage location decided after legal review
  device      text
);

-- ───────────────────────── charter & acknowledgements ─────────────────────────
create table public.charter (                  -- nizom: one per org
  org_id      uuid primary key references public.orgs on delete cascade,
  title       text not null default 'Ichki nizom',
  status      text not null default 'Loyiha',
  version     int  not null default 1,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.charter_sections (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs on delete cascade,
  legacy_id  text,
  title      text not null,
  body       text not null default '',
  sort       int  not null default 0,
  unique (org_id, legacy_id)
);

create table public.acknowledgements (         -- "Tanishdim"
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.orgs on delete cascade,
  staff_id    uuid not null references public.staff on delete cascade,
  kind        app.doc_kind not null,
  position_id uuid references public.positions on delete cascade,
  version     int  not null,
  user_id     uuid,                            -- who pressed the button (null for migrated rows)
  acked_at    timestamptz not null default now(),
  check ((kind = 'position') = (position_id is not null))
);
create unique index acknowledgements_one on public.acknowledgements
  (staff_id, kind, coalesce(position_id, '00000000-0000-0000-0000-000000000000'::uuid), version);

-- ───────────────────────── activity / notifications ─────────────────────────
create table public.activity (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.orgs on delete cascade,
  actor_staff uuid,
  kind        text not null,
  task_id     uuid references public.tasks on delete cascade,
  body        text,
  to_staff    uuid[] not null default '{}',
  to_depts    uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ───────────────────────── indexes ─────────────────────────
create index on public.members (user_id);
create index on public.staff (org_id, dept_id);
create index on public.departments (org_id, head_staff_id);
create index on public.tasks (org_id, status, due_date);
create index on public.tasks (owner_staff_id);
create index on public.task_staff (staff_id);
create index on public.task_depts (dept_id);
create index on public.task_comments (task_id, created_at);
create index on public.task_events (task_id, created_at);
create index on public.attendance (org_id, day);
create index on public.attendance_marks (staff_id, at);
create index on public.activity (org_id, created_at desc);
create index on public.activity using gin (to_staff);
create index on public.acknowledgements (org_id, staff_id);
