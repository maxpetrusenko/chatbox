import type {
  AuditLogEntry,
  K12Class,
  K12District,
  K12Role,
  K12School,
  K12User,
  PluginApprovalStatus,
  PluginInstallRecord,
  PluginManifest,
} from '@shared/plugin-types'
import { droppedPluginsStore } from '@/stores/droppedPluginsStore'
import { k12Store } from '@/stores/k12Store'
import { getTellMeClient, hasTellMeSupabaseConfig } from './supabase'

const STORAGE_BUCKET = 'chatbox-plugin-drops'

export interface K12LoginPreset {
  alias: string
  email: string
  name: string
  role: K12Role
  schoolName: string
}

export const K12_LOGIN_PRESETS: K12LoginPreset[] = [
  { alias: 'district-admin', email: 'district-admin@westfield.edu', name: 'Jordan Rivera', role: 'district-admin', schoolName: 'Westfield Unified' },
  { alias: 'school-admin', email: 'school-admin@westfield.edu', name: 'Priya Patel', role: 'school-admin', schoolName: 'Lincoln Elementary' },
  { alias: 'teacher', email: 'teacher@westfield.edu', name: 'Maya Chen', role: 'teacher', schoolName: 'Lincoln Elementary' },
  { alias: 'student', email: 'student@westfield.edu', name: 'Alex Johnson', role: 'student', schoolName: 'Lincoln Elementary' },
]

interface BootstrapPayload {
  profile: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  }
  membership: {
    role: string
    district_id: string | null
    school_id: string | null
    classroom_id: string | null
  }
  district: {
    id: string
    name: string
    settings: Record<string, unknown> | null
  } | null
  schools: Array<{
    id: string
    district_id: string
    name: string
    settings: Record<string, unknown> | null
  }>
  classrooms: Array<{
    id: string
    school_id: string
    teacher_profile_id: string | null
    name: string
    grade_band: string | null
    settings: Record<string, unknown> | null
  }>
  installations: Array<{
    id: string
    plugin_manifest_id: string
    district_id: string | null
    school_id: string | null
    classroom_id: string | null
    installed_by: string | null
    install_state: string
    policy: Record<string, unknown> | null
    approved_at: string | null
    activated_at: string | null
    created_at: string
    plugin_id: string
    package_source: string | null
    review_state: string
    manifest: PluginManifest | null
    ai_review_summary: Record<string, unknown> | null
    submitted_by: string | null
    reviewed_by: string | null
    reviewed_at: string | null
  }>
}

interface K12Snapshot {
  user: K12User
  district: K12District | null
  schools: K12School[]
  classes: K12Class[]
  installRecords: PluginInstallRecord[]
  auditLog: AuditLogEntry[]
}

let authSubscriptionBound = false

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase()
}

export function resolveK12LoginEmail(login: string): string {
  const normalized = normalizeLogin(login)
  const preset = K12_LOGIN_PRESETS.find((entry) => entry.alias === normalized || entry.email === normalized)
  return preset?.email ?? normalized
}

function mapMembershipRole(role: string): K12Role {
  switch (role) {
    case 'central_admin':
      return 'district-admin'
    case 'school_admin':
      return 'school-admin'
    case 'teacher':
      return 'teacher'
    default:
      return 'student'
  }
}

function coerceStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function toTimestamp(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? undefined : timestamp
}

function getPolicyString(policy: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = policy?.[key]
  return typeof value === 'string' ? value : undefined
}

function getPolicyNumber(policy: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const value = policy?.[key]
  return typeof value === 'number' ? value : undefined
}

function getPolicyStringArray(policy: Record<string, unknown> | null | undefined, key: string): string[] {
  return coerceStringArray(policy?.[key])
}

function deriveRecordStatus(row: BootstrapPayload['installations'][number]): PluginApprovalStatus {
  const chatboxStatus = getPolicyString(row.policy, 'chatboxStatus')
  if (chatboxStatus === 'pending' || chatboxStatus === 'validating' || chatboxStatus === 'ai-review' || chatboxStatus === 'quarantined' || chatboxStatus === 'approved' || chatboxStatus === 'rejected' || chatboxStatus === 'active' || chatboxStatus === 'revoked') {
    return chatboxStatus
  }
  switch (row.install_state) {
    case 'active':
      return 'active'
    case 'approved':
      return 'approved'
    case 'revoked':
    case 'suspended':
      return 'revoked'
    default:
      return row.review_state === 'reviewed' ? 'quarantined' : 'pending'
  }
}

function appliesToClass(row: BootstrapPayload['installations'][number], classroomId: string, schoolId: string): boolean {
  const scopedClassrooms = getPolicyStringArray(row.policy, 'classroomIds')
  if (scopedClassrooms.length > 0) {
    return scopedClassrooms.includes(classroomId)
  }
  if (row.classroom_id) {
    return row.classroom_id === classroomId
  }
  if (row.school_id) {
    return row.school_id === schoolId
  }
  return true
}

function mapDistrict(row: BootstrapPayload['district']): K12District | null {
  if (!row) return null
  const settings = row.settings ?? {}
  return {
    id: row.id,
    name: row.name,
    allowedPlugins: coerceStringArray(settings.allowedPlugins),
    blockedPlugins: coerceStringArray(settings.blockedPlugins),
    settings: {
      autoApproveThreshold: typeof settings.autoApproveThreshold === 'number' ? settings.autoApproveThreshold : 90,
      requireDpa: settings.requireDpa !== false,
      defaultContentSafetyLevel:
        settings.defaultContentSafetyLevel === 'relaxed' || settings.defaultContentSafetyLevel === 'standard'
          ? settings.defaultContentSafetyLevel
          : 'strict',
    },
  }
}

function mapSchools(rows: BootstrapPayload['schools']): K12School[] {
  return rows.map((row) => ({
    id: row.id,
    districtId: row.district_id,
    name: row.name,
    pluginOverrides: Array.isArray(row.settings?.pluginOverrides)
      ? row.settings.pluginOverrides.filter(
          (entry): entry is { pluginId: string; action: 'allow' | 'block' } =>
            !!entry &&
            typeof entry === 'object' &&
            typeof (entry as { pluginId?: unknown }).pluginId === 'string' &&
            ((entry as { action?: unknown }).action === 'allow' || (entry as { action?: unknown }).action === 'block')
        )
      : [],
  }))
}

function applySnapshot(snapshot: K12Snapshot | null): void {
  if (!snapshot) {
    k12Store.setState({ currentUser: null, isAuthenticated: false, district: null, schools: [], classes: [], installRecords: [], auditLog: [] })
    return
  }

  k12Store.setState({
    currentUser: snapshot.user,
    isAuthenticated: true,
    district: snapshot.district,
    schools: snapshot.schools,
    classes: snapshot.classes,
    installRecords: snapshot.installRecords,
    auditLog: snapshot.auditLog,
  })
}

async function hydrateDroppedPackages(rows: BootstrapPayload['installations']): Promise<void> {
  const supabase = getTellMeClient()
  for (const row of rows) {
    if (deriveRecordStatus(row) !== 'active' || !row.package_source || !row.manifest) {
      continue
    }
    if (droppedPluginsStore.getState().packages[row.plugin_id]) {
      continue
    }
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(row.package_source)
    if (error || !data) {
      continue
    }
    try {
      const payload = JSON.parse(await data.text()) as { manifest?: PluginManifest; uiHtml?: string; sourceName?: string }
      if (!payload.manifest || typeof payload.uiHtml !== 'string') {
        continue
      }
      droppedPluginsStore.getState().installPackage({ manifest: payload.manifest, uiHtml: payload.uiHtml, sourceName: payload.sourceName })
    } catch {
      continue
    }
  }
}

async function fetchBootstrap(): Promise<BootstrapPayload | null> {
  const supabase = getTellMeClient()
  const { data, error } = await supabase.rpc('chatbox_k12_bootstrap')
  if (error) throw error
  return (data as BootstrapPayload | null) ?? null
}

export async function hydrateK12StoreFromTellMe(): Promise<K12Snapshot | null> {
  if (!hasTellMeSupabaseConfig()) {
    return null
  }

  const {
    data: { user },
    error: userError,
  } = await getTellMeClient().auth.getUser()
  if (userError) throw userError
  if (!user) {
    applySnapshot(null)
    return null
  }

  const payload = await fetchBootstrap()
  if (!payload) {
    applySnapshot(null)
    return null
  }

  const currentUser: K12User = {
    id: payload.profile.id,
    email: payload.profile.email ?? user.email ?? '',
    name: payload.profile.full_name ?? payload.profile.email ?? user.email ?? 'Chatbox User',
    role: mapMembershipRole(payload.membership.role),
    districtId: payload.membership.district_id ?? '',
    schoolId: payload.membership.school_id ?? undefined,
    classId: payload.membership.classroom_id ?? undefined,
    avatarUrl: payload.profile.avatar_url ?? undefined,
  }

  const district = mapDistrict(payload.district)
  const schools = mapSchools(payload.schools)
  const classes: K12Class[] = payload.classrooms.map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    teacherId: row.teacher_profile_id ?? '',
    name: row.name,
    gradeLevel: row.grade_band ?? 'K-12',
    activePlugins: payload.installations
      .filter((installation) => installation.install_state === 'active' && appliesToClass(installation, row.id, row.school_id))
      .map((installation) => installation.plugin_id),
  }))

  const installRecords: PluginInstallRecord[] = payload.installations
    .filter((row) => Boolean(row.manifest))
    .map((row) => ({
      id: row.id,
      pluginId: row.plugin_id,
      manifestSnapshot: row.manifest as PluginManifest,
      schoolId: row.school_id ?? currentUser.schoolId ?? '',
      districtId: row.district_id ?? currentUser.districtId,
      status: deriveRecordStatus(row),
      requestedBy: getPolicyString(row.policy, 'requestedByLabel') ?? row.installed_by ?? row.submitted_by ?? 'unknown',
      requestedAt: toTimestamp(row.created_at) ?? Date.now(),
      reviewedBy: row.reviewed_by ?? undefined,
      reviewedAt: toTimestamp(row.reviewed_at),
      safetyScore: getPolicyNumber(row.policy, 'safetyScore'),
      safetyFindings: getPolicyStringArray(row.policy, 'safetyFindings'),
      rejectionReason: getPolicyString(row.policy, 'rejectionReason'),
    }))

  const snapshot: K12Snapshot = { user: currentUser, district, schools, classes, installRecords, auditLog: [] }
  applySnapshot(snapshot)
  await hydrateDroppedPackages(payload.installations)
  return snapshot
}

export async function signInToTellMe(login: string, password: string): Promise<K12Snapshot | null> {
  if (!hasTellMeSupabaseConfig()) {
    throw new Error('TellMe Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY first.')
  }
  const email = resolveK12LoginEmail(login)
  const { error } = await getTellMeClient().auth.signInWithPassword({ email, password })
  if (error) throw error
  return hydrateK12StoreFromTellMe()
}

export async function signOutFromTellMe(): Promise<void> {
  if (!hasTellMeSupabaseConfig()) {
    applySnapshot(null)
    return
  }
  await getTellMeClient().auth.signOut()
  applySnapshot(null)
}

async function uploadPluginBundle(input: { manifest: PluginManifest; uiHtml?: string; sourceName?: string; currentUser: K12User }): Promise<string | null> {
  if (!input.uiHtml) return null
  const path = `${input.currentUser.districtId}/${input.currentUser.schoolId ?? 'district'}/${input.manifest.id}/${input.manifest.version}/plugin-package.json`
  const payload = new TextEncoder().encode(
    JSON.stringify({ manifest: input.manifest, uiHtml: input.uiHtml, sourceName: input.sourceName ?? null, uploadedAt: new Date().toISOString() })
  )
  const { error } = await getTellMeClient().storage.from(STORAGE_BUCKET).upload(path, payload, { contentType: 'application/json', upsert: true })
  if (error) throw error
  return path
}

export async function submitPluginRequestToTellMe(input: {
  manifest: PluginManifest
  schoolId: string
  uiHtml?: string
  sourceName?: string
  safetyScore?: number
  safetyFindings?: string[]
  requestedByLabel?: string
  chatboxStatus?: PluginApprovalStatus
  enableForCurrentScope?: boolean
  currentUser: K12User
}): Promise<{ id: string; status: PluginApprovalStatus }> {
  const packageSource = await uploadPluginBundle(input)
  const { data, error } = await getTellMeClient().rpc('chatbox_k12_submit_plugin_request', {
    input_manifest: input.manifest,
    input_school_id: input.schoolId,
    input_package_source: packageSource,
    input_safety_score: input.safetyScore ?? null,
    input_safety_findings: input.safetyFindings ?? [],
    input_requested_by_label: input.requestedByLabel ?? input.currentUser.name,
    input_chatbox_status: input.chatboxStatus ?? 'pending',
    input_enable_for_current_scope: input.enableForCurrentScope ?? false,
    input_source_name: input.sourceName ?? null,
  })
  if (error) throw error
  await hydrateK12StoreFromTellMe()
  return { id: (data as { recordId: string }).recordId, status: (input.chatboxStatus ?? 'pending') as PluginApprovalStatus }
}

export async function reviewPluginRequestInTellMe(input: { recordId: string; status: 'approved' | 'active' | 'rejected'; reviewedBy: string; rejectionReason?: string }): Promise<void> {
  const { error } = await getTellMeClient().rpc('chatbox_k12_review_plugin_request', {
    input_record_id: input.recordId,
    input_next_status: input.status,
    input_rejection_reason: input.rejectionReason ?? null,
  })
  if (error) throw error
  await hydrateK12StoreFromTellMe()
}

export async function setPluginEnabledForCurrentScopeInTellMe(pluginId: string, enabled: boolean): Promise<void> {
  const { error } = await getTellMeClient().rpc('chatbox_k12_set_plugin_scope', {
    input_plugin_id: pluginId,
    input_enabled: enabled,
  })
  if (error) throw error
  await hydrateK12StoreFromTellMe()
}

export function initTellMeK12AuthSync(): void {
  if (authSubscriptionBound || !hasTellMeSupabaseConfig() || typeof window === 'undefined') {
    return
  }
  authSubscriptionBound = true
  const supabase = getTellMeClient()
  void hydrateK12StoreFromTellMe().catch(() => {})
  supabase.auth.onAuthStateChange(() => {
    void hydrateK12StoreFromTellMe().catch(() => {})
  })
}
