import type { Prisma } from '@prisma/client'
import {
  validateBookCategoryAssignment,
  type BookCategoryAssignmentInput,
} from './category-validation.ts'

export class InvalidBookCategoryAssignmentError extends Error {}

export async function saveBookCategoryAssignments(
  transaction: Prisma.TransactionClient,
  bookId: number,
  input: BookCategoryAssignmentInput,
): Promise<string | null> {
  const categories = await transaction.mainCategory.findMany({
    where: { mainCategoryId: { in: input.mainCategoryIds } },
    select: { mainCategoryId: true },
  })
  if (categories.length !== input.mainCategoryIds.length) {
    return 'One or more selected main categories could not be found.'
  }
  if (!input.mainCategoryIds.includes(input.primaryMainCategoryId)) {
    return 'The primary category must be one of the selected main categories.'
  }

  const subcategories = input.subcategoryIds.length
    ? await transaction.subcategory.findMany({
        where: { subcategoryId: { in: input.subcategoryIds } },
        select: { subcategoryId: true, mainCategoryId: true },
      })
    : []
  const validationError = validateBookCategoryAssignment(input, subcategories)
  if (validationError) return validationError

  await transaction.bookMainCategory.deleteMany({ where: { bookId } })
  await transaction.bookMainCategory.createMany({
    data: input.mainCategoryIds.map((mainCategoryId) => ({ bookId, mainCategoryId })),
  })
  if (subcategories.length) {
    await transaction.bookSubcategoryAssignment.createMany({
      data: subcategories.map(({ subcategoryId, mainCategoryId }) => ({
        bookId,
        mainCategoryId,
        subcategoryId,
      })),
    })
  }
  await transaction.book.update({
    where: { bookId },
    data: { primaryMainCategoryId: input.primaryMainCategoryId },
  })
  return null
}
