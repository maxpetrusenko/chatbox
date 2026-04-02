import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const managementToken = process.env.SUPABASE_MANAGEMENT_TOKEN
const projectRef = process.env.SUPABASE_PROJECT_REF

if (!supabaseUrl || !serviceRoleKey || !managementToken || !projectRef) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_MANAGEMENT_TOKEN, or SUPABASE_PROJECT_REF')
  process.exit(1)
}

const authClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const seedUsers = [
  { email: 'district-admin@westfield.edu', password: 'password', metadata: { full_name: 'Jordan Rivera', username: 'district-admin', login_alias: 'district-admin' } },
  { email: 'school-admin@westfield.edu', password: 'password', metadata: { full_name: 'Priya Patel', username: 'school-admin', login_alias: 'school-admin' } },
  { email: 'teacher@westfield.edu', password: 'password', metadata: { full_name: 'Maya Chen', username: 'teacher', login_alias: 'teacher' } },
  { email: 'student@westfield.edu', password: 'password', metadata: { full_name: 'Alex Johnson', username: 'student', login_alias: 'student' } },
]

const databaseQueryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

async function runSql(query) {
  const response = await fetch(databaseQueryUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${managementToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}

async function upsertAuthUsers() {
  const { data, error } = await authClient.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  const existingByEmail = new Map((data.users || []).map((user) => [user.email, user]))

  for (const entry of seedUsers) {
    const existing = existingByEmail.get(entry.email)
    if (existing) {
      const { error: updateError } = await authClient.auth.admin.updateUserById(existing.id, {
        password: entry.password,
        email_confirm: true,
        user_metadata: entry.metadata,
      })
      if (updateError) throw updateError
      continue
    }

    const { error: createError } = await authClient.auth.admin.createUser({
      email: entry.email,
      password: entry.password,
      email_confirm: true,
      user_metadata: entry.metadata,
    })
    if (createError) throw createError
  }
}

async function seedTenantData() {
  await runSql(`
update auth.users
set email_confirmed_at = now(), updated_at = now()
where email in ('district-admin@westfield.edu', 'school-admin@westfield.edu', 'teacher@westfield.edu', 'student@westfield.edu');

do $$
declare
  v_district_id uuid;
  v_lincoln_id uuid;
  v_washington_id uuid;
  v_science_class_id uuid;
  district_admin_id uuid := (select id from auth.users where email = 'district-admin@westfield.edu');
  school_admin_id uuid := (select id from auth.users where email = 'school-admin@westfield.edu');
  teacher_id uuid := (select id from auth.users where email = 'teacher@westfield.edu');
  student_id uuid := (select id from auth.users where email = 'student@westfield.edu');
begin
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
  values ('westfield-unified','Westfield Unified School District',jsonb_build_object('allowedPlugins', jsonb_build_array('chess','weather','spotify','github','geogebra','phet','google-maps','wolfram'),'blockedPlugins', jsonb_build_array(),'autoApproveThreshold',90,'requireDpa',true,'defaultContentSafetyLevel','strict'))
  on conflict (slug) do update set name = excluded.name, settings = excluded.settings, updated_at = now();

  select id into v_district_id from chatbox_k12.districts where slug = 'westfield-unified';

  insert into chatbox_k12.schools (district_id, slug, name, settings)
  values (v_district_id, 'lincoln-elementary', 'Lincoln Elementary', jsonb_build_object('pluginOverrides', jsonb_build_array()))
  on conflict (district_id, slug) do update set name = excluded.name, settings = excluded.settings, updated_at = now();

  insert into chatbox_k12.schools (district_id, slug, name, settings)
  values (v_district_id, 'washington-middle', 'Washington Middle School', jsonb_build_object('pluginOverrides', jsonb_build_array()))
  on conflict (district_id, slug) do update set name = excluded.name, settings = excluded.settings, updated_at = now();

  select id into v_lincoln_id from chatbox_k12.schools where district_id = v_district_id and slug = 'lincoln-elementary';
  select id into v_washington_id from chatbox_k12.schools where district_id = v_district_id and slug = 'washington-middle';

  insert into chatbox_k12.classrooms (school_id, teacher_profile_id, slug, name, grade_band, settings)
  values (v_lincoln_id, teacher_id, '5th-grade-science', 'Ms. Chen — 5th Grade Science', 'K-5', '{}'::jsonb)
  on conflict (school_id, slug) do update set teacher_profile_id = excluded.teacher_profile_id, name = excluded.name, grade_band = excluded.grade_band, updated_at = now();

  insert into chatbox_k12.classrooms (school_id, teacher_profile_id, slug, name, grade_band, settings)
  values (v_washington_id, null, '7th-grade-math', '7th Grade Math', '6-8', '{}'::jsonb)
  on conflict (school_id, slug) do update set name = excluded.name, grade_band = excluded.grade_band, updated_at = now();

  select id into v_science_class_id from chatbox_k12.classrooms where school_id = v_lincoln_id and slug = '5th-grade-science';

  delete from chatbox_k12.memberships where profile_id in (district_admin_id, school_admin_id, teacher_id, student_id);
  insert into chatbox_k12.memberships (profile_id, role, district_id, school_id, classroom_id, status)
  values
    (district_admin_id, 'central_admin', v_district_id, null, null, 'active'),
    (school_admin_id, 'school_admin', v_district_id, v_lincoln_id, null, 'active'),
    (teacher_id, 'teacher', v_district_id, v_lincoln_id, v_science_class_id, 'active'),
    (student_id, 'student', v_district_id, v_lincoln_id, v_science_class_id, 'active');
end $$;
  `)
}

await upsertAuthUsers()
await seedTenantData()
console.log('Seeded TellMe K12 users and tenant data.')
