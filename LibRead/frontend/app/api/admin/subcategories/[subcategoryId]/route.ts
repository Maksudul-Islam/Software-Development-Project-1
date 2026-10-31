import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin, parseRequestId } from '@/lib/admin-api'
import { isPrismaErrorCode, parseCategoryName, parsePositiveId } from '@/lib/category-validation'
import { prisma } from '@/lib/prisma'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ subcategoryId: string }> },
) {
  const authorization = await authorizeAdmin(request, 'subcategory update')
  if (!authorization.authorized) return authorization.response
  const subcategoryId = parseRequestId((await params).subcategoryId)
  if (!subcategoryId) return NextResponse.json({ error: 'A valid subcategory ID is required.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 })
  }
  if (
    !isRecord(body) ||
    Object.keys(body).some((key) => key !== 'name' && key !== 'mainCategoryId') ||
    !Object.hasOwn(body, 'name')
  ) {
    return NextResponse.json({ error: 'The request body must contain a name and optional mainCategoryId.' }, { status: 400 })
  }
  const parsedName = parseCategoryName(body.name)
  const hasParentId = body.mainCategoryId !== undefined
  const parsedParentId = hasParentId ? parsePositiveId(body.mainCategoryId) : undefined
  if (!parsedName || (hasParentId && parsedParentId === null)) {
    return NextResponse.json({ error: 'A valid 1–100 character name and parent category are required.' }, { status: 400 })
  }
  const mainCategoryId = parsedParentId ?? undefined

  try {
    const current = await prisma.subcategory.findUnique({
      where: { subcategoryId },
      select: { mainCategoryId: true, _count: { select: { bookAssignments: true } } },
    })
    if (!current) return NextResponse.json({ error: 'Subcategory not found.' }, { status: 404 })

    const targetParentId = mainCategoryId ?? current.mainCategoryId
    if (targetParentId !== current.mainCategoryId && current._count.bookAssignments > 0) {
      return NextResponse.json(
        { error: 'A subcategory with book assignments cannot be moved to another main category.' },
        { status: 409 },
      )
    }
    if (mainCategoryId !== undefined) {
      const parent = await prisma.mainCategory.findUnique({
        where: { mainCategoryId },
        select: { mainCategoryId: true },
      })
      if (!parent) return NextResponse.json({ error: 'Parent main category not found.' }, { status: 404 })
    }

    const subcategory = await prisma.subcategory.update({
      where: { subcategoryId },
      data: { ...parsedName, ...(mainCategoryId === undefined ? {} : { mainCategoryId }) },
      select: { subcategoryId: true, mainCategoryId: true, name: true },
    })
    return NextResponse.json({ subcategory }, { status: 200 })
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2002')) {
      return NextResponse.json({ error: 'That subcategory already exists under this main category.' }, { status: 409 })
    }
    if (isPrismaErrorCode(error, 'P2003')) {
      return NextResponse.json({ error: 'The selected parent category is still referenced.' }, { status: 409 })
    }
    console.error('Failed to update subcategory:', error)
    return NextResponse.json({ error: 'Unable to update the subcategory.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subcategoryId: string }> },
) {
  const authorization = await authorizeAdmin(request, 'subcategory deletion')
  if (!authorization.authorized) return authorization.response
  const subcategoryId = parseRequestId((await params).subcategoryId)
  if (!subcategoryId) return NextResponse.json({ error: 'A valid subcategory ID is required.' }, { status: 400 })

  try {
    const subcategory = await prisma.subcategory.findUnique({
      where: { subcategoryId },
      select: { _count: { select: { bookAssignments: true } } },
    })
    if (!subcategory) return NextResponse.json({ error: 'Subcategory not found.' }, { status: 404 })
    if (subcategory._count.bookAssignments > 0) {
      return NextResponse.json({ error: 'Remove this subcategory from books before deleting it.' }, { status: 409 })
    }

    await prisma.subcategory.delete({ where: { subcategoryId } })
    return NextResponse.json({ message: 'Subcategory deleted.' }, { status: 200 })
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2003')) {
      return NextResponse.json({ error: 'This subcategory is still assigned and cannot be deleted.' }, { status: 409 })
    }
    console.error('Failed to delete subcategory:', error)
    return NextResponse.json({ error: 'Unable to delete the subcategory.' }, { status: 500 })
  }
}
