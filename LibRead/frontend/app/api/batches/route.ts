import { NextRequest, NextResponse } from 'next/server'
import { parseDepartment } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const departmentParam = request.nextUrl.searchParams.get('department')

  if (!departmentParam || typeof departmentParam !== 'string' || !departmentParam.trim()) {
    return NextResponse.json(
      { error: 'A department query parameter is required.' },
      { status: 400 },
    )
  }

  const department = parseDepartment(departmentParam)

  if (!department) {
    return NextResponse.json(
      { error: 'A valid department is required.' },
      { status: 400 },
    )
  }

  try {
    const batches = await prisma.batch.findMany({
      where: {
        department,
      },
      orderBy: {
        batchNumber: 'asc',
      },
      select: {
        batchId: true,
        batchNumber: true,
        currentSemester: true,
      },
    })

    return NextResponse.json({ batches }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch batches:', error)
    return NextResponse.json(
      { error: 'Unable to load batches. Please try again later.' },
      { status: 500 },
    )
  }
}
