import type { K12Class, PluginManifest } from '@shared/plugin-types'
import { describe, expect, it } from 'vitest'
import { createK12Store, DEMO_USERS } from './k12Store'

const manifests: PluginManifest[] = [
  {
    id: 'chess',
    name: 'Chess',
    version: '1.0.0',
    description: 'Chess',
    category: 'internal',
    tools: [],
    widget: { entrypoint: 'ui.html' },
  },
  {
    id: 'weather',
    name: 'Weather',
    version: '1.0.0',
    description: 'Weather',
    category: 'external-public',
    tools: [],
    widget: { entrypoint: 'ui.html' },
  },
  {
    id: 'github',
    name: 'GitHub',
    version: '1.0.0',
    description: 'GitHub',
    category: 'external-authenticated',
    tools: [],
    widget: { entrypoint: 'ui.html' },
    auth: { type: 'device-flow' },
  },
]

describe('k12Store access control', () => {


  it('allows approved dropped plugins for the same school and activates them for teacher classes', () => {
    const store = createK12Store()
    const teacher = DEMO_USERS.find((user) => user.role === 'teacher')
    if (!teacher) throw new Error('Demo teacher is required for this test')

    store.getState().login(teacher)
    store.getState().requestPlugin(
      {
        id: 'drop-weather',
        name: 'Drop Weather',
        version: '1.0.0',
        description: 'Dropped plugin',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      teacher.schoolId || 'school-1',
    )
    const recordId = store.getState().installRecords[0]?.id
    if (!recordId) throw new Error('Install record not created')
    store.getState().updateInstallStatus(recordId, 'active')
    store.getState().activatePluginForCurrentScope('drop-weather')

    expect(store.getState().isPluginAllowed('drop-weather', teacher.schoolId)).toBe(true)
    const teacherClass = store.getState().classes.find((cls) => cls.teacherId === teacher.id)
    expect(teacherClass?.activePlugins).toContain('drop-weather')
  })

  it('activates approved install records for the requesting teacher classes', () => {
    const store = createK12Store()
    const teacher = DEMO_USERS.find((user) => user.role === 'teacher')
    const admin = DEMO_USERS.find((user) => user.role === 'district-admin')
    if (!teacher || !admin) throw new Error('Demo teacher and admin are required for this test')

    store.getState().login(teacher)
    const record = store.getState().requestPlugin(
      {
        id: 'drop-lab',
        name: 'Drop Lab',
        version: '1.0.0',
        description: 'Dropped plugin',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      teacher.schoolId || 'school-1',
    )

    store.getState().login(admin)
    store.getState().updateInstallStatus(record.id, 'approved', { reviewedBy: admin.id })
    const activated = store.getState().activatePluginForInstallRecord(record.id)
    store.getState().updateInstallStatus(record.id, 'active', { reviewedBy: admin.id })

    expect(activated).toBe(true)
    const teacherClass = store.getState().classes.find((cls) => cls.teacherId === teacher.id)
    expect(teacherClass?.activePlugins).toContain('drop-lab')
  })

  it('scopes pending approvals to school admins', () => {
    const store = createK12Store()
    const teacher = DEMO_USERS.find((user) => user.role === 'teacher')
    const schoolAdmin = DEMO_USERS.find((user) => user.role === 'school-admin')
    if (!teacher || !schoolAdmin) throw new Error('Demo teacher and school admin are required for this test')

    store.getState().login(teacher)
    store.getState().requestPlugin(
      {
        id: 'drop-weather-2',
        name: 'Drop Weather 2',
        version: '1.0.0',
        description: 'Dropped plugin',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      teacher.schoolId || 'school-1',
    )

    store.getState().requestPlugin(
      {
        id: 'drop-other-school',
        name: 'Other School Plugin',
        version: '1.0.0',
        description: 'Dropped plugin',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      'school-2',
    )

    store.getState().login(schoolAdmin)
    expect(store.getState().getPendingApprovals().map((record) => record.pluginId)).toEqual(['drop-weather-2'])
  })

  it('limits students to plugins enabled for their own class', () => {
    const store = createK12Store()
    const student = DEMO_USERS.find((user) => user.role === 'student')
    expect(student).toBeDefined()
    if (!student) {
      throw new Error('Demo student is required for this test')
    }

    store.getState().login(student)
    store.setState((state) => ({
      ...state,
      classes: [
        ...state.classes,
        {
          id: 'class-1b',
          schoolId: 'school-1',
          teacherId: 'user-teacher',
          name: 'Same School Other Class',
          gradeLevel: 'K-5',
          activePlugins: ['github'],
        } satisfies K12Class,
      ],
    }))

    const available = store
      .getState()
      .getAvailablePlugins(manifests)
      .map((manifest) => manifest.id)
    expect(available).toEqual(['chess', 'weather'])
    expect(available).not.toContain('github')
  })
})
