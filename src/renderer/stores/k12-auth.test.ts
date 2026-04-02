import { describe, expect, it } from 'vitest'
import {
  authenticateDemoGoogle,
  authenticateDemoPassword,
  DEMO_LOGIN_PASSWORD,
  getK12HomePath,
  isStudentSettingsKeyAllowed,
} from './k12-auth'
import { DEMO_USERS } from './k12Store'

describe('k12-auth helpers', () => {
  it('maps roles to the right home path', () => {
    expect(getK12HomePath('student')).toBe('/')
    expect(getK12HomePath('teacher')).toBe('/settings/plugins')
    expect(getK12HomePath('school-admin')).toBe('/settings/k12-admin')
  })

  it('authenticates demo password logins', () => {
    expect(authenticateDemoPassword(DEMO_USERS, 'alex.j@lincoln.westfield.edu', DEMO_LOGIN_PASSWORD)?.role).toBe('student')
    expect(authenticateDemoPassword(DEMO_USERS, 'teacher', DEMO_LOGIN_PASSWORD)?.role).toBe('teacher')
    expect(authenticateDemoPassword(DEMO_USERS, 'student', DEMO_LOGIN_PASSWORD)?.role).toBe('student')
    expect(authenticateDemoPassword(DEMO_USERS, 'alex.j@lincoln.westfield.edu', 'wrong')).toBeNull()
  })

  it('authenticates demo google logins for school accounts', () => {
    expect(authenticateDemoGoogle(DEMO_USERS, 'chen@lincoln.westfield.edu')?.role).toBe('teacher')
    expect(authenticateDemoGoogle(DEMO_USERS, 'unknown@example.com')).toBeNull()
  })

  it('limits student-visible settings sections', () => {
    expect(isStudentSettingsKeyAllowed('plugins')).toBe(true)
    expect(isStudentSettingsKeyAllowed('k12-login')).toBe(true)
    expect(isStudentSettingsKeyAllowed('provider')).toBe(false)
  })
})
