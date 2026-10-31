import { NextRequest, NextResponse } from 'next/server'
import { adminRoleStatus } from '@/lib/category-validation'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type AdminAuthorization =
  | { authorized: true; userId: number }
  | { authorized: false; response: NextResponse }

export async function authorizeAdmin(
  request: NextRequest,
  operation: string,
): Promise<AdminAuthorization> {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Authentication is required.' }, { status: 401 }),
    }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      select: { role: true },
    })
    const status = adminRoleStatus(user?.role)
    if (status !== null) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: status === 401 ? 'Authentication is required.' : 'Administrator access is required.' },
          { status },
        ),
      }
    }
    return { authorized: true, userId: session.userId }
  } catch (error) {
    console.error(`Failed to authorize ${operation}:`, error)
    return {
      authorized: false,
      response: NextResponse.json(
        { error: `Unable to authorize this ${operation}. Please try again later.` },
        { status: 500 },
      ),
    }
  }
}

export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    const parsedOrigin = new URL(origin)
    return parsedOrigin.origin === origin && parsedOrigin.origin === request.nextUrl.origin
  } catch {
    return false
  }
}

export function parseRequestId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
