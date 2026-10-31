import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin, parseRequestId } from '@/lib/admin-api'
import { isPrismaErrorCode, parseCategoryName } from '@/lib/category-validation'
import { prisma } from '@/lib/prisma'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const authorization = await authorizeAdmin(request, 'category update')
  if (!authorization.authorized) return authorization.response
  const categoryId = parseRequestId((await params).categoryId)
  if (!categoryId) return NextResponse.json({ error: 'A valid category ID is required.' }, { status: 400 })

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
    const category = await prisma.mainCategory.update({
      where: { mainCategoryId: categoryId },
      data: parsedName,
      select: { mainCategoryId: true, name: true },
    })
    return NextResponse.json({ category }, { status: 200 })
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json({ error: 'A main category with that name already exists.' }, { status: 409 })
    }
    if (isPrismaErrorCode(error, 'P2025')) {
      return NextResponse.json({ error: 'Main category not found.' }, { status: 404 })
    }
    console.error('Failed to update main category:', error)
    return NextResponse.json({ error: 'Unable to update the category.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const authorization = await authorizeAdmin(request, 'category deletion')
  if (!authorization.authorized) return authorization.response
  const categoryId = parseRequestId((await params).categoryId)
  if (!categoryId) return NextResponse.json({ error: 'A valid category ID is required.' }, { status: 400 })

  try {
    const category = await prisma.mainCategory.findUnique({
      where: { mainCategoryId: categoryId },
      select: {
        mainCategoryId: true,
        _count: { select: { primaryBooks: true, bookAssignments: true, subcategories: true } },
      },
    })
    if (!category) return NextResponse.json({ error: 'Main category not found.' }, { status: 404 })
    if (Object.values(category._count).some((count) => count > 0)) {
      return NextResponse.json(
        { error: 'Remove this category’s book assignments and subcategories before deleting it.' },
        { status: 409 },
      )
    }

    await prisma.mainCategory.delete({ where: { mainCategoryId: categoryId } })
    return NextResponse.json({ message: 'Main category deleted.' }, { status: 200 })
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2003')) {
      return NextResponse.json({ error: 'This category is still referenced and cannot be deleted.' }, { status: 409 })
    }
    console.error('Failed to delete main category:', error)
    return NextResponse.json({ error: 'Unable to delete the category.' }, { status: 500 })
  }
}
