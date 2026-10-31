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
    const book = await prisma.book.findFirst({
      where: { bookId, status: 'Published' },
      select: {
        bookId: true,
        title: true,
        author: true,
        category: true,
        isDownloadable: true,
        primaryMainCategory: { select: { mainCategoryId: true, name: true } },
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

    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
    }

    const { mainCategoryAssignments, ...bookDetails } = book
    return NextResponse.json({
      book: {
        ...bookDetails,
        mainCategories: mainCategoryAssignments.map((assignment) => ({
          mainCategoryId: assignment.mainCategoryId,
          name: assignment.mainCategory.name,
          subcategories: assignment.subcategories.map(({ subcategoryId, subcategory }) => ({
            subcategoryId,
            name: subcategory.name,
          })),
        })),
      },
    }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch book:', error)
    return NextResponse.json(
      { error: 'Unable to load the book. Please try again later.' },
      { status: 500 },
    )
  }
}
