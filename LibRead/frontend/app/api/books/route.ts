import { NextRequest, NextResponse } from 'next/server'
import { buildPublicBookWhere } from '@/lib/public-book-query'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const searchValues = searchParams.getAll('search')
  const categoryValues = searchParams.getAll('category')
  const mainCategoryValues = searchParams.getAll('mainCategoryId')
  const subcategoryValues = searchParams.getAll('subcategoryId')
  const pageValues = searchParams.getAll('page')
  const pageSizeValues = searchParams.getAll('pageSize')

  if (
    searchValues.length > 1 ||
    categoryValues.length > 1 ||
    mainCategoryValues.length > 1 ||
    subcategoryValues.length > 1 ||
    pageValues.length > 1 ||
    pageSizeValues.length > 1
  ) {
    return NextResponse.json(
      { error: 'Each query parameter may be provided only once.' },
      { status: 400 },
    )
  }

  const search = searchValues[0]?.trim() ?? ''
  const category = categoryValues[0]?.trim() ?? ''
  const mainCategoryParam = mainCategoryValues[0]
  const subcategoryParam = subcategoryValues[0]
  const page = pageValues.length === 0 ? 1 : Number(pageValues[0])
  const pageSize = pageSizeValues.length === 0 ? 24 : Number(pageSizeValues[0])
  const mainCategoryId =
    mainCategoryParam && /^\d+$/.test(mainCategoryParam) ? Number(mainCategoryParam) : null
  const subcategoryId =
    subcategoryParam && /^\d+$/.test(subcategoryParam) ? Number(subcategoryParam) : null

  if (
    search.length > 355 ||
    category.length > 50 ||
    (mainCategoryParam !== undefined &&
      (!mainCategoryId || !Number.isSafeInteger(mainCategoryId))) ||
    (subcategoryParam !== undefined &&
      (!subcategoryId || !Number.isSafeInteger(subcategoryId))) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    !Number.isSafeInteger((page - 1) * pageSize)
  ) {
    return NextResponse.json(
      { error: 'One or more catalog filters or pagination values are invalid.' },
      { status: 400 },
    )
  }

  try {
    if (subcategoryId !== null) {
      const subcategory = await prisma.subcategory.findUnique({
        where: { subcategoryId },
        select: { mainCategoryId: true },
      })
      if (!subcategory) {
        return NextResponse.json({ error: 'Subcategory not found.' }, { status: 404 })
      }
      if (mainCategoryId !== null && subcategory.mainCategoryId !== mainCategoryId) {
        return NextResponse.json(
          { error: 'The selected subcategory does not belong to the selected main category.' },
          { status: 400 },
        )
      }
    }

    const where = buildPublicBookWhere({
      search,
      legacyCategory: category,
      mainCategoryId,
      subcategoryId,
    })

    const [books, total, categories] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy: { title: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      }),
      prisma.book.count({ where }),
      prisma.mainCategory.findMany({
        orderBy: { name: 'asc' },
        select: {
          mainCategoryId: true,
          name: true,
          subcategories: {
            orderBy: { name: 'asc' },
            select: { subcategoryId: true, name: true },
          },
        },
      }),
    ])

    return NextResponse.json({
      books: books.map(({ mainCategoryAssignments, ...book }) => ({
        ...book,
        mainCategories: mainCategoryAssignments.map((assignment) => ({
          mainCategoryId: assignment.mainCategoryId,
          name: assignment.mainCategory.name,
          subcategories: assignment.subcategories.map(({ subcategoryId, subcategory }) => ({
            subcategoryId,
            name: subcategory.name,
          })),
        })),
      })),
      categories,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch books:', error)
    return NextResponse.json(
      { error: 'Unable to load books. Please try again later.' },
      { status: 500 },
    )
  }
}
