import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin, hasSameOrigin } from '@/lib/admin-api'
import { parseCategoryName, isPrismaErrorCode } from '@/lib/category-validation'
import { prisma } from '@/lib/prisma'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'category list')
  if (!authorization.authorized) return authorization.response

  try {
    const categories = await prisma.mainCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        mainCategoryId: true,
        name: true,
        subcategories: {
          orderBy: { name: 'asc' },
          select: { subcategoryId: true, mainCategoryId: true, name: true },
        },
      },
    })
    return NextResponse.json({ categories }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch main categories:', error)
    return NextResponse.json({ error: 'Unable to load categories.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'A same-origin request is required.' }, { status: 403 })
  }

  const authorization = await authorizeAdmin(request, 'category creation')
  if (!authorization.authorized) return authorization.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 })
  }
  if (!isRecord(body) || Object.keys(body).length !== 1) {
    return NextResponse.json({ error: 'The request body must contain only a category name.' }, { status: 400 })
  }
  const parsedName = parseCategoryName(body.name)
  if (!parsedName) {
    return NextResponse.json({ error: 'Category name must contain 1–100 characters.' }, { status: 400 })
  }

  try {
    const category = await prisma.mainCategory.create({ data: parsedName })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json({ error: 'A main category with that name already exists.' }, { status: 409 })
    }
    console.error('Failed to create main category:', error)
    return NextResponse.json({ error: 'Unable to create the category.' }, { status: 500 })
  }
}
