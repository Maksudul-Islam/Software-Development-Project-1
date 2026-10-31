import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin, hasSameOrigin } from '@/lib/admin-api'
import { isPrismaErrorCode, parseCategoryName, parsePositiveId } from '@/lib/category-validation'
import { prisma } from '@/lib/prisma'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'subcategory list')
  if (!authorization.authorized) return authorization.response

  try {
    const subcategories = await prisma.subcategory.findMany({
      orderBy: [{ mainCategory: { name: 'asc' } }, { name: 'asc' }],
      select: {
        subcategoryId: true,
        mainCategoryId: true,
        name: true,
        mainCategory: { select: { name: true } },
      },
    })
    return NextResponse.json({ subcategories }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch subcategories:', error)
    return NextResponse.json({ error: 'Unable to load subcategories.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'A same-origin request is required.' }, { status: 403 })
  }

  const authorization = await authorizeAdmin(request, 'subcategory creation')
  if (!authorization.authorized) return authorization.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 })
  }
  if (
    !isRecord(body) ||
    Object.keys(body).length !== 2 ||
    !Object.hasOwn(body, 'name') ||
    !Object.hasOwn(body, 'mainCategoryId')
  ) {
    return NextResponse.json(
      { error: 'The request body must contain a name and mainCategoryId.' },
      { status: 400 },
    )
  }
  const parsedName = parseCategoryName(body.name)
  const mainCategoryId = parsePositiveId(body.mainCategoryId)
  if (!parsedName || !mainCategoryId) {
    return NextResponse.json({ error: 'A valid 1–100 character name and parent category are required.' }, { status: 400 })
  }

  try {
    const parent = await prisma.mainCategory.findUnique({
      where: { mainCategoryId },
      select: { mainCategoryId: true },
    })
    if (!parent) return NextResponse.json({ error: 'Parent main category not found.' }, { status: 404 })

    const subcategory = await prisma.subcategory.create({
      data: { ...parsedName, mainCategoryId },
      select: { subcategoryId: true, mainCategoryId: true, name: true },
    })
    return NextResponse.json({ subcategory }, { status: 201 })
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json({ error: 'That subcategory already exists under this main category.' }, { status: 409 })
    }
    console.error('Failed to create subcategory:', error)
    return NextResponse.json({ error: 'Unable to create the subcategory.' }, { status: 500 })
  }
}
