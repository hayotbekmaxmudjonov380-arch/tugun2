-- Tugun 005: Telegram bot orqali to'g'ridan-to'g'ri bir martalik kod (OTP) bilan kirish va ro'yxatdan o'tish
-- Foydalanuvchi @tugunuzbot da /start bosganda 6 xonali kod oladi va saytga kiritib kiradi.

-- ───────────────────────── 1. Jadval ─────────────────────────

create table if not exists public.telegram_bot_otps (
  id                uuid primary key default gen_random_uuid(),
  telegram_chat_id  bigint not null,
  telegram_username text,
  full_name         text,
  code_hash         text not null,
  expires_at        timestamptz not null default (now() + interval '5 minutes'),
  used_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_tg_bot_otps_chat on public.telegram_bot_otps (telegram_chat_id, created_at desc);
create index if not exists idx_tg_bot_otps_hash on public.telegram_bot_otps (code_hash) where used_at is null;

alter table public.telegram_bot_otps enable row level security;
revoke all on public.telegram_bot_otps from authenticated, anon;

-- ───────────────────────── 2. Bot orqali kod berish (service_role) ─────────────────────────

create or replace function public.issue_telegram_bot_otp(
  p_chat_id bigint,
  p_username text default null,
  p_full_name text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_last_created timestamptz;
  v_hour_count   int;
  v_code         text;
  v_hash         text;
  v_try          int := 0;
  v_bytes        bytea;
  v_num          bigint;
begin
  if p_chat_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_chat_id');
  end if;

  -- Tez-tez spam bosishdan himoya (10 soniya)
  select created_at into v_last_created
    from public.telegram_bot_otps
   where telegram_chat_id = p_chat_id
   order by created_at desc limit 1;

  if v_last_created is not null and v_last_created > (now() - interval '10 seconds') then
    return jsonb_build_object(
      'ok', false,
      'error', 'rate_limit',
      'wait_sec', greatest(1, ceil(extract(epoch from (v_last_created + interval '10 seconds' - now()))))
    );
  end if;

  -- Soatiga ko'pi bilan 15 ta kod
  select count(*) into v_hour_count
    from public.telegram_bot_otps
   where telegram_chat_id = p_chat_id and created_at > (now() - interval '1 hour');

  if v_hour_count >= 15 then
    return jsonb_build_object('ok', false, 'error', 'hour_limit_exceeded');
  end if;

  -- Faol kodlar bilan to'qnashmaydigan 6 xonali kriptografik kod
  loop
    v_try := v_try + 1;
    v_bytes := extensions.gen_random_bytes(4);
    v_num := (get_byte(v_bytes, 0)::bigint << 24)
           + (get_byte(v_bytes, 1)::bigint << 16)
           + (get_byte(v_bytes, 2)::bigint << 8)
           +  get_byte(v_bytes, 3)::bigint;
    v_code := lpad(((v_num % 900000) + 100000)::text, 6, '0');
    v_hash := encode(extensions.digest(convert_to(v_code, 'UTF8'), 'sha256'), 'hex');

    exit when v_try >= 5 or not exists (
      select 1 from public.telegram_bot_otps
       where code_hash = v_hash and used_at is null and expires_at > now()
    );
  end loop;

  -- Shu foydalanuvchining eski ishlatilmagan kodlarini bekor qilish
  update public.telegram_bot_otps
     set expires_at = now()
   where telegram_chat_id = p_chat_id and used_at is null and expires_at > now();

  insert into public.telegram_bot_otps (telegram_chat_id, telegram_username, full_name, code_hash, expires_at)
  values (p_chat_id, p_username, p_full_name, v_hash, now() + interval '5 minutes');

  return jsonb_build_object('ok', true, 'code', v_code);
end $$;

-- ───────────────────────── 3. Saytda kodni tekshirish (service_role) ─────────────────────────

create or replace function public.verify_telegram_bot_otp(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_clean    text;
  v_hash     text;
  r_otp      public.telegram_bot_otps;
  v_org      uuid;
  v_staff    uuid;
  v_name     text;
  v_role     app.member_role;
  v_user_id  uuid;
begin
  v_clean := regexp_replace(coalesce(trim(p_code), ''), '[^0-9]', '', 'g');
  if length(v_clean) <> 6 then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  v_hash := encode(extensions.digest(convert_to(v_clean, 'UTF8'), 'sha256'), 'hex');

  select * into r_otp
    from public.telegram_bot_otps
   where code_hash = v_hash
     and used_at is null
     and expires_at > now()
   order by created_at desc
   limit 1
   for update;

  if r_otp.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;

  update public.telegram_bot_otps set used_at = now() where id = r_otp.id;

  -- Agar bu Telegram hisobi xodim kartasiga ulangan bo'lsa, org/staff/role ni olamiz
  select ti.org_id, ti.staff_id, s.full_name
    into v_org, v_staff, v_name
    from public.telegram_identities ti
    join public.staff s on s.id = ti.staff_id and s.active
   where ti.telegram_chat_id = r_otp.telegram_chat_id
   limit 1;

  if v_org is not null and v_staff is not null then
    select m.role, m.user_id into v_role, v_user_id
      from public.members m
     where m.org_id = v_org and m.staff_id = v_staff
     limit 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'chat_id', r_otp.telegram_chat_id,
    'username', r_otp.telegram_username,
    'full_name', coalesce(v_name, r_otp.full_name, 'Foydalanuvchi'),
    'org_id', v_org,
    'staff_id', v_staff,
    'role', coalesce(v_role, 'xodim'),
    'user_id', v_user_id
  );
end $$;

-- ───────────────────────── 4. Ruxsatlar ─────────────────────────

revoke execute on function public.issue_telegram_bot_otp(bigint, text, text),
  public.verify_telegram_bot_otp(text) from public, anon, authenticated;

grant execute on function public.issue_telegram_bot_otp(bigint, text, text) to service_role;
grant execute on function public.verify_telegram_bot_otp(text) to service_role;
