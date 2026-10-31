import type { Prisma } from '@prisma/client'

export function buildPublicBookWhere(input: {
  search: string
  legacyCategory: string
  mainCategoryId: number | null
  subcategoryId: number | null
}): Prisma.BookWhereInput {
  const where: Prisma.BookWhereInput = { status: 'Published' }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search } },
      { author: { contains: input.search } },
    ]
  }
  if (input.legacyCategory) where.category = input.legacyCategory

  if (input.mainCategoryId !== null && input.subcategoryId !== null) {
    where.mainCategoryAssignments = {
      some: {
        mainCategoryId: input.mainCategoryId,
        subcategories: { some: { subcategoryId: input.subcategoryId } },
      },
    }
  } else if (input.mainCategoryId !== null) {
    where.mainCategoryAssignments = { some: { mainCategoryId: input.mainCategoryId } }
  } else if (input.subcategoryId !== null) {
    where.mainCategoryAssignments = {
      some: { subcategories: { some: { subcategoryId: input.subcategoryId } } },
    }
  }

  return where
}
