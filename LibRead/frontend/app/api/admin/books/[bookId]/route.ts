import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/auth'
import {
  InvalidPdfStorageKeyError,
  openStoredPdf,
  removeStoredPdf,
  StoredPdfNotFoundError,
} from '@/lib/pdf-storage'
import { saveBookCategoryAssignments } from '@/lib/book-category-service'
import { isPrismaErrorCode, parseBookEditInput } from '@/lib/category-validation'
import { prisma } from '@/lib/prisma'

const BOOK_STATUSES = ['Draft', 'Pending', 'Published'] as const
type BookStatus = (typeof BOOK_STATUSES)[number]

function isBookStatus(value: unknown): value is BookStatus {
  return BOOK_STATUSES.some((status) => status === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId: bookIdParam } = await params

  if (!/^\d+$/.test(bookIdParam)) {
    return NextResponse.json({ error: 'A valid book ID is required.' }, { status: 400 })
  }

  const bookId = Number(bookIdParam)
  if (!Number.isSafeInteger(bookId) || bookId < 1) {
    return NextResponse.json({ error: 'A valid book ID is required.' }, { status: 400 })
  }

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
    console.error('Failed to authorize book status update:', error)
    return NextResponse.json(
      { error: 'Unable to update the book status. Please try again later.' },
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

  if (isRecord(body) && Object.hasOwn(body, 'status')) {
    if (Object.keys(body).length !== 1 || !isBookStatus(body.status)) {
      return NextResponse.json(
        { error: 'The request body must contain only a supported status.' },
        { status: 400 },
      )
    }

    const status = body.status

    if (status === 'Published') {
      let book: { pdfFilePath: string } | null
      try {
        book = await prisma.book.findUnique({
          where: { bookId },
          select: { pdfFilePath: true },
        })
      } catch (error) {
        console.error('Failed to validate book PDF before publication:', error)
        return NextResponse.json(
          { error: 'Unable to verify the book PDF. Please try again later.' },
          { status: 500 },
        )
      }

      if (!book) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
      }

      let file: Awaited<ReturnType<typeof openStoredPdf>>['file'] | undefined
      try {
        const storedPdf = await openStoredPdf(book.pdfFilePath)
        file = storedPdf.file
        await file.close()
        file = undefined
      } catch (error) {
        if (file) {
          try {
            await file.close()
          } catch {
            console.error('Failed to close book PDF after publication validation.')
          }
        }

        if (error instanceof InvalidPdfStorageKeyError || error instanceof StoredPdfNotFoundError) {
          return NextResponse.json(
            { error: 'A valid, non-empty stored PDF is required before publishing this book.' },
            { status: 400 },
          )
        }

        console.error('Failed to validate book PDF before publication:', error)
        return NextResponse.json(
          { error: 'Unable to verify the book PDF. Please try again later.' },
          { status: 500 },
        )
      }
    }

    try {
      const result = await prisma.book.updateMany({
        where: { bookId },
        data: { status },
      })

      if (result.count === 0) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
      }

      return NextResponse.json({ book: { bookId, status } }, { status: 200 })
    } catch (error) {
      console.error('Failed to update book publication status:', error)
      return NextResponse.json(
        { error: 'Unable to update the book status. Please try again later.' },
        { status: 500 },
      )
    }
  }

  const input = parseBookEditInput(body)
  if (!input) {
    return NextResponse.json(
      { error: 'Provide a valid title, author, and category assignment.' },
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

      const categoryError = await saveBookCategoryAssignments(transaction, bookId, input)
      if (categoryError) return { error: categoryError }

      const updatedBook = await transaction.book.update({
        where: { bookId },
        data: { title: input.title, author: input.author },
        select: { bookId: true, title: true, author: true },
      })
      return { error: null, book: updatedBook }
    })

    if (result.error === 'Book not found.') {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(
      { book: result.book, message: 'Book details and categories updated.' },
      { status: 200 },
    )
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2003')) {
      return NextResponse.json(
        { error: 'A selected category is no longer available.' },
        { status: 400 },
      )
    }
    if (isPrismaErrorCode(error, 'P2025')) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
    }
    console.error('Failed to update book details and categories:', error)
    return NextResponse.json(
      { error: 'Unable to update the book. Please try again later.' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId: bookIdParam } = await params

  if (!/^\d+$/.test(bookIdParam)) {
    return NextResponse.json({ error: 'A valid book ID is required.' }, { status: 400 })
  }

  const bookId = Number(bookIdParam)
  if (!Number.isSafeInteger(bookId) || bookId < 1) {
    return NextResponse.json({ error: 'A valid book ID is required.' }, { status: 400 })
  }

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
    console.error('Failed to authorize book deletion:', error)
    return NextResponse.json(
      { error: 'Unable to delete the book. Please try again later.' },
      { status: 500 },
    )
  }

  let deletedBook: { pdfFilePath: string } | null
  try {
    deletedBook = await prisma.$transaction(async (transaction) => {
      const book = await transaction.book.findUnique({
        where: { bookId },
        select: { pdfFilePath: true },
      })

      if (!book) return null

      await transaction.book.delete({ where: { bookId } })
      return book
    })
  } catch (error) {
    console.error('Failed to delete book record:', error)
    return NextResponse.json(
      { error: 'Unable to delete the book. Please try again later.' },
      { status: 500 },
    )
  }

  if (!deletedBook) {
    return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
  }

  if (!deletedBook.pdfFilePath) {
    return NextResponse.json(
      { bookDeleted: true, message: 'Book record deleted. No PDF was associated.' },
      { status: 200 },
    )
  }

  try {
    const remainingReferences = await prisma.book.count({
      where: { pdfFilePath: deletedBook.pdfFilePath },
    })

    if (remainingReferences > 0) {
      return NextResponse.json(
        {
          bookDeleted: true,
          message: 'Book record deleted. The PDF was retained because another book references it.',
        },
        { status: 200 },
      )
    }

    await removeStoredPdf(deletedBook.pdfFilePath)
    return NextResponse.json(
      { bookDeleted: true, message: 'Book record deleted. Unshared PDF storage cleanup completed.' },
      { status: 200 },
    )
  } catch (error) {
    console.error('Book record was deleted, but PDF cleanup failed:', error)
    return NextResponse.json(
      {
        error: 'The book record was deleted, but unshared PDF cleanup could not be completed.',
        bookDeleted: true,
        pdfCleanupFailed: true,
      },
      { status: 500 },
    )
  }
}
