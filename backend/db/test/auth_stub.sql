-- Emulates the parts of Supabase the schema relies on, so the same SQL can be tested on plain Postgres.
-- On Supabase these already exist: DO NOT run this file there.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
-- Supabase reads the user id from the request JWT; tests set it with set_config('request.jwt.claim.sub', ...).
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges for role tugun_owner in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role tugun_owner in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role tugun_owner in schema public grant execute on functions to anon, authenticated, service_role;


-- test harness creates fake logins
grant select, insert on auth.users to tugun_owner;
