import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const searchValues = searchParams.getAll('search')
  const categoryValues = searchParams.getAll('category')

  if (searchValues.length > 1 || categoryValues.length > 1) {
    return NextResponse.json(
      { error: 'Each query parameter may be provided only once.' },
      { status: 400 },
    )
  }

  const search = searchValues[0]?.trim() ?? ''
  const category = categoryValues[0]?.trim() ?? ''

  if (search.length > 355 || category.length > 50) {
    return NextResponse.json(
      { error: 'The search or category query parameter is too long.' },
      { status: 400 },
    )
  }

  const where: Prisma.BookWhereInput = {}

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { author: { contains: search } },
    ]
  }

  if (category) {
    where.category = category
  }

  try {
    const books = await prisma.book.findMany({
      where,
      orderBy: { title: 'asc' },
      select: {
        bookId: true,
        title: true,
        author: true,
        category: true,
        isDownloadable: true,
      },
    })

    return NextResponse.json({ books }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch books:', error)
    return NextResponse.json(
      { error: 'Unable to load books. Please try again later.' },
      { status: 500 },
    )
  }
}
