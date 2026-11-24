-- Tugun 004: Telegram orqali xavfsiz autentifikatsiya (bir martalik kod)
--   1. telegram_identities: xodim kartasi va telegram_chat_id bog'lanishi
--   2. telegram_invites: rahbar tomonidan yaratiladigan bir martalik takliflar
--   3. login_codes: 6 xonali bir martalik tasdiqlash kodlari (HMAC-SHA256, 5 daqiqa)

-- ───────────────────────── 1. Jadvallar ─────────────────────────

-- Xodimning Telegram identifikatori
create table if not exists public.telegram_identities (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.orgs on delete cascade,
  staff_id          uuid not null references public.staff on delete cascade,
  telegram_chat_id  bigint not null unique,
  telegram_username text,
  linked_at         timestamptz not null default now(),
  unique (org_id, staff_id)
);
create index if not exists idx_tg_identities_staff on public.telegram_identities (staff_id);
create index if not exists idx_tg_identities_org on public.telegram_identities (org_id);

-- Bir martalik taklif havolalari (rahbar yaratadi, 24 soat amal qiladi)
create table if not exists public.telegram_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs on delete cascade,
  staff_id    uuid not null references public.staff on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  used_at     timestamptz,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  unique (org_id, token_hash)
);
create index if not exists idx_tg_invites_org on public.telegram_invites (org_id);
create index if not exists idx_tg_invites_staff on public.telegram_invites (staff_id);

-- Bir martalik kirish kodlari (HMAC-SHA256, 5 daqiqa amal qiladi)
create table if not exists public.login_codes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs on delete cascade,
  identity_id uuid not null references public.telegram_identities on delete cascade,
  code_hash   text not null,
  expires_at  timestamptz not null default (now() + interval '5 minutes'),
  attempts    int not null default 0 check (attempts between 0 and 10),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_login_codes_identity on public.login_codes (identity_id);
create index if not exists idx_login_codes_org on public.login_codes (org_id);

-- ───────────────────────── 2. Row Level Security (RLS) ─────────────────────────

alter table public.telegram_identities enable row level security;
alter table public.telegram_invites enable row level security;
alter table public.login_codes enable row level security;

-- telegram_identities: rahbar butun org'ni ko'radi, xodim faqat o'zinikini
create policy tg_identities_read on public.telegram_identities for select to authenticated
  using (org_id in (select app.rahbar_orgs()) or staff_id in (select app.my_staff()));
-- To'g'ridan-to'g'ri yozish ruxsat etilmaydi (faqat security definer RPC yoki service_role)

-- telegram_invites: faqat rahbar ko'radi
create policy tg_invites_read on public.telegram_invites for select to authenticated
  using (org_id in (select app.rahbar_orgs()));
-- Mijoz token_hash ustunini o'qiy olmasligi uchun ruxsat bekor qilinadi
revoke select (token_hash) on public.telegram_invites from authenticated, anon;

-- login_codes: mijoz umuman o'qiy olmaydi (maxfiy kodlar bazasi)
-- authenticated va anon uchun hech qanday select/insert/update/delete policy berilmaydi
revoke all on public.login_codes from authenticated, anon;

-- ───────────────────────── 3. Triggers & Cheklovlar ─────────────────────────

-- Staff va org_id bir xil tashkilotga tegishli bo'lishini tekshirish
create or replace function app.tg_check_telegram_staff_org() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.staff where id = new.staff_id and org_id = new.org_id) then
    raise exception 'staff from another org' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger tg_identities_staff_org before insert or update on public.telegram_identities
  for each row execute function app.tg_check_telegram_staff_org();

create trigger tg_invites_staff_org before insert or update on public.telegram_invites
  for each row execute function app.tg_check_telegram_staff_org();

-- ───────────────────────── 4. RPC Funksiyalar ─────────────────────────

-- Rahbar xodim uchun bir martalik Telegram taklif tokenini yaratadi
create or replace function public.create_telegram_invite(p_staff uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_token text;
  v_hash text;
  v_name text;
begin
  select s.org_id, s.full_name into v_org, v_name from public.staff s where s.id = p_staff and s.active;
  if v_org is null then
    raise exception 'staff not found or inactive' using errcode = '22023';
  end if;
  if not app.is_rahbar(v_org) then
    raise exception 'only rahbar can create telegram invite' using errcode = '42501';
  end if;

  -- 24 baytlik (48 belgi) xavfsiz tasodifiy token
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_hash := app.pin_hash(v_org, v_token);

  -- Eski ishlatilmagan takliflarni bekor qilish (muddati o'tgan qilib qo'yish)
  update public.telegram_invites
     set expires_at = now()
   where org_id = v_org and staff_id = p_staff and used_at is null and expires_at > now();

  insert into public.telegram_invites (org_id, staff_id, token_hash, expires_at, created_by)
  values (v_org, p_staff, v_hash, now() + interval '24 hours', auth.uid());

  -- Audit uchun aktivlikka yozish
  insert into public.activity (org_id, actor_staff, kind, body, to_staff)
  values (v_org, app.staff_in(v_org), 'telegram_invite', v_name, array[p_staff]);

  return v_token;
end $$;

-- Webhook orqali token tekshirilib, chat_id xodim kartasi bilan bog'lanadi (service_role yoki definer)
create or replace function public.claim_telegram_invite(
  p_token text,
  p_chat_id bigint,
  p_username text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_inv_id uuid;
  v_org uuid;
  v_staff uuid;
  v_name text;
begin
  if p_token is null or trim(p_token) = '' or p_chat_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_params');
  end if;

  -- Barcha org_id lar ichidan ushbu token hash'iga mos keluvchi faol taklifni qidiramiz
  select i.id, i.org_id, i.staff_id, s.full_name
    into v_inv_id, v_org, v_staff, v_name
    from public.telegram_invites i
    join public.staff s on s.id = i.staff_id and s.active
   where i.used_at is null
     and i.expires_at > now()
     and i.token_hash = app.pin_hash(i.org_id, trim(p_token))
   limit 1;

  if v_inv_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;

  -- Ushbu chat_id boshqa xodimga ulangan bo'lsa, eskisini yangilaymiz yoki almashtiramiz
  insert into public.telegram_identities (org_id, staff_id, telegram_chat_id, telegram_username, linked_at)
  values (v_org, v_staff, p_chat_id, p_username, now())
  on conflict (telegram_chat_id) do update
    set org_id = excluded.org_id,
        staff_id = excluded.staff_id,
        telegram_username = excluded.telegram_username,
        linked_at = now();

  -- Taklif ishlatildi deb belgilaymiz
  update public.telegram_invites set used_at = now() where id = v_inv_id;

  -- Audit log
  insert into public.activity (org_id, kind, body, to_staff)
  values (v_org, 'telegram_linked', v_name, array[v_staff]);

  return jsonb_build_object('ok', true, 'org_id', v_org, 'staff_id', v_staff, 'full_name', v_name);
end $$;

-- 6 xonali tasodifiy kirish kodi yaratish va saqlash (faqat service_role yoki Edge Function chaqiradi)
create or replace function public.create_login_code(p_identifier text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_clean text;
  v_identity_id uuid;
  v_org uuid;
  v_staff uuid;
  v_chat_id bigint;
  v_name text;
  v_code text;
  v_hash text;
  v_last_created timestamptz;
  v_hour_count int;
begin
  v_clean := regexp_replace(trim(p_identifier), '[^0-9a-zA-Z_]', '', 'g');
  if length(v_clean) < 3 then
    return jsonb_build_object('ok', false, 'error', 'invalid_identifier');
  end if;

  -- Identifikator orqali xodimni qidirish (telefon, telegram_chat_id yoki staff_id)
  select ti.id, ti.org_id, ti.staff_id, ti.telegram_chat_id, s.full_name
    into v_identity_id, v_org, v_staff, v_chat_id, v_name
    from public.telegram_identities ti
    join public.staff s on s.id = ti.staff_id and s.active
   where (ti.telegram_chat_id::text = v_clean
      or regexp_replace(coalesce(s.phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_clean, '[^0-9]', '', 'g')
      or ti.staff_id::text = v_clean)
   limit 1;

  -- Xavfsizlik: foydalanuvchi mavjud bo'lmasa ham bir xil javob qaytaramiz (enumeratsiyaga qarshi)
  if v_identity_id is null then
    return jsonb_build_object('ok', true, 'queued', false, 'msg', 'kod_yuborildi');
  end if;

  -- Rate limit: daqiqasiga ko'pi bilan 1 ta kod
  select created_at into v_last_created
    from public.login_codes
   where identity_id = v_identity_id
   order by created_at desc limit 1;

  if v_last_created is not null and v_last_created > (now() - interval '60 seconds') then
    return jsonb_build_object('ok', false, 'error', 'rate_limit', 'wait_sec', ceil(extract(epoch from (v_last_created + interval '60 seconds' - now()))));
  end if;

  -- Rate limit: soatiga ko'pi bilan 5 ta kod
  select count(*) into v_hour_count
    from public.login_codes
   where identity_id = v_identity_id and created_at > (now() - interval '1 hour');

  if v_hour_count >= 5 then
    return jsonb_build_object('ok', false, 'error', 'hour_limit_exceeded');
  end if;

  -- 6 xonali kriptografik tasodifiy kod
  v_code := lpad(((abs(get_byte(extensions.gen_random_bytes(4), 0) * 16777216 +
                       get_byte(extensions.gen_random_bytes(4), 1) * 65536 +
                       get_byte(extensions.gen_random_bytes(4), 2) * 256 +
                       get_byte(extensions.gen_random_bytes(4), 3)) % 900000) + 100000)::text, 6, '0');

  v_hash := app.pin_hash(v_org, v_code);

  -- Eski ishlatilmagan kodlarni bekor qilish
  update public.login_codes
     set expires_at = now()
   where identity_id = v_identity_id and used_at is null and expires_at > now();

  insert into public.login_codes (org_id, identity_id, code_hash, expires_at)
  values (v_org, v_identity_id, v_hash, now() + interval '5 minutes');

  -- Edge function Telegram orqali yuborishi uchun ma'lumotlarni qaytaramiz
  return jsonb_build_object(
    'ok', true,
    'queued', true,
    'chat_id', v_chat_id,
    'code', v_code,
    'full_name', v_name,
    'org_id', v_org,
    'staff_id', v_staff
  );
end $$;

-- 6 xonali kirish kodini tekshirish (faqat service_role yoki Edge Function chaqiradi)
create or replace function public.verify_login_code(p_identifier text, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_clean text;
  v_identity_id uuid;
  v_org uuid;
  v_staff uuid;
  v_name text;
  r_code public.login_codes;
  v_hash text;
  v_role app.member_role;
  v_user_id uuid;
begin
  v_clean := regexp_replace(trim(p_identifier), '[^0-9a-zA-Z_]', '', 'g');
  if length(v_clean) < 3 or length(trim(p_code)) <> 6 then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select ti.id, ti.org_id, ti.staff_id, s.full_name
    into v_identity_id, v_org, v_staff, v_name
    from public.telegram_identities ti
    join public.staff s on s.id = ti.staff_id and s.active
   where (ti.telegram_chat_id::text = v_clean
      or regexp_replace(coalesce(s.phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_clean, '[^0-9]', '', 'g')
      or ti.staff_id::text = v_clean)
   limit 1;

  if v_identity_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Eng so'nggi faol kodni qidiramiz
  select * into r_code
    from public.login_codes
   where identity_id = v_identity_id
   order by created_at desc limit 1 for update;

  if r_code.id is null or r_code.used_at is not null or r_code.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired_or_used');
  end if;

  -- 5 ta noto'g'ri urinishdan keyin bloklash
  if r_code.attempts >= 5 then
    update public.login_codes set expires_at = now() where id = r_code.id;
    return jsonb_build_object('ok', false, 'error', 'blocked_too_many_attempts');
  end if;

  v_hash := app.pin_hash(v_org, trim(p_code));

  if r_code.code_hash <> v_hash then
    update public.login_codes set attempts = r_code.attempts + 1 where id = r_code.id;
    if r_code.attempts + 1 >= 5 then
      update public.login_codes set expires_at = now() where id = r_code.id;
      return jsonb_build_object('ok', false, 'error', 'blocked_too_many_attempts');
    end if;
    return jsonb_build_object('ok', false, 'error', 'wrong_code', 'remaining', 5 - (r_code.attempts + 1));
  end if;

  -- Kod to'g'ri! Ishlatildi deb belgilaymiz
  update public.login_codes set used_at = now() where id = r_code.id;

  -- Members jadvalidan xodimning rolini aniqlaymiz
  select m.role, m.user_id into v_role, v_user_id
    from public.members m
   where m.org_id = v_org and m.staff_id = v_staff limit 1;

  return jsonb_build_object(
    'ok', true,
    'org_id', v_org,
    'staff_id', v_staff,
    'full_name', v_name,
    'role', coalesce(v_role, 'xodim'),
    'user_id', v_user_id
  );
end $$;

-- Ruxsatlar
revoke execute on function public.create_telegram_invite(uuid),
  public.claim_telegram_invite(text, bigint, text),
  public.create_login_code(text),
  public.verify_login_code(text, text) from public, anon;

-- Faqat authenticated foydalanuvchilar create_telegram_invite ni chaqira oladi
grant execute on function public.create_telegram_invite(uuid) to authenticated;

-- claim_telegram_invite, create_login_code va verify_login_code service_role orqali chaqiriladi
grant execute on function public.claim_telegram_invite(text, bigint, text) to service_role;
grant execute on function public.create_login_code(text) to service_role;
grant execute on function public.verify_login_code(text, text) to service_role;
