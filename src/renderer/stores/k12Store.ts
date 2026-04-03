/**
 * K12 Platform Store
 *
 * Manages platform user auth, tenant hierarchy, RBAC, plugin approval pipeline,
 * and audit logging for the K12 deployment model.
 *
 * Persisted to localStorage so state survives app restarts.
 */

import type {
  AuditAction,
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
import { useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { createStore, useStore } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// ---------------------------------------------------------------------------
// RBAC permission map
// ---------------------------------------------------------------------------

type Permission =
  | 'plugin.view-catalog'
  | 'plugin.install'
  | 'plugin.request'
  | 'plugin.approve'
  | 'plugin.use'
  | 'plugin.manage-auth'
  | 'plugin.set-class-scope'
  | 'plugin.global-policy'
  | 'plugin.force-remove'
  | 'audit.view'
  | 'audit.view-safety'
  | 'admin.manage-users'

const ROLE_PERMISSIONS: Record<K12Role, Permission[]> = {
  'district-admin': [
    'plugin.view-catalog',
    'plugin.install',
    'plugin.request',
    'plugin.approve',
    'plugin.use',
    'plugin.manage-auth',
    'plugin.set-class-scope',
    'plugin.global-policy',
    'plugin.force-remove',
    'audit.view',
    'audit.view-safety',
    'admin.manage-users',
  ],
  'school-admin': [
    'plugin.view-catalog',
    'plugin.install',
    'plugin.request',
    'plugin.approve',
    'plugin.use',
    'plugin.manage-auth',
    'plugin.set-class-scope',
    'plugin.force-remove',
    'audit.view',
    'audit.view-safety',
  ],
  teacher: [
    'plugin.view-catalog',
    'plugin.install',
    'plugin.request',
    'plugin.use',
    'plugin.manage-auth',
    'plugin.set-class-scope',
    'audit.view',
  ],
  student: ['plugin.use'],
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface K12State {
  // Auth
  currentUser: K12User | null
  isAuthenticated: boolean

  // Tenant
  district: K12District | null
  schools: K12School[]
  classes: K12Class[]

  // Plugin approval
  installRecords: PluginInstallRecord[]

  // Audit
  auditLog: AuditLogEntry[]
}

interface K12Actions {
  // Auth
  login: (user: K12User) => void
  logout: () => void
  hasPermission: (permission: Permission) => boolean
  getUserRole: () => K12Role | null

  // Tenant
  setDistrict: (district: K12District) => void
  addSchool: (school: K12School) => void
  addClass: (cls: K12Class) => void
  updateClassPlugins: (classId: string, plugins: string[]) => void
  activatePluginForCurrentScope: (pluginId: string) => void
  deactivatePluginForCurrentScope: (pluginId: string) => void
  activatePluginForInstallRecord: (recordId: string) => boolean

  // Plugin approval pipeline
  requestPlugin: (manifest: PluginManifest, schoolId: string) => PluginInstallRecord
  updateInstallStatus: (
    recordId: string,
    status: PluginApprovalStatus,
    extra?: { safetyScore?: number; safetyFindings?: string[]; reviewedBy?: string; rejectionReason?: string }
  ) => void
  getInstallRecords: (filter?: { status?: PluginApprovalStatus; schoolId?: string }) => PluginInstallRecord[]
  getPendingApprovals: () => PluginInstallRecord[]

  // Plugin access control
  isPluginAllowed: (pluginId: string, schoolId?: string) => boolean
  isPluginActiveForCurrentScope: (pluginId: string) => boolean
  getAvailablePlugins: (manifests: PluginManifest[]) => PluginManifest[]

  // Audit
  logAction: (
    action: AuditAction,
    details: Record<string, unknown>,
    severity?: 'info' | 'warning' | 'critical',
    pluginId?: string
  ) => void
  getAuditLog: (filter?: { action?: AuditAction; pluginId?: string; severity?: string }) => AuditLogEntry[]
  clearAuditLog: () => void
}

export type K12Store = K12State & K12Actions

// ---------------------------------------------------------------------------
// Default demo data
// ---------------------------------------------------------------------------

export const DEMO_DISTRICT: K12District = {
  id: 'district-1',
  name: 'Westfield Unified School District',
  allowedPlugins: ['chess', 'weather', 'spotify', 'github', 'geogebra', 'phet', 'google-maps', 'wolfram'],
  blockedPlugins: [],
  settings: {
    autoApproveThreshold: 90,
    requireDpa: true,
    defaultContentSafetyLevel: 'strict',
  },
}

export const DEMO_SCHOOLS: K12School[] = [
  { id: 'school-1', districtId: 'district-1', name: 'Lincoln Elementary', pluginOverrides: [] },
  { id: 'school-2', districtId: 'district-1', name: 'Washington Middle School', pluginOverrides: [] },
]

export const DEMO_CLASSES: K12Class[] = [
  {
    id: 'class-1',
    schoolId: 'school-1',
    teacherId: 'user-teacher',
    name: 'Ms. Chen — 5th Grade Science',
    gradeLevel: 'K-5',
    activePlugins: ['chess', 'weather', 'geogebra', 'phet', 'google-maps'],
  },
  {
    id: 'class-2',
    schoolId: 'school-2',
    teacherId: 'user-teacher-2',
    name: 'Mr. Park — 7th Grade Math',
    gradeLevel: '6-8',
    activePlugins: ['chess', 'geogebra', 'wolfram'],
  },
]

const DEMO_USERS: K12User[] = [
  {
    id: 'user-district-admin',
    email: 'admin@westfield.edu',
    name: 'Dr. Sarah Mitchell',
    role: 'district-admin',
    districtId: 'district-1',
  },
  {
    id: 'user-school-admin',
    email: 'principal@lincoln.westfield.edu',
    name: 'James Rodriguez',
    role: 'school-admin',
    districtId: 'district-1',
    schoolId: 'school-1',
  },
  {
    id: 'user-teacher',
    email: 'chen@lincoln.westfield.edu',
    name: 'Lisa Chen',
    role: 'teacher',
    districtId: 'district-1',
    schoolId: 'school-1',
  },
  {
    id: 'user-student',
    email: 'alex.j@lincoln.westfield.edu',
    name: 'Alex Johnson',
    role: 'student',
    districtId: 'district-1',
    schoolId: 'school-1',
    classId: 'class-1',
  },
]

export { DEMO_USERS }

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export function createK12Store() {
  return createStore<K12Store>()(
    persist(
      immer((set, get) => ({
        // Initial state
        currentUser: null,
        isAuthenticated: false,
        district: DEMO_DISTRICT,
        schools: DEMO_SCHOOLS,
        classes: DEMO_CLASSES,
        installRecords: [],
        auditLog: [],

        // Auth
        login: (user) => {
          set((s) => {
            s.currentUser = user
            s.isAuthenticated = true
          })
          get().logAction('auth.login', { userId: user.id, role: user.role })
        },

        logout: () => {
          const user = get().currentUser
          if (user) {
            get().logAction('auth.logout', { userId: user.id })
          }
          set((s) => {
            s.currentUser = null
            s.isAuthenticated = false
          })
        },

        hasPermission: (permission) => {
          const user = get().currentUser
          if (!user) return false
          return ROLE_PERMISSIONS[user.role].includes(permission)
        },

        getUserRole: () => {
          return get().currentUser?.role ?? null
        },

        // Tenant
        setDistrict: (district) => {
          set((s) => {
            s.district = district
          })
        },

        addSchool: (school) => {
          set((s) => {
            s.schools.push(school)
          })
        },

        addClass: (cls) => {
          set((s) => {
            s.classes.push(cls)
          })
        },

        updateClassPlugins: (classId, plugins) => {
          set((s) => {
            const cls = s.classes.find((c) => c.id === classId)
            if (cls) cls.activePlugins = plugins
          })
        },

        activatePluginForCurrentScope: (pluginId) => {
          const user = get().currentUser
          if (!user || !get().hasPermission('plugin.install')) return
          set((s) => {
            const targetClasses =
              user.role === 'teacher'
                ? s.classes.filter((cls) => cls.teacherId === user.id)
                : user.role === 'school-admin'
                  ? s.classes.filter((cls) => cls.schoolId === user.schoolId)
                  : s.classes

            for (const cls of targetClasses) {
              if (!cls.activePlugins.includes(pluginId)) {
                cls.activePlugins.push(pluginId)
              }
            }
          })
          get().logAction('plugin.installed', { pluginId, scope: user.role }, 'info', pluginId)
        },

        deactivatePluginForCurrentScope: (pluginId) => {
          const user = get().currentUser
          if (!user || !get().hasPermission('plugin.install')) return

          let removed = false

          set((s) => {
            const targetClasses =
              user.role === 'teacher'
                ? s.classes.filter((cls) => cls.teacherId === user.id)
                : user.role === 'school-admin'
                  ? s.classes.filter((cls) => cls.schoolId === user.schoolId)
                  : s.classes

            for (const cls of targetClasses) {
              if (cls.activePlugins.includes(pluginId)) {
                cls.activePlugins = cls.activePlugins.filter((id) => id !== pluginId)
                removed = true
              }
            }
          })

          if (removed) {
            get().logAction('plugin.revoked', { pluginId, scope: user.role }, 'info', pluginId)
          }
        },

        activatePluginForInstallRecord: (recordId) => {
          const record = get().installRecords.find((entry) => entry.id === recordId)
          if (!record) return false

          const requester = DEMO_USERS.find((user) => user.id === record.requestedBy)
          let activated = false

          set((s) => {
            let targetClasses =
              requester?.role === 'teacher'
                ? s.classes.filter((cls) => cls.teacherId === record.requestedBy && cls.schoolId === record.schoolId)
                : requester?.role === 'school-admin'
                  ? s.classes.filter((cls) => cls.schoolId === record.schoolId)
                  : s.classes

            if (targetClasses.length === 0) {
              targetClasses = s.classes.filter((cls) => cls.schoolId === record.schoolId)
            }

            for (const cls of targetClasses) {
              if (!cls.activePlugins.includes(record.pluginId)) {
                cls.activePlugins.push(record.pluginId)
                activated = true
              }
            }
          })

          if (activated) {
            get().logAction(
              'plugin.installed',
              { recordId, pluginId: record.pluginId, schoolId: record.schoolId, scope: requester?.role ?? 'school' },
              'info',
              record.pluginId
            )
          }

          return activated
        },

        // Plugin approval pipeline
        requestPlugin: (manifest, schoolId) => {
          const user = get().currentUser
          if (!user || !get().hasPermission('plugin.request')) return null as unknown as PluginInstallRecord
          const record: PluginInstallRecord = {
            id: uuidv4(),
            pluginId: manifest.id,
            manifestSnapshot: manifest,
            schoolId,
            districtId: user?.districtId ?? 'district-1',
            status: 'pending',
            requestedBy: user?.id ?? 'unknown',
            requestedAt: Date.now(),
          }
          set((s) => {
            s.installRecords.push(record)
          })
          get().logAction('plugin.requested', { pluginId: manifest.id, schoolId }, 'info', manifest.id)
          return record
        },

        updateInstallStatus: (recordId, status, extra) => {
          set((s) => {
            const record = s.installRecords.find((r) => r.id === recordId)
            if (!record) return
            record.status = status
            if (extra?.safetyScore !== undefined) record.safetyScore = extra.safetyScore
            if (extra?.safetyFindings) record.safetyFindings = extra.safetyFindings
            if (extra?.reviewedBy) {
              record.reviewedBy = extra.reviewedBy
              record.reviewedAt = Date.now()
            }
            if (extra?.rejectionReason) record.rejectionReason = extra.rejectionReason
          })
          const action: AuditAction =
            status === 'approved'
              ? 'plugin.approved'
              : status === 'rejected'
                ? 'plugin.rejected'
                : status === 'revoked'
                  ? 'plugin.revoked'
                  : 'plugin.validated'
          const record = get().installRecords.find((r) => r.id === recordId)
          get().logAction(action, { recordId, status, ...extra }, 'info', record?.pluginId)
        },

        getInstallRecords: (filter) => {
          const records = get().installRecords
          if (!filter) return records
          return records.filter((r) => {
            if (filter.status && r.status !== filter.status) return false
            if (filter.schoolId && r.schoolId !== filter.schoolId) return false
            return true
          })
        },

        getPendingApprovals: () => {
          const user = get().currentUser
          const pending = get().installRecords.filter(
            (r) => r.status === 'pending' || r.status === 'ai-review' || r.status === 'quarantined'
          )

          if (user?.role === 'school-admin') {
            return pending.filter((record) => record.schoolId === user.schoolId)
          }

          if (user?.role === 'district-admin') {
            return pending
          }

          return []
        },

        // Plugin access control
        isPluginAllowed: (pluginId, schoolId) => {
          const district = get().district
          if (!district) return false
          if (district.blockedPlugins.includes(pluginId)) return false

          const approvedInstall = get().installRecords.some(
            (record) =>
              record.pluginId === pluginId &&
              (record.status === 'approved' || record.status === 'active') &&
              (!schoolId || record.schoolId === schoolId)
          )

          if (district.allowedPlugins.length > 0 && !district.allowedPlugins.includes(pluginId) && !approvedInstall) {
            return false
          }
          if (schoolId) {
            const school = get().schools.find((s) => s.id === schoolId)
            if (school) {
              const override = school.pluginOverrides.find((o) => o.pluginId === pluginId)
              if (override?.action === 'block') return false
            }
          }
          return true
        },

        isPluginActiveForCurrentScope: (pluginId) => {
          const user = get().currentUser
          if (!user) return false

          if (user.role === 'teacher') {
            return get().classes.some((cls) => cls.teacherId === user.id && cls.activePlugins.includes(pluginId))
          }

          if (user.role === 'school-admin') {
            return get().classes.some((cls) => cls.schoolId === user.schoolId && cls.activePlugins.includes(pluginId))
          }

          if (user.role === 'student') {
            const scopedClasses = user.classId
              ? get().classes.filter((cls) => cls.id === user.classId)
              : get().classes.filter((cls) => cls.schoolId === user.schoolId)
            return scopedClasses.some((cls) => cls.activePlugins.includes(pluginId))
          }

          return get().classes.some((cls) => cls.activePlugins.includes(pluginId))
        },

        getAvailablePlugins: (manifests) => {
          const user = get().currentUser
          if (!user) return []
          const role = user.role

          if (role === 'student') {
            const scopedClasses = user.classId
              ? get().classes.filter((c) => c.id === user.classId)
              : get().classes.filter((c) => c.schoolId === user.schoolId)
            const activeIds = new Set(scopedClasses.flatMap((c) => c.activePlugins))
            return manifests.filter((m) => activeIds.has(m.id) && get().isPluginAllowed(m.id, user.schoolId))
          }

          // Teachers see plugins allowed for their school
          if (role === 'teacher') {
            return manifests.filter((m) => get().isPluginAllowed(m.id, user.schoolId))
          }

          // School admin sees school-scoped plugins
          if (role === 'school-admin') {
            return manifests.filter((m) => get().isPluginAllowed(m.id, user.schoolId))
          }

          // District admin sees all
          return manifests.filter((m) => get().isPluginAllowed(m.id))
        },

        // Audit
        logAction: (action, details, severity = 'info', pluginId) => {
          const user = get().currentUser
          const entry: AuditLogEntry = {
            id: uuidv4(),
            timestamp: Date.now(),
            action,
            actorId: user?.id ?? 'system',
            actorRole: user?.role ?? 'student',
            pluginId,
            schoolId: user?.schoolId,
            districtId: user?.districtId ?? 'district-1',
            details,
            severity,
          }
          set((s) => {
            s.auditLog.unshift(entry)
            // Keep last 500 entries
            if (s.auditLog.length > 500) s.auditLog.length = 500
          })
        },

        getAuditLog: (filter) => {
          const user = get().currentUser
          let log = get().auditLog

          // Scope audit log by role
          if (user?.role === 'teacher' || user?.role === 'school-admin') {
            log = log.filter((e) => !e.schoolId || e.schoolId === user.schoolId)
          }

          if (!filter) return log
          return log.filter((e) => {
            if (filter.action && e.action !== filter.action) return false
            if (filter.pluginId && e.pluginId !== filter.pluginId) return false
            if (filter.severity && e.severity !== filter.severity) return false
            return true
          })
        },

        clearAuditLog: () => {
          set((s) => {
            s.auditLog = []
          })
        },
      })),
      {
        name: 'chatbox-k12-store',
        version: 1,
        partialize: (state) => ({
          currentUser: state.currentUser,
          isAuthenticated: state.isAuthenticated,
          district: state.district,
          schools: state.schools,
          classes: state.classes,
          installRecords: state.installRecords,
          auditLog: state.auditLog,
        }),
      }
    )
  )
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const k12Store = createK12Store()

export function useK12<T>(selector: (state: K12Store) => T): T {
  return useStore(k12Store, selector)
}

// Convenience hooks
export function useCurrentUser() {
  return useK12((s) => s.currentUser)
}

export function useK12Auth() {
  const user = useK12((s) => s.currentUser)
  const isAuthenticated = useK12((s) => s.isAuthenticated)
  const login = useK12((s) => s.login)
  const logout = useK12((s) => s.logout)
  const hasPermission = useK12((s) => s.hasPermission)
  const role = useK12((s) => s.currentUser?.role ?? null)

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      logout,
      hasPermission,
      role,
    }),
    [user, isAuthenticated, login, logout, hasPermission, role]
  )
}
