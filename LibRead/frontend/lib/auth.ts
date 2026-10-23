import { Department, UserRole } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'node:crypto'

export type DepartmentOption = {
  value: Department
  label: string
}

export function formatDepartment(dept?: Department | string | null): string {
  if (!dept || typeof dept !== 'string') {
    return ''
  }
  return dept.trim().replace(/_/g, ' ')
}

export const DEPARTMENT_OPTIONS: readonly DepartmentOption[] = Object.values(Department).map((dept) => ({
  value: dept as Department,
  label: formatDepartment(dept),
}))

const DEPARTMENT_LOOKUP = new Map<string, Department>()

for (const deptKey of Object.values(Department)) {
  const enumVal = deptKey as Department
  const label = formatDepartment(enumVal)

  DEPARTMENT_LOOKUP.set(enumVal, enumVal)
  DEPARTMENT_LOOKUP.set(enumVal.toLowerCase(), enumVal)
  DEPARTMENT_LOOKUP.set(label, enumVal)
  DEPARTMENT_LOOKUP.set(label.toLowerCase(), enumVal)
}

export const SESSION_COOKIE_NAME = 'libread_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || process.env.DATABASE_URL
  if (!secret) {
    return 'libread-default-development-secret-key-must-be-changed'
  }
  return secret
}

export type SessionPayload = {
  userId: number
  email: string
  role: UserRole
  exp: number
}

export function createSessionToken(user: { userId: number; email: string; role: UserRole }): string {
  const secret = getSessionSecret()
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  const payload: SessionPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    exp,
  }

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret).update(payloadEncoded).digest('base64url')

  return `${payloadEncoded}.${signature}`
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return null
  }

  const [payloadEncoded, signature] = parts
  const secret = getSessionSecret()
  const expectedSignature = createHmac('sha256', secret).update(payloadEncoded).digest('base64url')

  try {
    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null
    }

    const payloadRaw = Buffer.from(payloadEncoded, 'base64url').toString('utf-8')
    const payload = JSON.parse(payloadRaw) as SessionPayload

    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    if (typeof payload.userId !== 'number' || !payload.email || !payload.role) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export type SafeUser = {
  userId: number
  name: string
  email: string
  role: UserRole
  studentId: string | null
  batchId: number | null
  department: Department | null
  batchNumber: number | null
  currentSemester: number | null
}

export function serializeUser(user: {
  userId: number
  name: string
  email: string
  role: UserRole
  studentId: string | null
  batchId: number | null
  batch?: {
    department: Department
    batchNumber: number
    currentSemester: number
  } | null
}): SafeUser {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    batchId: user.batchId,
    department: user.batch?.department ?? null,
    batchNumber: user.batch?.batchNumber ?? null,
    currentSemester: user.batch?.currentSemester ?? null,
  }
}

export type LoginPayload = {
  email?: string
  password?: string
}

export function isLoginPayload(body: unknown): body is LoginPayload {
  return (
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body) &&
    (!('email' in body) || typeof body.email === 'string') &&
    (!('password' in body) || typeof body.password === 'string')
  )
}

export function validateLogin(body: LoginPayload) {
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const errors: string[] = []

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('A valid email address is required.')
  }

  if (!password) {
    errors.push('Password is required.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      email,
      password,
    },
  }
}

export const SIGNUP_ROLES = {
  General_User: UserRole.General_User,
  Student: UserRole.Student,
} as const

export type SignupRole = keyof typeof SIGNUP_ROLES

export type SignupPayload = {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  role?: string
  studentId?: string
  department?: string
  batchNumber?: number | string
}

export function isSignupPayload(body: unknown): body is SignupPayload {
  return (
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body) &&
    (!('name' in body) || typeof body.name === 'string') &&
    (!('email' in body) || typeof body.email === 'string') &&
    (!('password' in body) || typeof body.password === 'string') &&
    (!('confirmPassword' in body) || typeof body.confirmPassword === 'string') &&
    (!('role' in body) || typeof body.role === 'string') &&
    (!('studentId' in body) || typeof body.studentId === 'string') &&
    (!('department' in body) || typeof body.department === 'string') &&
    (!('batchNumber' in body) ||
      typeof body.batchNumber === 'string' ||
      typeof body.batchNumber === 'number')
  )
}

export function parseBatchNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d+)/)
    if (match) {
      return Number.parseInt(match[1], 10)
    }
  }

  return null
}

export function parseDepartment(value: unknown): Department | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const direct = DEPARTMENT_LOOKUP.get(trimmed) ?? DEPARTMENT_LOOKUP.get(trimmed.toLowerCase())
  if (direct) {
    return direct
  }

  const normalizedKey = trimmed.replace(/\s+/g, '_')
  return DEPARTMENT_LOOKUP.get(normalizedKey) ?? DEPARTMENT_LOOKUP.get(normalizedKey.toLowerCase()) ?? null
}

export function validateSignup(body: SignupPayload) {
  const name = body.name?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const confirmPassword = body.confirmPassword ?? ''
  const role = body.role
  const errors: string[] = []

  if (name.length < 2 || name.length > 100) {
    errors.push('Full name must be between 2 and 100 characters.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('A valid email address is required.')
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters.')
  }

  if (password !== confirmPassword) {
    errors.push('Password and confirmation do not match.')
  }

  if (role !== 'General_User' && role !== 'Student') {
    errors.push('Registration is limited to General User or BrIU Student.')
  }

  if (role === 'Student') {
    const studentId = body.studentId?.trim() ?? ''
    const department = parseDepartment(body.department)
    const batchNumber = parseBatchNumber(body.batchNumber)

    if (!studentId || studentId.length > 20) {
      errors.push('A valid Student ID is required.')
    }

    if (!department) {
      errors.push('A valid department is required.')
    }

    if (!batchNumber) {
      errors.push('A valid batch number is required.')
    }

    return {
      errors,
      data: {
        name,
        email,
        password,
        role: UserRole.Student,
        studentId,
        department,
        batchNumber,
      },
    }
  }

  return {
    errors,
    data: {
      name,
      email,
      password,
      role: UserRole.General_User,
      studentId: null,
      department: null,
      batchNumber: null,
    },
  }
}
