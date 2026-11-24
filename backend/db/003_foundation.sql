-- Tugun 003: foundation changes decided on 2026-11-12, before the app is wired to the database.
--   A. Self-registration: a person signs up, sends a join request, rahbar approves and links a staff card.
--   B. A person may work in several departments (staff.dept_id stays the PRIMARY one: its hours set lateness).
--   C. Task completion: only rahbar accepts a task as done; a returned task needs a comment.
--   D. Payroll foundation: pay plans (fix / KPI, with history), absences, KPI results, manual adjustments
--      (bonus, overtime, fine), monthly periods that lock attendance once closed, late-minute fines.
-- Run after 001 and 002. Safe on Supabase SQL editor (choose "Run and enable RLS" if asked).

-- ═════════════════════════ A. self-registration ═════════════════════════
alter table public.orgs add column if not exists join_code text unique
  default upper(substr(md5(gen_random_uuid()::text), 1, 8));
update public.orgs set join_code = upper(substr(md5(gen_random_uuid()::text), 1, 8)) where join_code is null;

create type app.request_status as enum ('pending', 'approved', 'rejected');

create table public.join_requests (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs on delete cascade,
  user_id     uuid not null,
  full_name   text not null check (length(trim(full_name)) between 3 and 120),
  phone       text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  status      app.request_status not null default 'pending',
  staff_id    uuid references public.staff on delete set null,
  role        app.member_role,
  decided_by  uuid,
  decided_at  timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);
create unique index join_requests_one_pending on public.join_requests (org_id, user_id) where status = 'pending';
create index on public.join_requests (org_id, status);

-- ═════════════════════════ B. several departments per person ═════════════════════════
create table public.staff_departments (            -- additional departments; primary stays in staff.dept_id
  staff_id  uuid not null references public.staff on delete cascade,
  dept_id   uuid not null references public.departments on delete cascade,
  org_id    uuid not null references public.orgs on delete cascade,
  primary key (staff_id, dept_id)
);
create index on public.staff_departments (dept_id);

-- ═════════════════════════ C. task acceptance ═════════════════════════
alter table public.tasks add column if not exists accepted_by uuid;     -- auth user of the rahbar
alter table public.tasks add column if not exists accepted_at timestamptz;

-- ═════════════════════════ D. payroll foundation ═════════════════════════
alter table public.orgs add column if not exists late_fine_per_min numeric(12,2) not null default 1000 check (late_fine_per_min >= 0);
alter table public.orgs add column if not exists currency text not null default 'UZS';

create type app.pay_mode     as enum ('fixed', 'kpi', 'mixed');
create type app.absence_kind as enum ('tatil', 'kasallik', 'xizmat_safari', 'ruxsatli', 'ruxsatsiz');
create type app.adj_kind     as enum ('bonus', 'overtime', 'fine', 'advance', 'other');
create type app.period_status as enum ('open', 'closed');

create table public.pay_plans (                    -- how a person is paid; a new row on every change keeps history
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs on delete cascade,
  staff_id     uuid not null references public.staff on delete cascade,
  mode         app.pay_mode not null,
  base_amount  numeric(14,2) not null default 0 check (base_amount >= 0),   -- monthly fixed part
  params       jsonb not null default '{}',                                -- KPI formula etc.; filled when rules arrive
  valid_from   date not null,
  valid_to     date,
  note         text,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from),
  unique (staff_id, valid_from)
);

create table public.absences (                     -- leave, sick days, trips: a date range with a reason
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs on delete cascade,
  staff_id   uuid not null references public.staff on delete cascade,
  kind       app.absence_kind not null,
  date_from  date not null,
  date_to    date not null,
  note       text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (date_to >= date_from and date_to - date_from <= 366)
);
create index on public.absences (staff_id, date_from);

create table public.kpi_results (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references public.orgs on delete cascade,
  staff_id  uuid not null references public.staff on delete cascade,
  month     date not null check (extract(day from month) = 1),
  metric    text not null,
  target    numeric,
  actual    numeric,
  score     numeric,                                 -- result in % or points, per the plan's rules
  note      text,
  created_at timestamptz not null default now(),
  unique (staff_id, month, metric)
);

create table public.pay_adjustments (              -- manual lines: bonus, overtime, fine, advance
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references public.orgs on delete cascade,
  staff_id  uuid not null references public.staff on delete cascade,
  month     date not null check (extract(day from month) = 1),
  kind      app.adj_kind not null,
  amount    numeric(14,2) not null check (amount >= 0),               -- sign comes from kind
  note      text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.pay_adjustments (staff_id, month);

create table public.payroll_periods (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs on delete cascade,
  month      date not null check (extract(day from month) = 1),
  status     app.period_status not null default 'open',
  closed_by  uuid,
  closed_at  timestamptz,
  unique (org_id, month)
);

create table public.payroll_lines (                -- the computed result per person per month (formula comes later)
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs on delete cascade,
  period_id     uuid not null references public.payroll_periods on delete cascade,
  staff_id      uuid not null references public.staff on delete cascade,
  base          numeric(14,2) not null default 0,
  kpi           numeric(14,2) not null default 0,
  overtime      numeric(14,2) not null default 0,
  bonus         numeric(14,2) not null default 0,
  late_minutes  int not null default 0,
  late_fine     numeric(14,2) not null default 0,   -- withheld separately, after the salary is computed
  other_deductions numeric(14,2) not null default 0,
  net           numeric(14,2) not null default 0,
  detail        jsonb not null default '{}',
  computed_at   timestamptz not null default now(),
  unique (period_id, staff_id)
);

-- ═════════════════════════ helpers updated for several departments ═════════════════════════
create or replace function app.managed_staff() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s
  where s.org_id in (select app.rahbar_orgs()) or s.dept_id in (select app.head_dept_ids())
  union
  select sd.staff_id from public.staff_departments sd where sd.dept_id in (select app.head_dept_ids())
$$;

create or replace function app.manages_staff(p_staff uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.id = p_staff
      and (app.is_rahbar(s.org_id)
           or s.dept_id = any(app.head_depts(s.org_id))
           or exists (select 1 from public.staff_departments sd
                      where sd.staff_id = s.id and sd.dept_id = any(app.head_depts(s.org_id)))))
$$;

-- Is this month closed for payroll? Closed months cannot be changed.
create or replace function app.month_closed(p_org uuid, p_day date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.payroll_periods
                 where org_id = p_org and month = date_trunc('month', p_day)::date and status = 'closed')
$$;

-- ═════════════════════════ RLS ═════════════════════════
do $$ declare t text; begin
  foreach t in array array['join_requests','staff_departments','pay_plans','absences','kpi_results',
                           'pay_adjustments','payroll_periods','payroll_lines'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Join requests: you see your own; rahbar sees the org's. Writes only through the functions below.
create policy join_requests_read on public.join_requests for select to authenticated
  using (user_id = auth.uid() or org_id in (select app.rahbar_orgs()));

-- Additional departments are part of the structure: org reads, rahbar writes.
create policy staff_departments_read on public.staff_departments for select to authenticated using (org_id in (select app.view_orgs()));
create policy staff_departments_ins  on public.staff_departments for insert to authenticated with check (org_id in (select app.rahbar_orgs()));
create policy staff_departments_del  on public.staff_departments for delete to authenticated using (org_id in (select app.rahbar_orgs()));

-- Pay data: rahbar sees and edits everyone's; a person sees only their own; boshliq sees nothing.
do $$ declare t text; begin
  foreach t in array array['pay_plans','kpi_results','pay_adjustments','payroll_lines'] loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (org_id in (select app.rahbar_orgs()) or staff_id in (select app.my_staff()))', t);
    execute format('create policy %1$s_ins  on public.%1$s for insert to authenticated with check (org_id in (select app.rahbar_orgs()))', t);
    execute format('create policy %1$s_upd  on public.%1$s for update to authenticated using (org_id in (select app.rahbar_orgs())) with check (org_id in (select app.rahbar_orgs()))', t);
    execute format('create policy %1$s_del  on public.%1$s for delete to authenticated using (org_id in (select app.rahbar_orgs()))', t);
  end loop;
end $$;
create policy payroll_periods_read on public.payroll_periods for select to authenticated using (org_id in (select app.view_orgs()));
-- periods change only through close_month() / reopen_month()

-- Absences: same visibility as attendance (rahbar all, boshliq own departments, person self).
create policy absences_read on public.absences for select to authenticated
  using (staff_id in (select app.managed_staff()) or staff_id in (select app.my_staff()));
-- writes only through absence_set()

-- ═════════════════════════ integrity triggers ═════════════════════════
-- Org and staff of every new row must match; pay rows of a closed month are frozen.
create or replace function app.tg_staff_org_lock() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record; v_month date;
begin
  r := coalesce(new, old);
  if tg_op <> 'DELETE' and not exists (select 1 from public.staff where id = new.staff_id and org_id = new.org_id) then
    raise exception 'staff from another org' using errcode = '42501';
  end if;
  if tg_table_name = 'staff_departments' then
    if tg_op <> 'DELETE' and not exists (select 1 from public.departments where id = new.dept_id and org_id = new.org_id) then
      raise exception 'department from another org' using errcode = '42501'; end if;
    return r;
  end if;
  if tg_table_name in ('kpi_results', 'pay_adjustments') then
    if app.month_closed(r.org_id, r.month) or (tg_op = 'UPDATE' and app.month_closed(old.org_id, old.month)) then
      raise exception 'month is closed' using errcode = '42501'; end if;
  elsif tg_table_name = 'payroll_lines' then
    select month into v_month from public.payroll_periods where id = r.period_id and org_id = r.org_id;
    if v_month is null then raise exception 'period from another org' using errcode = '42501'; end if;
    if app.month_closed(r.org_id, v_month) then raise exception 'month is closed' using errcode = '42501'; end if;
  end if;
  if tg_op = 'INSERT' and tg_table_name in ('pay_plans', 'pay_adjustments') and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return r;
end $$;
create trigger staff_departments_org before insert or update on public.staff_departments for each row execute function app.tg_staff_org_lock();
create trigger pay_plans_org   before insert or update on public.pay_plans       for each row execute function app.tg_staff_org_lock();
create trigger kpi_org         before insert or update or delete on public.kpi_results     for each row execute function app.tg_staff_org_lock();
create trigger adj_org         before insert or update or delete on public.pay_adjustments for each row execute function app.tg_staff_org_lock();
create trigger lines_org       before insert or update or delete on public.payroll_lines   for each row execute function app.tg_staff_org_lock();

-- Task rules: only rahbar may mark a task done or reopen a done task.
create or replace function app.tg_task_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare allowed text[] := array['status','progress','updated_at','done_at','last_comment_at','accepted_by','accepted_at'];
begin
  if auth.uid() is null then return new; end if;   -- server scripts (migration) keep their values
  if tg_op = 'INSERT' then
    new.created_by := app.staff_in(new.org_id);
    new.created_at := now();
    if new.status = 'done' and not app.is_rahbar(new.org_id) then
      raise exception 'only rahbar accepts a task as done' using errcode = '42501'; end if;
  else
    if new.org_id <> old.org_id or new.id <> old.id then raise exception 'cannot move task' using errcode = '42501'; end if;
    if pg_trigger_depth() = 1 and not app.can_edit_task(old.id)
       and (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
      raise exception 'assignee may change only status and progress' using errcode = '42501';
    end if;
    if (new.status = 'done') <> (old.status = 'done') and not app.is_rahbar(new.org_id) then
      raise exception 'only rahbar accepts or reopens a task' using errcode = '42501';
    end if;
    if pg_trigger_depth() = 1 and (new.accepted_by, new.accepted_at) is distinct from (old.accepted_by, old.accepted_at)
       and not app.is_rahbar(new.org_id) then
      raise exception 'only rahbar accepts a task' using errcode = '42501';
    end if;
    new.created_by := old.created_by; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.done_at := now(); new.progress := 100; new.accepted_by := auth.uid(); new.accepted_at := now();
  end if;
  if new.status <> 'done' then new.done_at := null; new.accepted_by := null; new.accepted_at := null; end if;
  return new;
end $$;

-- Sending a task for review notifies every rahbar account of the org.
create or replace function app.tg_task_review_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_to uuid[];
begin
  if auth.uid() is null or new.status <> 'review' or old.status = 'review' then return new; end if;
  select coalesce(array_agg(distinct s.id), '{}') into v_to
    from public.members m join public.staff s on s.id = m.staff_id
   where m.org_id = new.org_id and (m.role = 'rahbar' or s.is_admin);
  insert into public.activity (org_id, actor_staff, kind, task_id, body, to_staff)
  values (new.org_id, app.staff_in(new.org_id), 'review', new.id, new.title, v_to);
  return new;
end $$;
create trigger tasks_review_notify after update of status on public.tasks for each row execute function app.tg_task_review_notify();

-- ═════════════════════════ actions (RPC) ═════════════════════════
-- Anyone signed in may ask to join with the company code. One pending request per person per company.
create or replace function public.request_join(p_code text, p_full_name text, p_phone text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select id into v_org from public.orgs where join_code = upper(trim(p_code));
  if v_org is null then raise exception 'wrong company code' using errcode = '22023'; end if;
  if exists (select 1 from public.members where user_id = auth.uid() and org_id = v_org) then
    raise exception 'already a member' using errcode = '23505'; end if;
  insert into public.join_requests (org_id, user_id, full_name, phone)
  values (v_org, auth.uid(), trim(p_full_name), nullif(trim(p_phone), '')) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'request already sent' using errcode = '23505';
end $$;

-- rahbar approves: links the account to a staff card (or none for a guest) with a role.
create or replace function public.approve_join(p_request uuid, p_staff uuid, p_role app.member_role default 'xodim') returns void
language plpgsql security definer set search_path = '' as $$
declare r public.join_requests;
begin
  select * into r from public.join_requests where id = p_request for update;
  if r.id is null or not app.is_rahbar(r.org_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status <> 'pending' then raise exception 'request already decided' using errcode = '22023'; end if;
  if p_role = 'xodim' and p_staff is null then raise exception 'staff card required' using errcode = '22023'; end if;
  insert into public.members (user_id, org_id, role, staff_id) values (r.user_id, r.org_id, p_role, p_staff);
  update public.join_requests set status = 'approved', staff_id = p_staff, role = p_role,
         decided_by = auth.uid(), decided_at = now() where id = r.id;
exception when unique_violation then
  raise exception 'this staff card already has an account' using errcode = '23505';
end $$;

create or replace function public.reject_join(p_request uuid, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.join_requests;
begin
  select * into r from public.join_requests where id = p_request for update;
  if r.id is null or not app.is_rahbar(r.org_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status <> 'pending' then raise exception 'request already decided' using errcode = '22023'; end if;
  update public.join_requests set status = 'rejected', note = p_note, decided_by = auth.uid(), decided_at = now() where id = r.id;
end $$;

-- rahbar accepts a task (→ done) or returns it with a comment (→ progress).
create or replace function public.task_review(p_task uuid, p_accept boolean, p_comment text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare t public.tasks; v_to uuid[];
begin
  select * into t from public.tasks where id = p_task;
  if t.id is null or not app.is_rahbar(t.org_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_accept then
    update public.tasks set status = 'done' where id = p_task;
    if coalesce(trim(p_comment), '') <> '' then
      insert into public.task_comments (task_id, staff_id, user_id, body) values (p_task, app.staff_in(t.org_id), auth.uid(), trim(p_comment));
    end if;
    return 'done';
  end if;
  if coalesce(length(trim(p_comment)), 0) < 3 then raise exception 'comment required to return a task' using errcode = '22023'; end if;
  update public.tasks set status = 'progress' where id = p_task;
  insert into public.task_comments (task_id, staff_id, user_id, body) values (p_task, app.staff_in(t.org_id), auth.uid(), trim(p_comment));
  select coalesce(array_agg(distinct x), '{}') into v_to
    from (select staff_id x from public.task_staff where task_id = p_task union select t.owner_staff_id) q;
  insert into public.activity (org_id, actor_staff, kind, task_id, body, to_staff)
  values (t.org_id, app.staff_in(t.org_id), 'returned', p_task, trim(p_comment), v_to);
  return 'progress';
end $$;

-- Absence for a date range: rahbar, or boshliq for own departments. Closed months are frozen.
create or replace function public.absence_set(p_staff uuid, p_kind app.absence_kind, p_from date, p_to date, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid; d date;
begin
  select org_id into v_org from public.staff where id = p_staff;
  if v_org is null or not app.manages_staff(p_staff) then raise exception 'not allowed' using errcode = '42501'; end if;
  for d in select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date loop
    if app.month_closed(v_org, d) then raise exception 'month is closed' using errcode = '42501'; end if;
  end loop;
  insert into public.absences (org_id, staff_id, kind, date_from, date_to, note, created_by)
  values (v_org, p_staff, p_kind, p_from, p_to, p_note, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.absence_delete(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.absences;
begin
  select * into a from public.absences where id = p_id;
  if a.id is null or not app.manages_staff(a.staff_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if app.month_closed(a.org_id, a.date_from) or app.month_closed(a.org_id, a.date_to) then
    raise exception 'month is closed' using errcode = '42501'; end if;
  delete from public.absences where id = p_id;
end $$;

-- Attendance corrections now also respect closed months (replaces the 002 version).
create or replace function public.attendance_set(p_staff uuid, p_day date, p_in time, p_out time, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; r public.attendance;
begin
  select org_id into v_org from public.staff where id = p_staff;
  if v_org is null or not app.manages_staff(p_staff) then raise exception 'not allowed' using errcode = '42501'; end if;
  if coalesce(length(trim(p_reason)), 0) < 3 then raise exception 'reason required' using errcode = '22023'; end if;
  if app.month_closed(v_org, p_day) then raise exception 'month is closed' using errcode = '42501'; end if;
  select * into r from public.attendance where staff_id = p_staff and day = p_day for update;
  insert into public.attendance (org_id, staff_id, day, in_time, out_time, source, updated_at)
  values (v_org, p_staff, p_day, p_in, p_out, 'manual', now())
  on conflict (staff_id, day) do update set in_time = excluded.in_time, out_time = excluded.out_time,
    source = 'manual', updated_at = now();
  insert into public.attendance_edits (org_id, staff_id, day, actor_staff, actor_user, prev, next, reason)
  values (v_org, p_staff, p_day, app.staff_in(v_org), auth.uid(),
          case when r.staff_id is null then null else jsonb_build_object('in', r.in_time, 'out', r.out_time) end,
          jsonb_build_object('in', p_in, 'out', p_out), trim(p_reason));
end $$;

-- Late minutes and fine per person for a month. Late = arrival after the PRIMARY department's start;
-- arrivals within the grace minutes are not late; beyond grace every minute from the start counts.
-- Days covered by an absence are ignored. rahbar gets everyone, others only themselves.
create or replace function public.late_summary(p_org uuid, p_month date)
returns table (staff_id uuid, full_name text, late_days int, late_minutes int, fine numeric)
language sql stable security definer set search_path = '' as $$
  with o as (select grace_min, late_fine_per_min from public.orgs where id = p_org),
  days as (
    select a.staff_id, s.full_name,
           extract(epoch from (a.in_time - d.work_start))::int / 60 as mins
    from public.attendance a
    join public.staff s on s.id = a.staff_id
    join public.departments d on d.id = s.dept_id
    where a.org_id = p_org and a.in_time is not null
      and a.day >= date_trunc('month', p_month)::date
      and a.day <  (date_trunc('month', p_month) + interval '1 month')::date
      and not exists (select 1 from public.absences ab where ab.staff_id = a.staff_id and a.day between ab.date_from and ab.date_to)
      and (app.is_rahbar(p_org) or a.staff_id = app.staff_in(p_org))
  )
  select staff_id, full_name,
         count(*) filter (where mins > o.grace_min)::int,
         coalesce(sum(mins) filter (where mins > o.grace_min), 0)::int,
         coalesce(sum(mins) filter (where mins > o.grace_min), 0) * o.late_fine_per_min
  from days, o group by staff_id, full_name, o.late_fine_per_min
$$;

-- Close a month: attendance, absences, KPI, adjustments and payroll lines of that month become read-only.
create or replace function public.close_month(p_org uuid, p_month date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_rahbar(p_org) then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.payroll_periods (org_id, month, status, closed_by, closed_at)
  values (p_org, date_trunc('month', p_month)::date, 'closed', auth.uid(), now())
  on conflict (org_id, month) do update set status = 'closed', closed_by = auth.uid(), closed_at = now();
end $$;

create or replace function public.reopen_month(p_org uuid, p_month date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_rahbar(p_org) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.payroll_periods set status = 'open', closed_by = null, closed_at = null
   where org_id = p_org and month = date_trunc('month', p_month)::date;
  insert into public.activity (org_id, actor_staff, kind, body)
  values (p_org, app.staff_in(p_org), 'month_reopened', to_char(p_month, 'YYYY-MM'));
end $$;

-- ═════════════════════════ privileges ═════════════════════════
revoke execute on function public.request_join(text, text, text), public.approve_join(uuid, uuid, app.member_role),
  public.reject_join(uuid, text), public.task_review(uuid, boolean, text),
  public.absence_set(uuid, app.absence_kind, date, date, text), public.absence_delete(uuid),
  public.attendance_set(uuid, date, time, time, text), public.late_summary(uuid, date),
  public.close_month(uuid, date), public.reopen_month(uuid, date) from public, anon;
grant execute on function public.request_join(text, text, text), public.approve_join(uuid, uuid, app.member_role),
  public.reject_join(uuid, text), public.task_review(uuid, boolean, text),
  public.absence_set(uuid, app.absence_kind, date, date, text), public.absence_delete(uuid),
  public.attendance_set(uuid, date, time, time, text), public.late_summary(uuid, date),
  public.close_month(uuid, date), public.reopen_month(uuid, date) to authenticated;
revoke execute on all functions in schema app from public, anon;
grant execute on all functions in schema app to authenticated;
