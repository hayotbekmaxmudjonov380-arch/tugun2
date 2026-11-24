-- Tugun: server-side security. Row Level Security on every table, plus a few
-- security-definer functions for the actions that must not be done by a direct write
-- (kiosk punch, PIN change, attendance correction, "Tanishdim").
-- Requires auth.uid() (provided by Supabase; emulated in test/auth_stub.sql).

-- ═════════════════════════ helpers (who am I in this org?) ═════════════════════════
create or replace function app.uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function app.member_role_in(p_org uuid) returns app.member_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.members m where m.user_id = auth.uid() and m.org_id = p_org
$$;

create or replace function app.staff_in(p_org uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.staff_id from public.members m where m.user_id = auth.uid() and m.org_id = p_org
$$;

-- Effective role: rahbar | boshliq | xodim | mehmon | terminal | null (not a member)
create or replace function app.role_in(p_org uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when m.role = 'rahbar' then 'rahbar'
    when m.role = 'xodim' and s.is_admin then 'rahbar'
    when m.role = 'xodim' and exists (select 1 from public.departments d
                                      where d.org_id = p_org and d.head_staff_id = m.staff_id) then 'boshliq'
    else m.role::text end
  from public.members m
  left join public.staff s on s.id = m.staff_id and s.active
  where m.user_id = auth.uid() and m.org_id = p_org
$$;

create or replace function app.is_rahbar(p_org uuid) returns boolean
language sql stable as $$ select coalesce(app.role_in(p_org) = 'rahbar', false) $$;

-- Can read the org's shared data (structure, tasks, charter). The terminal account cannot.
create or replace function app.can_view(p_org uuid) returns boolean
language sql stable as $$ select coalesce(app.role_in(p_org) in ('rahbar','boshliq','xodim','mehmon'), false) $$;

-- Can write as a person (comment, upload). Guests cannot.
create or replace function app.can_act(p_org uuid) returns boolean
language sql stable as $$ select coalesce(app.role_in(p_org) in ('rahbar','boshliq','xodim'), false) $$;

create or replace function app.head_depts(p_org uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(d.id), '{}') from public.departments d
  where d.org_id = p_org and d.head_staff_id is not null and d.head_staff_id = app.staff_in(p_org)
$$;

-- May this user manage this person's attendance? rahbar: everyone; boshliq: own departments; others: nobody.
create or replace function app.manages_staff(p_staff uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.id = p_staff
      and (app.is_rahbar(s.org_id) or s.dept_id = any(app.head_depts(s.org_id))))
$$;

create or replace function app.can_edit_task(p_task uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task and (
      app.is_rahbar(t.org_id)
      or (app.can_act(t.org_id) and app.staff_in(t.org_id) in (t.owner_staff_id, t.created_by))
      or exists (select 1 from public.task_depts td
                 where td.task_id = t.id and td.dept_id = any(app.head_depts(t.org_id)))))
$$;

create or replace function app.is_assignee(p_task uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.task_staff ts join public.tasks t on t.id = ts.task_id
                 where ts.task_id = p_task and ts.staff_id = app.staff_in(t.org_id))
$$;

create or replace function app.can_delete_task(p_task uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t join public.staff o on o.id = t.owner_staff_id
    where t.id = p_task and (app.is_rahbar(t.org_id) or o.dept_id = any(app.head_depts(t.org_id))))
$$;

-- ── Set-returning helpers. Policies use them as `col in (select app.x())`, which Postgres runs
-- ── once per query (hashed subplan) instead of once per row. Measured: 9 s → a few ms on 24k rows.
create or replace function app.orgs_with(p_roles text[]) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.org_id from public.members m
  left join public.staff s on s.id = m.staff_id and s.active
  where m.user_id = auth.uid() and (case
    when m.role = 'rahbar' then 'rahbar'
    when m.role = 'xodim' and s.is_admin then 'rahbar'
    when m.role = 'xodim' and exists (select 1 from public.departments d
                                      where d.org_id = m.org_id and d.head_staff_id = m.staff_id) then 'boshliq'
    else m.role::text end) = any(p_roles)
$$;
create or replace function app.view_orgs()   returns setof uuid language sql stable as $$ select app.orgs_with('{rahbar,boshliq,xodim,mehmon}') $$;
create or replace function app.act_orgs()    returns setof uuid language sql stable as $$ select app.orgs_with('{rahbar,boshliq,xodim}') $$;
create or replace function app.rahbar_orgs() returns setof uuid language sql stable as $$ select app.orgs_with('{rahbar}') $$;

create or replace function app.my_staff() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.staff_id from public.members m where m.user_id = auth.uid() and m.staff_id is not null
$$;
create or replace function app.head_dept_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select d.id from public.departments d join public.members m on m.staff_id = d.head_staff_id and m.org_id = d.org_id
  where m.user_id = auth.uid()
$$;
-- People whose attendance/acknowledgements I may see: whole org for rahbar, own departments for boshliq.
create or replace function app.managed_staff() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s
  where s.org_id in (select app.rahbar_orgs()) or s.dept_id in (select app.head_dept_ids())
$$;

-- ═════════════════════════ privileges ═════════════════════════
revoke all on schema private from public;
revoke all on all tables in schema private from public;
grant usage on schema app to authenticated;
revoke execute on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;

-- ═════════════════════════ row level security ═════════════════════════
do $$ declare t text; begin
  foreach t in array array['orgs','branches','departments','positions','staff','members','tasks',
    'task_depts','task_staff','task_comments','task_files','task_events','attendance',
    'attendance_edits','work_sites','attendance_marks','charter','charter_sections',
    'acknowledgements','activity'] loop
    execute format('alter table public.%I enable row level security', t);
    -- not FORCE: security-definer helpers run as the table owner and must see all rows
  end loop;
end $$;

-- Organisation structure: everyone in the org (except the terminal) reads; only rahbar writes.
create policy orgs_read  on public.orgs for select to authenticated using (id in (select app.view_orgs()));
create policy orgs_write on public.orgs for update to authenticated
  using (id in (select app.rahbar_orgs())) with check (id in (select app.rahbar_orgs()));

do $$ declare t text; begin
  foreach t in array array['branches','departments','positions','staff','charter','charter_sections','work_sites'] loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (org_id in (select app.view_orgs()))', t);
    execute format('create policy %1$s_ins  on public.%1$s for insert to authenticated with check (org_id in (select app.rahbar_orgs()))', t);
    execute format('create policy %1$s_upd  on public.%1$s for update to authenticated using (org_id in (select app.rahbar_orgs())) with check (org_id in (select app.rahbar_orgs()))', t);
    execute format('create policy %1$s_del  on public.%1$s for delete to authenticated using (org_id in (select app.rahbar_orgs()))', t);
  end loop;
end $$;

-- Accounts: you see your own row; rahbar sees and manages all accounts of the org.
create policy members_read on public.members for select to authenticated
  using (user_id = auth.uid() or org_id in (select app.rahbar_orgs()));
create policy members_ins on public.members for insert to authenticated with check (org_id in (select app.rahbar_orgs()));
create policy members_upd on public.members for update to authenticated
  using (org_id in (select app.rahbar_orgs())) with check (org_id in (select app.rahbar_orgs()));
create policy members_del on public.members for delete to authenticated using (org_id in (select app.rahbar_orgs()));

-- Tasks: the whole org reads. rahbar and boshliq create. Editors: rahbar, creator, mas'ul, boshliq of a
-- participating department. Assignees may only move status/progress (enforced by trigger below).
create policy tasks_read on public.tasks for select to authenticated using (org_id in (select app.view_orgs()));
create policy tasks_ins  on public.tasks for insert to authenticated
  with check (org_id in (select app.orgs_with('{rahbar,boshliq}')));
create policy tasks_upd  on public.tasks for update to authenticated
  using (app.can_edit_task(id) or app.is_assignee(id))
  with check (org_id in (select app.view_orgs()));
create policy tasks_del  on public.tasks for delete to authenticated using (app.can_delete_task(id));

do $$ declare t text; begin
  foreach t in array array['task_depts','task_staff'] loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (org_id in (select app.view_orgs()))', t);
    execute format('create policy %1$s_ins  on public.%1$s for insert to authenticated with check (app.can_edit_task(task_id))', t);
    execute format('create policy %1$s_del  on public.%1$s for delete to authenticated using (app.can_edit_task(task_id))', t);
  end loop;
end $$;

create policy comments_read on public.task_comments for select to authenticated using (org_id in (select app.view_orgs()));
create policy comments_ins  on public.task_comments for insert to authenticated
  with check (org_id in (select app.act_orgs()) and user_id = auth.uid()
              and staff_id is not distinct from app.staff_in(org_id));
create policy comments_del  on public.task_comments for delete to authenticated using (org_id in (select app.rahbar_orgs()));

create policy files_read on public.task_files for select to authenticated using (org_id in (select app.view_orgs()));
create policy files_ins  on public.task_files for insert to authenticated
  with check (org_id in (select app.act_orgs()) and uploaded_by is not distinct from app.staff_in(org_id));
create policy files_del  on public.task_files for delete to authenticated
  using (app.can_edit_task(task_id) or uploaded_by in (select app.my_staff()));

create policy events_read on public.task_events for select to authenticated using (org_id in (select app.view_orgs()));
-- no write policy: rows come only from triggers

-- Attendance is personal: rahbar sees all, boshliq sees own departments, xodim sees self.
-- No write policies at all: changes go through kiosk_punch() / attendance_set(), which log every edit.
do $$ declare t text; begin
  foreach t in array array['attendance','attendance_edits','attendance_marks','acknowledgements'] loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (staff_id in (select app.managed_staff()) or staff_id in (select app.my_staff()))', t);
  end loop;
end $$;
-- no write policy on acknowledgements: rows come only from acknowledge()

create policy activity_read on public.activity for select to authenticated
  using (org_id in (select app.rahbar_orgs())
         or actor_staff in (select app.my_staff())
         or to_staff && array(select app.my_staff())
         or to_depts && array(select app.head_dept_ids()));

-- ═════════════════════════ integrity triggers ═════════════════════════
-- Child rows always inherit org_id from their task, and linked staff/departments must be in the same org.
create or replace function app.tg_child_org() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.tasks where id = new.task_id;
  if v_org is null then raise exception 'task not found' using errcode = '23503'; end if;
  if new.org_id is not null and new.org_id <> v_org then raise exception 'org mismatch' using errcode = '42501'; end if;
  new.org_id := v_org;
  if tg_table_name = 'task_depts' then
    if not exists (select 1 from public.departments where id = new.dept_id and org_id = v_org) then
      raise exception 'department from another org' using errcode = '42501'; end if;
  elsif tg_table_name = 'task_staff' then
    if not exists (select 1 from public.staff where id = new.staff_id and org_id = v_org) then
      raise exception 'staff from another org' using errcode = '42501'; end if;
  end if;
  return new;
end $$;

create trigger task_depts_org    before insert on public.task_depts    for each row execute function app.tg_child_org();
create trigger task_staff_org    before insert on public.task_staff    for each row execute function app.tg_child_org();
create trigger task_comments_org before insert on public.task_comments for each row execute function app.tg_child_org();
create trigger task_files_org    before insert on public.task_files    for each row execute function app.tg_child_org();

-- Structure rows must reference parents in the same org.
create or replace function app.tg_struct_org() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'departments' then
    if not exists (select 1 from public.branches where id = new.branch_id and org_id = new.org_id) then
      raise exception 'branch from another org' using errcode = '42501'; end if;
    if new.head_staff_id is not null and not exists (select 1 from public.staff where id = new.head_staff_id and org_id = new.org_id) then
      raise exception 'head from another org' using errcode = '42501'; end if;
  elsif tg_table_name = 'staff' then
    if not exists (select 1 from public.departments where id = new.dept_id and org_id = new.org_id) then
      raise exception 'department from another org' using errcode = '42501'; end if;
    if new.position_id is not null and not exists (select 1 from public.positions where id = new.position_id and org_id = new.org_id) then
      raise exception 'position from another org' using errcode = '42501'; end if;
  elsif tg_table_name = 'members' then
    if new.staff_id is not null and not exists (select 1 from public.staff where id = new.staff_id and org_id = new.org_id) then
      raise exception 'staff from another org' using errcode = '42501'; end if;
  end if;
  return new;
end $$;
create trigger departments_org before insert or update on public.departments for each row execute function app.tg_struct_org();
create trigger staff_org       before insert or update on public.staff       for each row execute function app.tg_struct_org();
create trigger members_org     before insert or update on public.members     for each row execute function app.tg_struct_org();

-- Never leave an org without a rahbar account, and a rahbar cannot demote or remove themself.
create or replace function app.tg_members_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'rahbar' and (tg_op = 'DELETE' or new.role <> 'rahbar') then
    if old.user_id = auth.uid() then raise exception 'cannot remove your own rahbar role' using errcode = '42501'; end if;
    if not exists (select 1 from public.members where org_id = old.org_id and role = 'rahbar' and user_id <> old.user_id) then
      raise exception 'org must keep at least one rahbar' using errcode = '42501'; end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger members_guard before update or delete on public.members for each row execute function app.tg_members_guard();

-- Tasks: stamp author and timestamps; an assignee who is not an editor may only change status/progress.
create or replace function app.tg_task_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare allowed text[] := array['status','progress','updated_at','done_at','last_comment_at'];
begin
  if auth.uid() is null then return new; end if;   -- server scripts (migration) keep their values
  if tg_op = 'INSERT' then
    new.created_by := app.staff_in(new.org_id);
    new.created_at := now();
  else
    if new.org_id <> old.org_id or new.id <> old.id then raise exception 'cannot move task' using errcode = '42501'; end if;
    if pg_trigger_depth() = 1 and not app.can_edit_task(old.id)
       and (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
      raise exception 'assignee may change only status and progress' using errcode = '42501';
    end if;
    new.created_by := old.created_by; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then new.done_at := now(); new.progress := 100; end if;
  if new.status <> 'done' then new.done_at := null; end if;
  return new;
end $$;
create trigger tasks_before before insert or update on public.tasks for each row execute function app.tg_task_before();

create or replace function app.tg_task_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.staff_in(new.org_id); v_to uuid[];
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    insert into public.task_events (org_id, task_id, actor_staff, actor_user, kind, detail)
    values (new.org_id, new.id, me, auth.uid(), 'create', jsonb_build_object('title', new.title));
    return new;
  end if;
  if pg_trigger_depth() > 1 then return new; end if;           -- e.g. last_comment_at bump
  if new.status <> old.status then
    insert into public.task_events (org_id, task_id, actor_staff, actor_user, kind, detail)
    values (new.org_id, new.id, me, auth.uid(), 'status', jsonb_build_object('from', old.status, 'to', new.status));
    select coalesce(array_agg(distinct x) filter (where x is distinct from me), '{}') into v_to
      from (select staff_id x from public.task_staff where task_id = new.id union select new.owner_staff_id) q;
    insert into public.activity (org_id, actor_staff, kind, task_id, body, to_staff)
    values (new.org_id, me, 'status', new.id, new.title, v_to);
  end if;
  if new.progress <> old.progress and new.status = old.status then
    insert into public.task_events (org_id, task_id, actor_staff, actor_user, kind, detail)
    values (new.org_id, new.id, me, auth.uid(), 'progress', jsonb_build_object('from', old.progress, 'to', new.progress));
  end if;
  if (new.title, new.description, new.owner_staff_id, new.start_date, new.due_date)
     is distinct from (old.title, old.description, old.owner_staff_id, old.start_date, old.due_date) then
    insert into public.task_events (org_id, task_id, actor_staff, actor_user, kind, detail)
    values (new.org_id, new.id, me, auth.uid(), 'edit', '{}');
  end if;
  return new;
end $$;
create trigger tasks_after after insert or update on public.tasks for each row execute function app.tg_task_after();

create or replace function app.tg_comment_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_title text; v_to uuid[]; v_depts uuid[];
begin
  if auth.uid() is null then return new; end if;
  update public.tasks set last_comment_at = new.created_at where id = new.task_id returning title into v_title;
  insert into public.task_events (org_id, task_id, actor_staff, actor_user, kind, detail)
  values (new.org_id, new.task_id, new.staff_id, new.user_id, 'comment', jsonb_build_object('comment', new.id));
  select coalesce(array_agg(staff_id) filter (where staff_id is distinct from new.staff_id), '{}') into v_to
    from public.task_staff where task_id = new.task_id;
  select coalesce(array_agg(dept_id), '{}') into v_depts from public.task_depts where task_id = new.task_id;
  insert into public.activity (org_id, actor_staff, kind, task_id, body, to_staff, to_depts)
  values (new.org_id, new.staff_id, 'comment', new.task_id, v_title, v_to, v_depts);
  return new;
end $$;
create trigger comments_after after insert on public.task_comments for each row execute function app.tg_comment_after();

create or replace function app.tg_file_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.task_files := coalesce(new, old);
begin
  if auth.uid() is null then return r; end if;
  if tg_op = 'DELETE' and not exists (select 1 from public.tasks where id = r.task_id) then return r; end if;
  insert into public.task_events (org_id, task_id, actor_staff, actor_user, kind, detail)
  values (r.org_id, r.task_id, app.staff_in(r.org_id), auth.uid(), 'file',
          jsonb_build_object('op', lower(tg_op), 'name', r.name));
  return r;
end $$;
create trigger files_after after insert or delete on public.task_files for each row execute function app.tg_file_after();

-- Being added to a task is a notification for that person.
create or replace function app.tg_assign_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me uuid;
begin
  if auth.uid() is null then return new; end if;
  me := app.staff_in(new.org_id);
  if new.staff_id is distinct from me then
    insert into public.activity (org_id, actor_staff, kind, task_id, body, to_staff)
    select new.org_id, me, 'assign', t.id, t.title, array[new.staff_id] from public.tasks t where t.id = new.task_id;
  end if;
  return new;
end $$;
create trigger task_staff_assign after insert on public.task_staff for each row execute function app.tg_assign_after();

-- Position text changed → new version, everyone must press "Tanishdim" again.
create or replace function app.tg_position_version() returns trigger
language plpgsql as $$
begin
  if (new.title, new.summary, new.duties, new.daily, new.kpi, new.rights, new.first_week, new.reports_to)
     is distinct from (old.title, old.summary, old.duties, old.daily, old.kpi, old.rights, old.first_week, old.reports_to) then
    new.version := old.version + 1; new.updated_at := now();
  else
    new.version := old.version;
  end if;
  return new;
end $$;
create trigger positions_version before update on public.positions for each row execute function app.tg_position_version();

create or replace function app.tg_charter_bump() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_org uuid := coalesce(new.org_id, old.org_id);
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and (new.title, new.body) is not distinct from (old.title, old.body) then return new; end if;
  insert into public.charter (org_id, version, updated_at, updated_by)
  values (v_org, 1, now(), app.staff_in(v_org))
  on conflict (org_id) do update set version = public.charter.version + 1, updated_at = now(), updated_by = app.staff_in(v_org);
  return coalesce(new, old);
end $$;
create trigger charter_sections_bump after insert or update or delete on public.charter_sections
  for each row when (pg_trigger_depth() = 0) execute function app.tg_charter_bump();

-- ═════════════════════════ actions (RPC) ═════════════════════════
create or replace function app.pin_hash(p_org uuid, p_pin text) returns text
language sql stable security definer set search_path = '' as $$
  select encode(extensions.hmac(convert_to(p_pin, 'UTF8'), s.pepper, 'sha256'), 'hex') from private.org_secrets s where s.org_id = p_org
$$;

-- Who am I? One call for the app to decide what to show.
create or replace function public.my_context(p_org uuid default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('org_id', m.org_id, 'role', app.role_in(m.org_id), 'staff_id', m.staff_id,
                            'head_depts', to_jsonb(app.head_depts(m.org_id)))
  from public.members m
  where m.user_id = auth.uid() and (p_org is null or m.org_id = p_org)
  order by m.created_at limit 1
$$;

-- rahbar sets or changes a person's PIN. PINs are unique within the org.
create or replace function public.set_pin(p_staff uuid, p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_len int;
begin
  select s.org_id, o.pin_len into v_org, v_len from public.staff s join public.orgs o on o.id = s.org_id where s.id = p_staff;
  if v_org is null or not app.is_rahbar(v_org) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_pin !~ ('^[0-9]{' || v_len || '}$') then raise exception 'PIN must be % digits', v_len using errcode = '22023'; end if;
  insert into private.org_secrets (org_id) values (v_org) on conflict do nothing;
  begin
    insert into private.staff_pins (staff_id, org_id, pin_hash) values (p_staff, v_org, app.pin_hash(v_org, p_pin))
    on conflict (staff_id) do update set pin_hash = excluded.pin_hash;
  exception when unique_violation then
    raise exception 'PIN already used by another person' using errcode = '23505';
  end;
end $$;

-- Kiosk: the terminal account sends a PIN; the server finds the person and records in/out.
-- 5 wrong PINs lock the terminal for 60 seconds.
create or replace function public.kiosk_punch(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_role app.member_role; v_staff uuid; v_name text; v_tz text;
        v_now timestamptz := now(); v_day date; v_time time; r public.attendance; a private.kiosk_attempts;
begin
  select m.org_id, m.role into v_org, v_role from public.members m where m.user_id = auth.uid() and m.role in ('terminal','rahbar') limit 1;
  if v_org is null then raise exception 'not a terminal' using errcode = '42501'; end if;
  select * into a from private.kiosk_attempts where user_id = auth.uid();
  if a.locked_until is not null and a.locked_until > v_now then
    return jsonb_build_object('ok', false, 'error', 'locked', 'retry_after', ceil(extract(epoch from a.locked_until - v_now)));
  end if;
  select p.staff_id, s.full_name into v_staff, v_name
    from private.staff_pins p join public.staff s on s.id = p.staff_id and s.active
   where p.org_id = v_org and p.pin_hash = app.pin_hash(v_org, p_pin);
  if v_staff is null then
    insert into private.kiosk_attempts as k (user_id, fails) values (auth.uid(), 1)
      on conflict (user_id) do update set fails = k.fails + 1,
        locked_until = case when k.fails + 1 >= 5 then v_now + interval '60 seconds' end;
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  delete from private.kiosk_attempts where user_id = auth.uid();

  select timezone into v_tz from public.orgs where id = v_org;
  v_day := (v_now at time zone v_tz)::date;
  v_time := date_trunc('minute', (v_now at time zone v_tz)::time);
  select * into r from public.attendance where staff_id = v_staff and day = v_day for update;
  if r.staff_id is null then
    insert into public.attendance (org_id, staff_id, day, in_time, source) values (v_org, v_staff, v_day, v_time, 'kiosk');
    insert into public.attendance_marks (org_id, staff_id, kind, at, source) values (v_org, v_staff, 'in', v_now, 'kiosk');
    return jsonb_build_object('ok', true, 'kind', 'in', 'name', v_name, 'time', to_char(v_time, 'HH24:MI'));
  elsif r.out_time is null and v_time - r.in_time < interval '2 minutes' then
    return jsonb_build_object('ok', true, 'kind', 'already_in', 'name', v_name, 'time', to_char(r.in_time, 'HH24:MI'));
  else
    update public.attendance set out_time = v_time, updated_at = v_now where staff_id = v_staff and day = v_day;
    insert into public.attendance_marks (org_id, staff_id, kind, at, source) values (v_org, v_staff, 'out', v_now, 'kiosk');
    return jsonb_build_object('ok', true, 'kind', 'out', 'name', v_name, 'time', to_char(v_time, 'HH24:MI'));
  end if;
end $$;

-- Leaving kiosk mode needs the PIN of a rahbar or a department head.
create or replace function public.kiosk_exit(p_pin text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.members where user_id = auth.uid() and role in ('terminal','rahbar') limit 1;
  if v_org is null then return false; end if;
  return exists (
    select 1 from private.staff_pins p join public.staff s on s.id = p.staff_id
    where p.org_id = v_org and p.pin_hash = app.pin_hash(v_org, p_pin)
      and (s.is_admin or exists (select 1 from public.departments d where d.head_staff_id = s.id)));
end $$;

-- Manual correction: rahbar (anyone) or boshliq (own departments), reason required, always logged.
create or replace function public.attendance_set(p_staff uuid, p_day date, p_in time, p_out time, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; r public.attendance;
begin
  select org_id into v_org from public.staff where id = p_staff;
  if v_org is null or not app.manages_staff(p_staff) then raise exception 'not allowed' using errcode = '42501'; end if;
  if coalesce(length(trim(p_reason)), 0) < 3 then raise exception 'reason required' using errcode = '22023'; end if;
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

-- "Tanishdim": always for yourself, always for the current version, only for your own position.
create or replace function public.acknowledge(p_kind app.doc_kind, p_org uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_staff uuid := app.staff_in(p_org); v_pos uuid; v_ver int;
begin
  if v_staff is null or not app.can_act(p_org) then raise exception 'no staff card linked' using errcode = '42501'; end if;
  if p_kind = 'charter' then
    select version into v_ver from public.charter where org_id = p_org;
  else
    select s.position_id, p.version into v_pos, v_ver from public.staff s join public.positions p on p.id = s.position_id where s.id = v_staff;
  end if;
  if v_ver is null then raise exception 'nothing to acknowledge' using errcode = '22023'; end if;
  insert into public.acknowledgements (org_id, staff_id, kind, position_id, version, user_id)
  values (p_org, v_staff, p_kind, v_pos, v_ver, auth.uid()) on conflict do nothing;
  return jsonb_build_object('kind', p_kind, 'version', v_ver);
end $$;

revoke execute on function public.set_pin(uuid, text), public.kiosk_punch(text), public.kiosk_exit(text),
  public.attendance_set(uuid, date, time, time, text), public.acknowledge(app.doc_kind, uuid),
  public.my_context(uuid) from public, anon;
grant execute on function public.set_pin(uuid, text), public.kiosk_punch(text), public.kiosk_exit(text),
  public.attendance_set(uuid, date, time, time, text), public.acknowledge(app.doc_kind, uuid),
  public.my_context(uuid) to authenticated;
revoke execute on all functions in schema app from public, anon;
grant execute on all functions in schema app to authenticated;
