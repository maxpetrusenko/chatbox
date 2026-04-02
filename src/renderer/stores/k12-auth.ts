import type { K12Role, K12User } from '@shared/plugin-types'

export const DEMO_LOGIN_PASSWORD = 'password'

const DEMO_LOGIN_ALIASES: Record<string, K12Role | 'admin'> = {
  teacher: 'teacher',
  student: 'student',
  'school-admin': 'school-admin',
  principal: 'school-admin',
  'district-admin': 'district-admin',
  admin: 'admin',
}

export function normalizeK12Email(email: string): string {
  return email.trim().toLowerCase()
}

function findDemoUserByAlias(users: K12User[], login: string): K12User | null {
  const normalized = normalizeK12Email(login)
  const alias = DEMO_LOGIN_ALIASES[normalized]
  if (!alias) {
    return null
  }
  if (alias === 'admin') {
    return users.find((user) => user.role === 'district-admin') ?? null
  }
  return users.find((user) => user.role === alias) ?? null
}

export function findDemoUserByEmail(users: K12User[], email: string): K12User | null {
  const normalizedEmail = normalizeK12Email(email)
  return users.find((user) => normalizeK12Email(user.email) === normalizedEmail) ?? null
}

export function findDemoUser(users: K12User[], login: string): K12User | null {
  return findDemoUserByEmail(users, login) ?? findDemoUserByAlias(users, login)
}

export function authenticateDemoPassword(users: K12User[], email: string, password: string): K12User | null {
  if (password !== DEMO_LOGIN_PASSWORD) {
    return null
  }
  return findDemoUser(users, email)
}

export function authenticateDemoGoogle(users: K12User[], email: string): K12User | null {
  const user = findDemoUser(users, email)
  if (!user) {
    return null
  }
  if (!normalizeK12Email(user.email).endsWith('.edu')) {
    return null
  }
  return user
}

export function getK12HomePath(role: K12Role): '/' | '/settings/plugins' | '/settings/k12-admin' {
  if (role === 'student') {
    return '/'
  }
  if (role === 'teacher') {
    return '/settings/plugins'
  }
  return '/settings/k12-admin'
}

export function isStudentSettingsKeyAllowed(key: string | undefined): boolean {
  return !key || key === 'k12-login' || key === 'plugins'
}
