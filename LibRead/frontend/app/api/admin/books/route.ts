import { NextRequest, NextResponse } from 'next/server'
import {
  InvalidBookCategoryAssignmentError,
  saveBookCategoryAssignments,
} from '@/lib/book-category-service'
import {
  isPrismaErrorCode,
  parseBookCategoryAssignment,
  parseCategoryName,
} from '@/lib/category-validation'
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      select: { role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    }
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
    }

    const books = await prisma.book.findMany({
      orderBy: { title: 'asc' },
      select: {
        bookId: true,
        title: true,
        author: true,
        category: true,
        status: true,
        isDownloadable: true,
        pdfFilePath: true,
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

    return NextResponse.json({
      books: books.map(({ pdfFilePath, mainCategoryAssignments, ...book }) => ({
        ...book,
        hasPdf: Boolean(pdfFilePath),
        mainCategories: mainCategoryAssignments.map((assignment) => ({
          mainCategoryId: assignment.mainCategoryId,
          name: assignment.mainCategory.name,
          subcategories: assignment.subcategories.map(({ subcategoryId, subcategory }) => ({
            subcategoryId,
            name: subcategory.name,
          })),
        })),
      })),
    }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch Admin book list:', error)
    return NextResponse.json(
      { error: 'Unable to load books. Please try again later.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      select: { role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    }
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
    }
  } catch (error) {
    console.error('Failed to authorize book creation:', error)
    return NextResponse.json(
      { error: 'Unable to create the book. Please try again later.' },
      { status: 500 },
    )
  }

  const contentType = request.headers.get('content-type')
  const mediaType = contentType?.split(';', 1)[0].trim().toLowerCase()
  const isJsonMediaType =
    mediaType === 'application/json' ||
    (mediaType !== undefined &&
      /^[!#$%&'*+.^_`|~0-9a-z-]+\/[!#$%&'*+.^_`|~0-9a-z-]+\+json$/.test(mediaType))
  if (!isJsonMediaType) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json.' },
      { status: 415 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 })
  }

  if (
    !isRecord(body) ||
    Object.keys(body).length !== 6 ||
    typeof body.title !== 'string' ||
    typeof body.author !== 'string' ||
    typeof body.category !== 'string' ||
    !Object.hasOwn(body, 'mainCategoryIds') ||
    !Object.hasOwn(body, 'primaryMainCategoryId') ||
    !Object.hasOwn(body, 'subcategoryIds')
  ) {
    return NextResponse.json(
      { error: 'The request body must contain book details and category assignments.' },
      { status: 400 },
    )
  }

  const title = body.title.trim()
  const author = body.author.trim()
  const category = body.category.trim()
  if (
    title.length === 0 || title.length > 255 ||
    author.length === 0 || author.length > 100 ||
    category.length === 0 || category.length > 50
  ) {
    return NextResponse.json(
      { error: 'Title, author, or category is empty or exceeds its allowed length.' },
      { status: 400 },
    )
  }
  const parsedCategory = parseCategoryName(category)
  const assignments = parseBookCategoryAssignment({
    mainCategoryIds: body.mainCategoryIds,
    primaryMainCategoryId: body.primaryMainCategoryId,
    subcategoryIds: body.subcategoryIds,
  })
  if (!parsedCategory || !assignments) {
    return NextResponse.json(
      { error: 'Select at least one main category, a primary category, and valid subcategories.' },
      { status: 400 },
    )
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const book = await transaction.book.create({
        data: {
          title,
          author,
          category,
          pdfFilePath: '',
          isDownloadable: false,
          status: 'Draft',
          uploaderId: session.userId,
          primaryMainCategoryId: assignments.primaryMainCategoryId,
        },
        select: {
          bookId: true,
          title: true,
          author: true,
          category: true,
          status: true,
          isDownloadable: true,
        },
      })
      const assignmentError = await saveBookCategoryAssignments(
        transaction,
        book.bookId,
        assignments,
      )
      if (assignmentError) throw new InvalidBookCategoryAssignmentError(assignmentError)
      return { book, error: null }
    })

    return NextResponse.json({ book: { ...result.book, hasPdf: false } }, { status: 201 })
  } catch (error) {
    if (error instanceof InvalidBookCategoryAssignmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (isPrismaErrorCode(error, 'P2003')) {
      return NextResponse.json({ error: 'A selected category could not be found.' }, { status: 400 })
    }
    console.error('Failed to create book:', error)
    return NextResponse.json(
      { error: 'Unable to create the book. Please try again later.' },
      { status: 500 },
    )
  }
}
