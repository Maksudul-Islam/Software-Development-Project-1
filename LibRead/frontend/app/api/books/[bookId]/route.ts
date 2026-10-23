import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
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

  try {
    const book = await prisma.book.findUnique({
      where: { bookId },
      select: {
        bookId: true,
        title: true,
        author: true,
        category: true,
        isDownloadable: true,
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
    }

    return NextResponse.json({ book }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch book:', error)
    return NextResponse.json(
      { error: 'Unable to load the book. Please try again later.' },
      { status: 500 },
    )
  }
}
