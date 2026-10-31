import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin, parseRequestId } from '@/lib/admin-api'
import { saveBookCategoryAssignments } from '@/lib/book-category-service'
import { parseBookCategoryAssignment, isPrismaErrorCode } from '@/lib/category-validation'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const authorization = await authorizeAdmin(request, 'book category lookup')
  if (!authorization.authorized) return authorization.response
  const bookId = parseRequestId((await params).bookId)
  if (!bookId) return NextResponse.json({ error: 'A valid book ID is required.' }, { status: 400 })

  try {
    const book = await prisma.book.findUnique({
      where: { bookId },
      select: {
        bookId: true,
        primaryMainCategoryId: true,
        mainCategoryAssignments: {
          orderBy: { mainCategory: { name: 'asc' } },
          select: {
            mainCategoryId: true,
            mainCategory: { select: { name: true } },
            subcategories: {
              orderBy: { subcategory: { name: 'asc' } },
              select: {
                subcategoryId: true,
                subcategory: { select: { name: true } },
              },
            },
          },
        },
      },
    })
    if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
    return NextResponse.json({ book }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch book category assignments:', error)
    return NextResponse.json({ error: 'Unable to load book categories.' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const authorization = await authorizeAdmin(request, 'book category update')
  if (!authorization.authorized) return authorization.response
  const bookId = parseRequestId((await params).bookId)
  if (!bookId) return NextResponse.json({ error: 'A valid book ID is required.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 })
  }
  const input = parseBookCategoryAssignment(body)
  if (!input) {
    return NextResponse.json(
      { error: 'Select at least one main category, one selected primary category, and valid subcategories.' },
      { status: 400 },
    )
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const book = await transaction.book.findUnique({
        where: { bookId },
        select: { bookId: true },
      })
      if (!book) return { error: 'Book not found.' as const }

      const error = await saveBookCategoryAssignments(transaction, bookId, input)
      return error ? { error } : { error: null }
    })
    if (result.error === 'Book not found.') {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ message: 'Book category assignments updated.' }, { status: 200 })
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2003')) {
      return NextResponse.json({ error: 'A selected category is still referenced and cannot be assigned.' }, { status: 409 })
    }
    console.error('Failed to update book category assignments:', error)
    return NextResponse.json({ error: 'Unable to update book categories.' }, { status: 500 })
  }
}
