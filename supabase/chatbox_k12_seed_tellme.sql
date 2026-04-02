create extension if not exists pgcrypto;

do $$
declare
  district_admin_id uuid := coalesce((select id from auth.users where email = 'district-admin@westfield.edu'), gen_random_uuid());
  school_admin_id uuid := coalesce((select id from auth.users where email = 'school-admin@westfield.edu'), gen_random_uuid());
  teacher_id uuid := coalesce((select id from auth.users where email = 'teacher@westfield.edu'), gen_random_uuid());
  student_id uuid := coalesce((select id from auth.users where email = 'student@westfield.edu'), gen_random_uuid());
  v_district_id uuid;
  v_lincoln_id uuid;
  v_washington_id uuid;
  v_science_class_id uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', district_admin_id, 'authenticated', 'authenticated', 'district-admin@westfield.edu',
    crypt('password', gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', 'Jordan Rivera', 'login_alias', 'district-admin', 'username', 'district-admin'),
    now(), now(), false, false
  ) on conflict (id) do update
    set encrypted_password = crypt('password', gen_salt('bf')),
        email = excluded.email,
        email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = now();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', school_admin_id, 'authenticated', 'authenticated', 'school-admin@westfield.edu',
    crypt('password', gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', 'Priya Patel', 'login_alias', 'school-admin', 'username', 'school-admin'),
    now(), now(), false, false
  ) on conflict (id) do update
    set encrypted_password = crypt('password', gen_salt('bf')),
        email = excluded.email,
        email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = now();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', teacher_id, 'authenticated', 'authenticated', 'teacher@westfield.edu',
    crypt('password', gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', 'Maya Chen', 'login_alias', 'teacher', 'username', 'teacher'),
    now(), now(), false, false
  ) on conflict (id) do update
    set encrypted_password = crypt('password', gen_salt('bf')),
        email = excluded.email,
        email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = now();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', student_id, 'authenticated', 'authenticated', 'student@westfield.edu',
    crypt('password', gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', 'Alex Johnson', 'login_alias', 'student', 'username', 'student'),
    now(), now(), false, false
  ) on conflict (id) do update
    set encrypted_password = crypt('password', gen_salt('bf')),
        email = excluded.email,
        email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = now();

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  values (gen_random_uuid(), district_admin_id, jsonb_build_object('sub', district_admin_id::text, 'email', 'district-admin@westfield.edu'), 'email', district_admin_id::text, now(), now())
  on conflict (provider, provider_id) do update set identity_data = excluded.identity_data, updated_at = now();

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  values (gen_random_uuid(), school_admin_id, jsonb_build_object('sub', school_admin_id::text, 'email', 'school-admin@westfield.edu'), 'email', school_admin_id::text, now(), now())
  on conflict (provider, provider_id) do update set identity_data = excluded.identity_data, updated_at = now();

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  values (gen_random_uuid(), teacher_id, jsonb_build_object('sub', teacher_id::text, 'email', 'teacher@westfield.edu'), 'email', teacher_id::text, now(), now())
  on conflict (provider, provider_id) do update set identity_data = excluded.identity_data, updated_at = now();

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  values (gen_random_uuid(), student_id, jsonb_build_object('sub', student_id::text, 'email', 'student@westfield.edu'), 'email', student_id::text, now(), now())
  on conflict (provider, provider_id) do update set identity_data = excluded.identity_data, updated_at = now();

  insert into chatbox_k12.profiles (id, email, full_name, metadata)
  values
    (district_admin_id, 'district-admin@westfield.edu', 'Jordan Rivera', jsonb_build_object('loginAlias', 'district-admin')),
    (school_admin_id, 'school-admin@westfield.edu', 'Priya Patel', jsonb_build_object('loginAlias', 'school-admin')),
    (teacher_id, 'teacher@westfield.edu', 'Maya Chen', jsonb_build_object('loginAlias', 'teacher')),
    (student_id, 'student@westfield.edu', 'Alex Johnson', jsonb_build_object('loginAlias', 'student'))
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        metadata = excluded.metadata,
        updated_at = now();

  insert into chatbox_k12.districts (slug, name, settings)
  values (
    'westfield-unified',
    'Westfield Unified School District',
    jsonb_build_object(
      'allowedPlugins', jsonb_build_array('chess', 'weather', 'spotify', 'github', 'geogebra', 'phet', 'google-maps', 'wolfram'),
      'blockedPlugins', jsonb_build_array(),
      'autoApproveThreshold', 90,
      'requireDpa', true,
      'defaultContentSafetyLevel', 'strict'
    )
  ) on conflict (slug) do update
    set name = excluded.name,
        settings = excluded.settings,
        updated_at = now();

  select id into v_district_id from chatbox_k12.districts where slug = 'westfield-unified';

  insert into chatbox_k12.schools (district_id, slug, name, settings)
  values (v_district_id, 'lincoln-elementary', 'Lincoln Elementary', jsonb_build_object('pluginOverrides', jsonb_build_array()))
  on conflict (district_id, slug) do update
    set name = excluded.name,
        settings = excluded.settings,
        updated_at = now();

  insert into chatbox_k12.schools (district_id, slug, name, settings)
  values (v_district_id, 'washington-middle', 'Washington Middle School', jsonb_build_object('pluginOverrides', jsonb_build_array()))
  on conflict (district_id, slug) do update
    set name = excluded.name,
        settings = excluded.settings,
        updated_at = now();

  select id into v_lincoln_id from chatbox_k12.schools where district_id = v_district_id and slug = 'lincoln-elementary';
  select id into v_washington_id from chatbox_k12.schools where district_id = v_district_id and slug = 'washington-middle';

  insert into chatbox_k12.classrooms (school_id, teacher_profile_id, slug, name, grade_band, settings)
  values (v_lincoln_id, teacher_id, '5th-grade-science', 'Ms. Chen — 5th Grade Science', 'K-5', '{}'::jsonb)
  on conflict (school_id, slug) do update
    set teacher_profile_id = excluded.teacher_profile_id,
        name = excluded.name,
        grade_band = excluded.grade_band,
        updated_at = now();

  insert into chatbox_k12.classrooms (school_id, teacher_profile_id, slug, name, grade_band, settings)
  values (v_washington_id, null, '7th-grade-math', '7th Grade Math', '6-8', '{}'::jsonb)
  on conflict (school_id, slug) do update
    set name = excluded.name,
        grade_band = excluded.grade_band,
        updated_at = now();

  select id into v_science_class_id from chatbox_k12.classrooms where school_id = v_lincoln_id and slug = '5th-grade-science';

  delete from chatbox_k12.memberships where profile_id in (district_admin_id, school_admin_id, teacher_id, student_id);

  insert into chatbox_k12.memberships (profile_id, role, district_id, school_id, classroom_id, status)
  values
    (district_admin_id, 'central_admin', v_district_id, null, null, 'active'),
    (school_admin_id, 'school_admin', v_district_id, v_lincoln_id, null, 'active'),
    (teacher_id, 'teacher', v_district_id, v_lincoln_id, v_science_class_id, 'active'),
    (student_id, 'student', v_district_id, v_lincoln_id, v_science_class_id, 'active');
end $$;
