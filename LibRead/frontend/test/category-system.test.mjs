import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adminRoleStatus,
  isPrismaErrorCode,
  parseBookCategoryAssignment,
  parseBookEditInput,
  parseCategoryName,
  parseIdList,
  validateBookCategoryAssignment,
} from '../lib/category-validation.ts'
import { saveBookCategoryAssignments } from '../lib/book-category-service.ts'
import { buildPublicBookWhere } from '../lib/public-book-query.ts'

test('category names are trimmed, normalized, and bounded', () => {
  assert.deepEqual(parseCategoryName('  Computing  '), {
    name: 'Computing',
    normalizedName: 'computing',
  })
  assert.equal(parseCategoryName('  '), null)
  assert.equal(parseCategoryName('x'.repeat(101)), null)
})

test('assignment payload rejects duplicate IDs and malformed values', () => {
  assert.deepEqual(parseIdList([1, 2]), [1, 2])
  assert.equal(parseIdList([1, 1]), null)
  assert.equal(parseIdList(['1']), null)
  assert.equal(
    parseBookCategoryAssignment({
      mainCategoryIds: [1, 1],
      primaryMainCategoryId: 1,
      subcategoryIds: [],
    }),
    null,
  )
})

test('primary category must be selected and subcategories must belong to selected parents', () => {
  const valid = {
    mainCategoryIds: [3, 5],
    primaryMainCategoryId: 5,
    subcategoryIds: [21],
  }
  assert.equal(
    validateBookCategoryAssignment(valid, [{ subcategoryId: 21, mainCategoryId: 5 }]),
    null,
  )
  assert.match(
    validateBookCategoryAssignment({ ...valid, primaryMainCategoryId: 7 }, [
      { subcategoryId: 21, mainCategoryId: 5 },
    ]) ?? '',
    /primary category/i,
  )
  assert.match(
    validateBookCategoryAssignment(valid, [{ subcategoryId: 21, mainCategoryId: 9 }]) ?? '',
    /belong to a selected/i,
  )
  assert.match(validateBookCategoryAssignment(valid, []) ?? '', /could not be found/i)
})

test('book edit input trims and validates metadata with category assignments', () => {
  const input = {
    title: '  Systems Design  ',
    author: '  A. Writer ',
    mainCategoryIds: [3, 5],
    primaryMainCategoryId: 5,
    subcategoryIds: [21],
  }
  assert.deepEqual(parseBookEditInput(input), {
    title: 'Systems Design',
    author: 'A. Writer',
    mainCategoryIds: [3, 5],
    primaryMainCategoryId: 5,
    subcategoryIds: [21],
  })
  assert.equal(parseBookEditInput({ ...input, title: '  ' }), null)
  assert.equal(parseBookEditInput({ ...input, title: 'x'.repeat(256) }), null)
  assert.equal(parseBookEditInput({ ...input, author: 'x'.repeat(101) }), null)
  assert.equal(parseBookEditInput({ ...input, mainCategoryIds: [3, 3] }), null)
  assert.notEqual(parseBookEditInput({ ...input, primaryMainCategoryId: 8 }), null)
  assert.equal(parseBookEditInput({ ...input, unexpected: true }), null)
})

test('Admin authorization role mapping rejects unauthenticated and non-Admin roles', () => {
  assert.equal(adminRoleStatus(null), 401)
  assert.equal(adminRoleStatus('Student'), 403)
  assert.equal(adminRoleStatus('Admin'), null)
})

test('database uniqueness and foreign-key errors are recognized for conflict responses', () => {
  assert.equal(isPrismaErrorCode({ code: 'P2002' }, 'P2002'), true)
  assert.equal(isPrismaErrorCode({ code: 'P2003' }, 'P2002'), false)
  assert.equal(isPrismaErrorCode(new Error('database error'), 'P2002'), false)
})

test('book assignment replacement preserves only selected rows and updates the primary', async () => {
  const calls = []
  const categories = [2, 4]
  const subcategories = [{ subcategoryId: 19, mainCategoryId: 4 }]
  const transaction = {
    mainCategory: {
      findMany: async ({ where }) =>
        categories
          .filter((id) => where.mainCategoryId.in.includes(id))
          .map((mainCategoryId) => ({ mainCategoryId })),
    },
    subcategory: {
      findMany: async ({ where }) =>
        subcategories.filter(({ subcategoryId }) =>
          where.subcategoryId.in.includes(subcategoryId),
        ),
    },
    bookMainCategory: {
      deleteMany: async ({ where }) => calls.push(['delete', where]),
      createMany: async ({ data }) => calls.push(['main', data]),
    },
    bookSubcategoryAssignment: {
      createMany: async ({ data }) => calls.push(['sub', data]),
    },
    book: {
      update: async ({ where, data }) => calls.push(['primary', where, data]),
    },
  }

  assert.equal(
    await saveBookCategoryAssignments(transaction, 31, {
      mainCategoryIds: [2, 4],
      primaryMainCategoryId: 4,
      subcategoryIds: [19],
    }),
    null,
  )
  assert.deepEqual(calls, [
    ['delete', { bookId: 31 }],
    ['main', [{ bookId: 31, mainCategoryId: 2 }, { bookId: 31, mainCategoryId: 4 }]],
    ['sub', [{ bookId: 31, mainCategoryId: 4, subcategoryId: 19 }]],
    ['primary', { bookId: 31 }, { primaryMainCategoryId: 4 }],
  ])
})

test('book assignment replacement rejects invalid category membership before writes', async () => {
  const calls = []
  const transaction = {
    mainCategory: { findMany: async () => [{ mainCategoryId: 2 }] },
    subcategory: {
      findMany: async () => [{ subcategoryId: 12, mainCategoryId: 9 }],
    },
    bookMainCategory: {
      deleteMany: async () => calls.push('delete'),
      createMany: async () => calls.push('main'),
    },
    bookSubcategoryAssignment: { createMany: async () => calls.push('sub') },
    book: { update: async () => calls.push('primary') },
  }

  const error = await saveBookCategoryAssignments(transaction, 31, {
    mainCategoryIds: [2],
    primaryMainCategoryId: 2,
    subcategoryIds: [12],
  })
  assert.match(error ?? '', /belong to a selected/i)
  assert.deepEqual(calls, [])
})

test('public catalog query remains Published-only and filters normalized relations', () => {
  const mainOnly = buildPublicBookWhere({
    search: 'systems',
    legacyCategory: '',
    mainCategoryId: 6,
    subcategoryId: null,
  })
  assert.equal(mainOnly.status, 'Published')
  assert.deepEqual(mainOnly.OR, [
    { title: { contains: 'systems' } },
    { author: { contains: 'systems' } },
  ])
  assert.deepEqual(mainOnly.mainCategoryAssignments, { some: { mainCategoryId: 6 } })

  const mainAndSub = buildPublicBookWhere({
    search: '',
    legacyCategory: '',
    mainCategoryId: 6,
    subcategoryId: 27,
  })
  assert.deepEqual(mainAndSub.mainCategoryAssignments, {
    some: {
      mainCategoryId: 6,
      subcategories: { some: { subcategoryId: 27 } },
    },
  })
})
