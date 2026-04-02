create schema if not exists chatbox_k12;

create extension if not exists pgcrypto;

create or replace function chatbox_k12.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists chatbox_k12.districts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbox_k12.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  default_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbox_k12.schools (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references chatbox_k12.districts(id) on delete cascade,
  slug text not null,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, slug)
);

create table if not exists chatbox_k12.classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references chatbox_k12.schools(id) on delete cascade,
  teacher_profile_id uuid references chatbox_k12.profiles(id) on delete set null,
  slug text not null,
  name text not null,
  grade_band text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

create table if not exists chatbox_k12.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references chatbox_k12.profiles(id) on delete cascade,
  role text not null check (role in ('central_admin', 'school_admin', 'teacher', 'student', 'auditor')),
  district_id uuid references chatbox_k12.districts(id) on delete cascade,
  school_id uuid references chatbox_k12.schools(id) on delete cascade,
  classroom_id uuid references chatbox_k12.classrooms(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists memberships_scope_unique
  on chatbox_k12.memberships (
    profile_id,
    role,
    coalesce(district_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(classroom_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index if not exists memberships_user_idx on chatbox_k12.memberships (profile_id);
create index if not exists memberships_school_idx on chatbox_k12.memberships (school_id);
create index if not exists memberships_classroom_idx on chatbox_k12.memberships (classroom_id);

create table if not exists chatbox_k12.plugin_manifests (
  id uuid primary key default gen_random_uuid(),
  plugin_id text not null,
  version text not null,
  display_name text not null,
  publisher_name text,
  publisher_email text,
  package_source text,
  package_sha256 text,
  signing_level text not null default 'community' check (signing_level in ('community', 'verified', 'district')),
  review_state text not null default 'submitted' check (review_state in ('submitted', 'validated', 'scanned', 'reviewed', 'approved', 'dpa_signed', 'active', 'revoked')),
  age_rating text,
  allowed_domains jsonb not null default '[]'::jsonb,
  required_scopes jsonb not null default '[]'::jsonb,
  data_profile jsonb not null default '{}'::jsonb,
  manifest jsonb not null default '{}'::jsonb,
  ai_review_summary jsonb not null default '{}'::jsonb,
  submitted_by uuid references chatbox_k12.profiles(id) on delete set null,
  reviewed_by uuid references chatbox_k12.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plugin_id, version)
);
create index if not exists plugin_manifests_state_idx on chatbox_k12.plugin_manifests (review_state);

create table if not exists chatbox_k12.plugin_review_events (
  id uuid primary key default gen_random_uuid(),
  plugin_manifest_id uuid not null references chatbox_k12.plugin_manifests(id) on delete cascade,
  event_type text not null,
  status_from text,
  status_to text,
  actor_profile_id uuid references chatbox_k12.profiles(id) on delete set null,
  notes text,
  ai_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists chatbox_k12.oauth_client_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  plugin_id text not null,
  district_id uuid references chatbox_k12.districts(id) on delete cascade,
  school_id uuid references chatbox_k12.schools(id) on delete cascade,
  client_id text not null,
  client_secret_ref text,
  auth_mode text not null default 'pkce' check (auth_mode in ('pkce', 'device_code', 'client_credentials', 'none')),
  redirect_uris jsonb not null default '[]'::jsonb,
  scopes jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  configured_by uuid references chatbox_k12.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists oauth_client_configs_scope_idx
  on chatbox_k12.oauth_client_configs (
    provider,
    plugin_id,
    coalesce(district_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists chatbox_k12.plugin_installations (
  id uuid primary key default gen_random_uuid(),
  plugin_manifest_id uuid not null references chatbox_k12.plugin_manifests(id) on delete cascade,
  district_id uuid references chatbox_k12.districts(id) on delete cascade,
  school_id uuid references chatbox_k12.schools(id) on delete cascade,
  classroom_id uuid references chatbox_k12.classrooms(id) on delete cascade,
  installed_by uuid references chatbox_k12.profiles(id) on delete set null,
  install_state text not null default 'pending' check (install_state in ('pending', 'approved', 'active', 'suspended', 'revoked')),
  policy jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plugin_installations_scope_idx
  on chatbox_k12.plugin_installations (
    coalesce(district_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(classroom_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists chatbox_k12.plugin_usage_audit_logs (
  id uuid primary key default gen_random_uuid(),
  plugin_installation_id uuid references chatbox_k12.plugin_installations(id) on delete set null,
  plugin_manifest_id uuid references chatbox_k12.plugin_manifests(id) on delete set null,
  profile_id uuid references chatbox_k12.profiles(id) on delete set null,
  district_id uuid references chatbox_k12.districts(id) on delete set null,
  school_id uuid references chatbox_k12.schools(id) on delete set null,
  classroom_id uuid references chatbox_k12.classrooms(id) on delete set null,
  severity text not null default 'info' check (severity in ('info', 'warn', 'high', 'critical')),
  risk_score numeric(5,2) not null default 0,
  event_type text not null,
  prompt_excerpt text,
  response_excerpt text,
  metadata jsonb not null default '{}'::jsonb,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists plugin_audit_logs_scope_idx
  on chatbox_k12.plugin_usage_audit_logs (
    coalesce(district_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(classroom_id, '00000000-0000-0000-0000-000000000000'::uuid),
    flagged,
    created_at desc
  );

create table if not exists chatbox_k12.scheduled_audit_runs (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'district', 'school')),
  district_id uuid references chatbox_k12.districts(id) on delete cascade,
  school_id uuid references chatbox_k12.schools(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function chatbox_k12.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, chatbox_k12
as $$
begin
  begin
    insert into chatbox_k12.profiles (id, email, full_name, avatar_url)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      new.raw_user_meta_data ->> 'avatar_url'
    )
    on conflict (id) do update
      set email = excluded.email,
          full_name = coalesce(excluded.full_name, chatbox_k12.profiles.full_name),
          avatar_url = coalesce(excluded.avatar_url, chatbox_k12.profiles.avatar_url),
          updated_at = now();
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_chatbox_k12 on auth.users;
create trigger on_auth_user_created_chatbox_k12
after insert on auth.users
for each row execute procedure chatbox_k12.handle_new_user();

create or replace function chatbox_k12.is_central_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, chatbox_k12
as $$
  select exists (
    select 1
    from chatbox_k12.memberships m
    where m.profile_id = auth.uid()
      and m.role = 'central_admin'
      and m.status = 'active'
  );
$$;

create or replace function chatbox_k12.belongs_to_school(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, chatbox_k12
as $$
  select exists (
    select 1
    from chatbox_k12.memberships m
    where m.profile_id = auth.uid()
      and m.status = 'active'
      and (
        m.school_id = target_school_id
        or exists (
          select 1
          from chatbox_k12.classrooms c
          where c.id = m.classroom_id and c.school_id = target_school_id
        )
      )
  );
$$;

create or replace function chatbox_k12.belongs_to_classroom(target_classroom_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, chatbox_k12
as $$
  select exists (
    select 1
    from chatbox_k12.memberships m
    where m.profile_id = auth.uid()
      and m.status = 'active'
      and m.classroom_id = target_classroom_id
  );
$$;

create or replace function chatbox_k12.can_manage_school(target_school_id uuid)
returns boolean
language sql
stable
as $$
  select chatbox_k12.is_central_admin() or exists (
    select 1
    from chatbox_k12.memberships m
    where m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('school_admin', 'teacher')
      and (
        m.school_id = target_school_id
        or exists (
          select 1 from chatbox_k12.classrooms c
          where c.id = m.classroom_id and c.school_id = target_school_id
        )
      )
  );
$$;

create or replace function chatbox_k12.can_manage_classroom(target_classroom_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, chatbox_k12
as $$
  select chatbox_k12.is_central_admin() or exists (
    select 1
    from chatbox_k12.memberships m
    where m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('school_admin', 'teacher')
      and (
        m.classroom_id = target_classroom_id
        or exists (
          select 1 from chatbox_k12.classrooms c
          where c.id = target_classroom_id and c.school_id = m.school_id
        )
      )
  );
$$;

create or replace function chatbox_k12.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth, chatbox_k12
as $$
  select exists (
    select 1 from chatbox_k12.memberships m
    where m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('central_admin', 'school_admin', 'teacher', 'auditor')
  );
$$;

drop trigger if exists districts_set_updated_at on chatbox_k12.districts;
create trigger districts_set_updated_at before update on chatbox_k12.districts for each row execute procedure chatbox_k12.set_updated_at();
drop trigger if exists profiles_set_updated_at on chatbox_k12.profiles;
create trigger profiles_set_updated_at before update on chatbox_k12.profiles for each row execute procedure chatbox_k12.set_updated_at();
drop trigger if exists schools_set_updated_at on chatbox_k12.schools;
create trigger schools_set_updated_at before update on chatbox_k12.schools for each row execute procedure chatbox_k12.set_updated_at();
drop trigger if exists classrooms_set_updated_at on chatbox_k12.classrooms;
create trigger classrooms_set_updated_at before update on chatbox_k12.classrooms for each row execute procedure chatbox_k12.set_updated_at();
drop trigger if exists memberships_set_updated_at on chatbox_k12.memberships;
create trigger memberships_set_updated_at before update on chatbox_k12.memberships for each row execute procedure chatbox_k12.set_updated_at();
drop trigger if exists plugin_manifests_set_updated_at on chatbox_k12.plugin_manifests;
create trigger plugin_manifests_set_updated_at before update on chatbox_k12.plugin_manifests for each row execute procedure chatbox_k12.set_updated_at();
drop trigger if exists oauth_client_configs_set_updated_at on chatbox_k12.oauth_client_configs;
create trigger oauth_client_configs_set_updated_at before update on chatbox_k12.oauth_client_configs for each row execute procedure chatbox_k12.set_updated_at();
drop trigger if exists plugin_installations_set_updated_at on chatbox_k12.plugin_installations;
create trigger plugin_installations_set_updated_at before update on chatbox_k12.plugin_installations for each row execute procedure chatbox_k12.set_updated_at();
drop trigger if exists scheduled_audit_runs_set_updated_at on chatbox_k12.scheduled_audit_runs;
create trigger scheduled_audit_runs_set_updated_at before update on chatbox_k12.scheduled_audit_runs for each row execute procedure chatbox_k12.set_updated_at();

alter table chatbox_k12.districts enable row level security;
alter table chatbox_k12.profiles enable row level security;
alter table chatbox_k12.schools enable row level security;
alter table chatbox_k12.classrooms enable row level security;
alter table chatbox_k12.memberships enable row level security;
alter table chatbox_k12.plugin_manifests enable row level security;
alter table chatbox_k12.plugin_review_events enable row level security;
alter table chatbox_k12.oauth_client_configs enable row level security;
alter table chatbox_k12.plugin_installations enable row level security;
alter table chatbox_k12.plugin_usage_audit_logs enable row level security;
alter table chatbox_k12.scheduled_audit_runs enable row level security;

drop policy if exists profiles_self_select on chatbox_k12.profiles;
create policy profiles_self_select on chatbox_k12.profiles for select using (id = auth.uid() or chatbox_k12.is_staff());
drop policy if exists profiles_self_update on chatbox_k12.profiles;
create policy profiles_self_update on chatbox_k12.profiles for update using (id = auth.uid() or chatbox_k12.is_staff()) with check (id = auth.uid() or chatbox_k12.is_staff());

drop policy if exists memberships_self_select on chatbox_k12.memberships;
create policy memberships_self_select on chatbox_k12.memberships for select using (profile_id = auth.uid() or chatbox_k12.is_staff());

drop policy if exists districts_staff_select on chatbox_k12.districts;
create policy districts_staff_select on chatbox_k12.districts for select using (chatbox_k12.is_staff());
drop policy if exists schools_members_select on chatbox_k12.schools;
create policy schools_members_select on chatbox_k12.schools for select using (chatbox_k12.belongs_to_school(id) or chatbox_k12.is_staff());
drop policy if exists classrooms_members_select on chatbox_k12.classrooms;
create policy classrooms_members_select on chatbox_k12.classrooms for select using (chatbox_k12.belongs_to_classroom(id) or chatbox_k12.can_manage_classroom(id) or chatbox_k12.is_staff());

drop policy if exists plugin_manifests_staff_all on chatbox_k12.plugin_manifests;
create policy plugin_manifests_staff_all on chatbox_k12.plugin_manifests for all using (chatbox_k12.is_staff()) with check (chatbox_k12.is_staff());
drop policy if exists plugin_review_events_staff_all on chatbox_k12.plugin_review_events;
create policy plugin_review_events_staff_all on chatbox_k12.plugin_review_events for all using (chatbox_k12.is_staff()) with check (chatbox_k12.is_staff());
drop policy if exists oauth_client_configs_staff_all on chatbox_k12.oauth_client_configs;
create policy oauth_client_configs_staff_all on chatbox_k12.oauth_client_configs for all using (chatbox_k12.is_staff()) with check (chatbox_k12.is_staff());
drop policy if exists plugin_installations_staff_all on chatbox_k12.plugin_installations;
create policy plugin_installations_staff_all on chatbox_k12.plugin_installations for all using (chatbox_k12.is_staff()) with check (chatbox_k12.is_staff());
drop policy if exists plugin_usage_audit_logs_staff_all on chatbox_k12.plugin_usage_audit_logs;
create policy plugin_usage_audit_logs_staff_all on chatbox_k12.plugin_usage_audit_logs for all using (chatbox_k12.is_staff()) with check (chatbox_k12.is_staff());
drop policy if exists scheduled_audit_runs_staff_all on chatbox_k12.scheduled_audit_runs;
create policy scheduled_audit_runs_staff_all on chatbox_k12.scheduled_audit_runs for all using (chatbox_k12.is_staff()) with check (chatbox_k12.is_staff());

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'chatbox-plugin-drops') then
    insert into storage.buckets (id, name, public)
    values ('chatbox-plugin-drops', 'chatbox-plugin-drops', false);
  end if;
end $$;


drop policy if exists chatbox_plugin_drops_authenticated_read on storage.objects;
create policy chatbox_plugin_drops_authenticated_read on storage.objects
for select to authenticated
using (bucket_id = 'chatbox-plugin-drops');

drop policy if exists chatbox_plugin_drops_staff_insert on storage.objects;
create policy chatbox_plugin_drops_staff_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'chatbox-plugin-drops' and chatbox_k12.is_staff());

drop policy if exists chatbox_plugin_drops_staff_update on storage.objects;
create policy chatbox_plugin_drops_staff_update on storage.objects
for update to authenticated
using (bucket_id = 'chatbox-plugin-drops' and chatbox_k12.is_staff())
with check (bucket_id = 'chatbox-plugin-drops' and chatbox_k12.is_staff());

drop policy if exists chatbox_plugin_drops_staff_delete on storage.objects;
create policy chatbox_plugin_drops_staff_delete on storage.objects
for delete to authenticated
using (bucket_id = 'chatbox-plugin-drops' and chatbox_k12.is_staff());

create or replace function public.chatbox_k12_bootstrap()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, chatbox_k12
as $$
declare
  current_profile chatbox_k12.profiles%rowtype;
  primary_membership chatbox_k12.memberships%rowtype;
  district_row chatbox_k12.districts%rowtype;
  school_rows jsonb := '[]'::jsonb;
  classroom_rows jsonb := '[]'::jsonb;
  installation_rows jsonb := '[]'::jsonb;
  school_ids uuid[] := '{}';
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into current_profile
  from chatbox_k12.profiles
  where id = auth.uid();

  select * into primary_membership
  from chatbox_k12.memberships
  where profile_id = auth.uid()
    and status = 'active'
  order by case role
    when 'central_admin' then 4
    when 'school_admin' then 3
    when 'teacher' then 2
    when 'student' then 1
    else 0
  end desc,
  created_at asc
  limit 1;

  if primary_membership.id is null then
    return null;
  end if;

  if primary_membership.district_id is not null then
    select * into district_row
    from chatbox_k12.districts
    where id = primary_membership.district_id;
  end if;

  with scoped_schools as (
    select s.*
    from chatbox_k12.schools s
    where (
      primary_membership.role = 'central_admin'
      and s.district_id = primary_membership.district_id
    )
    or (
      primary_membership.role <> 'central_admin'
      and s.id = primary_membership.school_id
    )
    order by s.name asc
  )
  select coalesce(jsonb_agg(to_jsonb(scoped_schools)), '[]'::jsonb), coalesce(array_agg(id), '{}')
  into school_rows, school_ids
  from scoped_schools;

  with scoped_classrooms as (
    select c.*
    from chatbox_k12.classrooms c
    where c.school_id = any(school_ids)
      and (
        primary_membership.role = 'central_admin'
        or primary_membership.role = 'school_admin'
        or (primary_membership.role = 'teacher' and c.teacher_profile_id = auth.uid())
        or (primary_membership.role = 'student' and c.id = primary_membership.classroom_id)
      )
    order by c.name asc
  )
  select coalesce(jsonb_agg(to_jsonb(scoped_classrooms)), '[]'::jsonb)
  into classroom_rows
  from scoped_classrooms;

  with scoped_installations as (
    select
      i.*,
      m.plugin_id,
      m.package_source,
      m.review_state,
      m.manifest,
      m.ai_review_summary,
      m.submitted_by,
      m.reviewed_by,
      m.reviewed_at
    from chatbox_k12.plugin_installations i
    join chatbox_k12.plugin_manifests m on m.id = i.plugin_manifest_id
    where i.district_id = primary_membership.district_id
    order by i.created_at desc
  )
  select coalesce(jsonb_agg(to_jsonb(scoped_installations)), '[]'::jsonb)
  into installation_rows
  from scoped_installations;

  return jsonb_build_object(
    'profile', to_jsonb(current_profile),
    'membership', to_jsonb(primary_membership),
    'district', case when district_row.id is null then null else to_jsonb(district_row) end,
    'schools', school_rows,
    'classrooms', classroom_rows,
    'installations', installation_rows
  );
end;
$$;

grant execute on function public.chatbox_k12_bootstrap() to authenticated;

create or replace function public.chatbox_k12_submit_plugin_request(
  input_manifest jsonb,
  input_school_id uuid,
  input_package_source text,
  input_safety_score numeric,
  input_safety_findings jsonb,
  input_requested_by_label text,
  input_chatbox_status text,
  input_enable_for_current_scope boolean,
  input_source_name text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, auth, chatbox_k12
as $$
declare
  current_profile chatbox_k12.profiles%rowtype;
  primary_membership chatbox_k12.memberships%rowtype;
  manifest_row chatbox_k12.plugin_manifests%rowtype;
  installation_row chatbox_k12.plugin_installations%rowtype;
  scoped_classroom_ids uuid[] := '{}';
  manifest_id_text text := coalesce(input_manifest->>'id', '');
  manifest_version text := coalesce(input_manifest->>'version', '1.0.0');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into current_profile from chatbox_k12.profiles where id = auth.uid();
  select * into primary_membership
  from chatbox_k12.memberships
  where profile_id = auth.uid() and status = 'active'
  order by case role when 'central_admin' then 4 when 'school_admin' then 3 when 'teacher' then 2 when 'student' then 1 else 0 end desc
  limit 1;

  if primary_membership.id is null then
    raise exception 'No active membership';
  end if;

  if primary_membership.role = 'teacher' then
    select coalesce(array_agg(id), '{}') into scoped_classroom_ids
    from chatbox_k12.classrooms
    where school_id = input_school_id and teacher_profile_id = auth.uid();
  elsif primary_membership.classroom_id is not null then
    scoped_classroom_ids := array[primary_membership.classroom_id];
  end if;

  insert into chatbox_k12.plugin_manifests (
    plugin_id,
    version,
    display_name,
    package_source,
    signing_level,
    review_state,
    age_rating,
    allowed_domains,
    required_scopes,
    data_profile,
    manifest,
    ai_review_summary,
    submitted_by,
    reviewed_by,
    reviewed_at
  ) values (
    manifest_id_text,
    manifest_version,
    coalesce(input_manifest->>'name', manifest_id_text),
    input_package_source,
    coalesce(input_manifest->>'signatureType', 'community'),
    case
      when input_chatbox_status = 'active' then 'active'
      when input_chatbox_status = 'approved' then 'approved'
      when input_chatbox_status = 'quarantined' then 'reviewed'
      else 'submitted'
    end,
    case when jsonb_typeof(input_manifest->'targetGrades') = 'array' then array_to_string(array(select jsonb_array_elements_text(input_manifest->'targetGrades')), ', ') else null end,
    coalesce(input_manifest->'allowedDomains', '[]'::jsonb),
    coalesce(input_manifest->'auth'->'scopes', '[]'::jsonb),
    coalesce(input_manifest->'dataProfile', '{}'::jsonb),
    input_manifest,
    jsonb_build_object('score', input_safety_score, 'findings', coalesce(input_safety_findings, '[]'::jsonb)),
    auth.uid(),
    case when input_chatbox_status in ('approved', 'active') then auth.uid() else null end,
    case when input_chatbox_status in ('approved', 'active') then now() else null end
  )
  on conflict (plugin_id, version) do update
    set display_name = excluded.display_name,
        package_source = coalesce(excluded.package_source, chatbox_k12.plugin_manifests.package_source),
        review_state = excluded.review_state,
        allowed_domains = excluded.allowed_domains,
        required_scopes = excluded.required_scopes,
        data_profile = excluded.data_profile,
        manifest = excluded.manifest,
        ai_review_summary = excluded.ai_review_summary,
        reviewed_by = excluded.reviewed_by,
        reviewed_at = excluded.reviewed_at,
        updated_at = now()
  returning * into manifest_row;

  insert into chatbox_k12.plugin_installations (
    plugin_manifest_id,
    district_id,
    school_id,
    classroom_id,
    installed_by,
    install_state,
    policy,
    approved_at,
    activated_at
  ) values (
    manifest_row.id,
    primary_membership.district_id,
    input_school_id,
    null,
    auth.uid(),
    case when input_chatbox_status = 'active' then 'active' when input_chatbox_status = 'approved' then 'approved' else 'pending' end,
    jsonb_build_object(
      'chatboxStatus', input_chatbox_status,
      'requestedByLabel', input_requested_by_label,
      'safetyScore', input_safety_score,
      'safetyFindings', coalesce(input_safety_findings, '[]'::jsonb),
      'classroomIds', to_jsonb(scoped_classroom_ids),
      'sourceName', input_source_name,
      'enableForCurrentScope', input_enable_for_current_scope
    ),
    case when input_chatbox_status in ('approved', 'active') then now() else null end,
    case when input_chatbox_status = 'active' then now() else null end
  )
  returning * into installation_row;

  insert into chatbox_k12.plugin_review_events (
    plugin_manifest_id,
    event_type,
    status_from,
    status_to,
    actor_profile_id,
    notes,
    ai_report
  ) values (
    manifest_row.id,
    'submitted',
    null,
    input_chatbox_status,
    auth.uid(),
    input_source_name,
    jsonb_build_object('score', input_safety_score, 'findings', coalesce(input_safety_findings, '[]'::jsonb))
  );

  return jsonb_build_object(
    'recordId', installation_row.id,
    'pluginId', manifest_row.plugin_id,
    'packageSource', manifest_row.package_source,
    'status', input_chatbox_status
  );
end;
$$;

grant execute on function public.chatbox_k12_submit_plugin_request(jsonb, uuid, text, numeric, jsonb, text, text, boolean, text) to authenticated;

create or replace function public.chatbox_k12_review_plugin_request(
  input_record_id uuid,
  input_next_status text,
  input_rejection_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = public, auth, chatbox_k12
as $$
declare
  installation_row chatbox_k12.plugin_installations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into installation_row from chatbox_k12.plugin_installations where id = input_record_id;
  if installation_row.id is null then
    raise exception 'Install record not found';
  end if;

  update chatbox_k12.plugin_installations
  set install_state = case when input_next_status = 'active' then 'active' when input_next_status = 'approved' then 'approved' else 'revoked' end,
      policy = coalesce(policy, '{}'::jsonb) || jsonb_build_object('chatboxStatus', input_next_status, 'rejectionReason', input_rejection_reason),
      approved_at = case when input_next_status in ('approved', 'active') then now() else approved_at end,
      activated_at = case when input_next_status = 'active' then now() else activated_at end,
      updated_at = now()
  where id = input_record_id;

  update chatbox_k12.plugin_manifests
  set review_state = case when input_next_status = 'active' then 'active' when input_next_status = 'approved' then 'approved' else 'revoked' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = installation_row.plugin_manifest_id;

  insert into chatbox_k12.plugin_review_events (
    plugin_manifest_id,
    event_type,
    status_from,
    status_to,
    actor_profile_id,
    notes,
    ai_report
  ) values (
    installation_row.plugin_manifest_id,
    input_next_status,
    coalesce(installation_row.policy->>'chatboxStatus', installation_row.install_state),
    input_next_status,
    auth.uid(),
    input_rejection_reason,
    '{}'::jsonb
  );
end;
$$;

grant execute on function public.chatbox_k12_review_plugin_request(uuid, text, text) to authenticated;

create or replace function public.chatbox_k12_set_plugin_scope(
  input_plugin_id text,
  input_enabled boolean
)
returns void
language plpgsql
security invoker
set search_path = public, auth, chatbox_k12
as $$
declare
  installation_row chatbox_k12.plugin_installations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select i.* into installation_row
  from chatbox_k12.plugin_installations i
  join chatbox_k12.plugin_manifests m on m.id = i.plugin_manifest_id
  where m.plugin_id = input_plugin_id
    and i.installed_by = auth.uid()
  order by i.created_at desc
  limit 1;

  if installation_row.id is null then
    raise exception 'Install record not found';
  end if;

  update chatbox_k12.plugin_installations
  set install_state = case when input_enabled then 'active' else 'approved' end,
      policy = coalesce(policy, '{}'::jsonb) || jsonb_build_object('chatboxStatus', case when input_enabled then 'active' else 'approved' end),
      approved_at = now(),
      activated_at = case when input_enabled then now() else null end,
      updated_at = now()
  where id = installation_row.id;
end;
$$;

grant execute on function public.chatbox_k12_set_plugin_scope(text, boolean) to authenticated;


grant usage on schema chatbox_k12 to authenticated;
grant select, insert, update, delete on all tables in schema chatbox_k12 to authenticated;
grant usage, select on all sequences in schema chatbox_k12 to authenticated;
