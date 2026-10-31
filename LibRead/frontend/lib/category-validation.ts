export type BookCategoryAssignmentInput = {
  mainCategoryIds: number[]
  primaryMainCategoryId: number
  subcategoryIds: number[]
}

export type BookEditInput = BookCategoryAssignmentInput & {
  title: string
  author: string
}

export function parsePositiveId(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    return null
  }
  return value
}

export function parseIdList(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null

  const ids = value.map(parsePositiveId)
  if (ids.some((id) => id === null)) return null

  const validIds = ids as number[]
  return new Set(validIds).size === validIds.length ? validIds : null
}

export function parseCategoryName(value: unknown): { name: string; normalizedName: string } | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  if (!name || name.length > 100) return null
  return { name, normalizedName: name.toLowerCase() }
}

export function parseBookCategoryAssignment(
  value: unknown,
): BookCategoryAssignmentInput | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

  const body = value as Record<string, unknown>
  if (
    Object.keys(body).length !== 3 ||
    !Object.hasOwn(body, 'mainCategoryIds') ||
    !Object.hasOwn(body, 'primaryMainCategoryId') ||
    !Object.hasOwn(body, 'subcategoryIds')
  ) {
    return null
  }

  const mainCategoryIds = parseIdList(body.mainCategoryIds)
  const primaryMainCategoryId = parsePositiveId(body.primaryMainCategoryId)
  const subcategoryIds = parseIdList(body.subcategoryIds)
  if (!mainCategoryIds || mainCategoryIds.length === 0 || !primaryMainCategoryId || !subcategoryIds) {
    return null
  }

  return { mainCategoryIds, primaryMainCategoryId, subcategoryIds }
}

export function parseBookEditInput(value: unknown): BookEditInput | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

  const body = value as Record<string, unknown>
  const expectedKeys = [
    'title',
    'author',
    'mainCategoryIds',
    'primaryMainCategoryId',
    'subcategoryIds',
  ]
  if (
    Object.keys(body).length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(body, key)) ||
    typeof body.title !== 'string' ||
    typeof body.author !== 'string'
  ) {
    return null
  }

  const title = body.title.trim()
  const author = body.author.trim()
  if (!title || title.length > 255 || !author || author.length > 100) return null

  const assignments = parseBookCategoryAssignment({
    mainCategoryIds: body.mainCategoryIds,
    primaryMainCategoryId: body.primaryMainCategoryId,
    subcategoryIds: body.subcategoryIds,
  })
  if (!assignments) return null

  return { title, author, ...assignments }
}

export function validateBookCategoryAssignment(
  input: BookCategoryAssignmentInput,
  subcategories: ReadonlyArray<{ subcategoryId: number; mainCategoryId: number }>,
): string | null {
  const mainCategoryIds = new Set(input.mainCategoryIds)
  if (!mainCategoryIds.has(input.primaryMainCategoryId)) {
    return 'The primary category must be one of the selected main categories.'
  }

  if (subcategories.length !== input.subcategoryIds.length) {
    return 'One or more selected subcategories could not be found.'
  }

  if (subcategories.some((subcategory) => !mainCategoryIds.has(subcategory.mainCategoryId))) {
    return 'Each selected subcategory must belong to a selected main category.'
  }

  return null
}

export function adminRoleStatus(role: unknown): 401 | 403 | null {
  if (role === null || role === undefined) return 401
  return role === 'Admin' ? null : 403
}

export function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  )
}
