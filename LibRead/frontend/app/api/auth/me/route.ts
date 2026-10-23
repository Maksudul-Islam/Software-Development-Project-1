import { NextRequest, NextResponse } from 'next/server'
import {
  serializeUser,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
  }

  const session = verifySessionToken(token)

  if (!session) {
    const response = NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    // Clear invalid or expired cookie
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        userId: session.userId,
      },
      include: {
        batch: true,
      },
    })

    if (!user) {
      const response = NextResponse.json({ authenticated: false, user: null }, { status: 401 })
      response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }

    return NextResponse.json({
      authenticated: true,
      user: serializeUser(user),
    })
  } catch (error) {
    console.error('Session verification error:', error)
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 })
  }
}
