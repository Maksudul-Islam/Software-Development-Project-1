import { compare } from 'bcryptjs'
import { NextResponse } from 'next/server'
import {
  createSessionToken,
  isLoginPayload,
  serializeUser,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  validateLogin,
} from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!isLoginPayload(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { isValid, errors, data } = validateLogin(body)

  if (!isValid) {
    return NextResponse.json({ error: errors[0] ?? 'Invalid credentials.', details: errors }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
      include: {
        batch: true,
      },
    })

    if (!user) {
      // Return generic message to prevent email enumeration
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const isPasswordValid = await compare(data.password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const token = createSessionToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    })

    const safeUser = serializeUser(user)

    const response = NextResponse.json(
      {
        message: 'Signed in successfully.',
        user: safeUser,
      },
      { status: 200 },
    )

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Unable to process sign in right now. Please try again later.' }, { status: 500 })
  }
}
