import { Prisma } from '@prisma/client'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { formatDepartment, isSignupPayload, serializeUser, validateSignup } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!isSignupPayload(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { errors, data } = validateSignup(body)

  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], details: errors }, { status: 400 })
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          ...(data.studentId ? [{ studentId: data.studentId }] : []),
        ],
      },
    })

    if (existingUser?.email === data.email) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    if (data.studentId && existingUser?.studentId === data.studentId) {
      return NextResponse.json({ error: 'This Student ID is already registered.' }, { status: 409 })
    }

    let batchId: number | null = null

    if (data.role === 'Student' && data.department && data.batchNumber) {
      const batch = await prisma.batch.findUnique({
        where: {
          department_batchNumber: {
            department: data.department,
            batchNumber: data.batchNumber,
          },
        },
      })

      if (!batch) {
        return NextResponse.json(
          {
            error: `No ${formatDepartment(data.department)} batch ${data.batchNumber} was found. Ask an administrator to create the batch first.`,
          },
          { status: 404 },
        )
      }

      batchId = batch.batchId
    }

    const passwordHash = await hash(data.password, 12)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: passwordHash,
        role: data.role,
        studentId: data.studentId,
        batchId,
      },
      include: {
        batch: true,
      },
    })

    return NextResponse.json(
      {
        message: data.role === 'Student' ? 'BrIU student account created.' : 'Account created.',
        user: serializeUser(user),
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'An account with these details already exists.' }, { status: 409 })
    }

    console.error('Sign-up failed', error)
    return NextResponse.json({ error: 'Unable to create the account right now.' }, { status: 500 })
  }
}
