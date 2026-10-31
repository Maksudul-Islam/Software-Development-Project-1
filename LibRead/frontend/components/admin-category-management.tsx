'use client'

import { useEffect, useRef, useState } from 'react'
import type { CategoryOption } from '@/components/book-category-selector'

type Props = { onSessionExpired: () => void; onBack: () => void }

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
    ) {
      return data.error
    }
  } catch {
    return fallback
  }
  return fallback
}

export function AdminCategoryManagement({ onSessionExpired, onBack }: Props) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [categoryName, setCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [subcategoryName, setSubcategoryName] = useState('')
  const [parentCategoryId, setParentCategoryId] = useState('')
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null)
  const [editingSubcategoryName, setEditingSubcategoryName] = useState('')

  async function loadCategories() {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch('/api/admin/categories')
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      if (!response.ok) {
        setLoadError(await getErrorMessage(response, 'Unable to load categories.'))
        return
      }
      const data: unknown = await response.json()
      if (
        typeof data !== 'object' ||
        data === null ||
        !('categories' in data) ||
        !Array.isArray(data.categories)
      ) {
        setLoadError('The category response was invalid.')
        return
      }
      setCategories(data.categories as CategoryOption[])
    } catch {
      setLoadError('Unable to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  async function submitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyRef.current) return
    const name = editingCategoryId === null ? categoryName.trim() : editingCategoryName.trim()
    if (!name || name.length > 100) {
      setFeedback('Category name must contain 1–100 characters.')
      return
    }

    busyRef.current = true
    setBusy(true)
    setFeedback('')
    try {
      const response = await fetch(
        editingCategoryId === null
          ? '/api/admin/categories'
          : `/api/admin/categories/${editingCategoryId}`,
        {
          method: editingCategoryId === null ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      )
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      if (!response.ok) {
        setFeedback(await getErrorMessage(response, 'Unable to save the main category.'))
        return
      }
      setCategoryName('')
      setEditingCategoryId(null)
      setEditingCategoryName('')
      setFeedback(editingCategoryId === null ? 'Main category created.' : 'Main category updated.')
      await loadCategories()
    } catch {
      setFeedback('Unable to save the main category. Please try again.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function deleteCategory(category: CategoryOption) {
    if (!window.confirm(`Delete “${category.name}”? Categories with book assignments or subcategories cannot be deleted.`)) {
      return
    }
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setFeedback('')
    try {
      const response = await fetch(`/api/admin/categories/${category.mainCategoryId}`, { method: 'DELETE' })
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      if (!response.ok) {
        setFeedback(await getErrorMessage(response, 'Unable to delete the main category.'))
        return
      }
      setFeedback('Main category deleted.')
      await loadCategories()
    } catch {
      setFeedback('Unable to delete the main category. Please try again.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function submitSubcategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyRef.current) return
    const name = editingSubcategoryId === null ? subcategoryName.trim() : editingSubcategoryName.trim()
    if (!name || name.length > 100) {
      setFeedback('Subcategory name must contain 1–100 characters.')
      return
    }
    if (editingSubcategoryId === null && !parentCategoryId) {
      setFeedback('Select a parent main category.')
      return
    }

    const selectedParentId = Number(parentCategoryId)
    if (!Number.isSafeInteger(selectedParentId) || selectedParentId < 1) {
      setFeedback('Select a parent main category.')
      return
    }

    busyRef.current = true
    setBusy(true)
    setFeedback('')
    try {
      const response = await fetch(
        editingSubcategoryId === null
          ? '/api/admin/subcategories'
          : `/api/admin/subcategories/${editingSubcategoryId}`,
        {
          method: editingSubcategoryId === null ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            { name, mainCategoryId: selectedParentId },
          ),
        },
      )
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      if (!response.ok) {
        setFeedback(await getErrorMessage(response, 'Unable to save the subcategory.'))
        return
      }
      setSubcategoryName('')
      setEditingSubcategoryId(null)
      setEditingSubcategoryName('')
      setFeedback(editingSubcategoryId === null ? 'Subcategory created.' : 'Subcategory updated.')
      await loadCategories()
    } catch {
      setFeedback('Unable to save the subcategory. Please try again.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function deleteSubcategory(subcategoryId: number, name: string) {
    if (!window.confirm(`Delete “${name}”? Assigned subcategories cannot be deleted.`)) return
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setFeedback('')
    try {
      const response = await fetch(`/api/admin/subcategories/${subcategoryId}`, { method: 'DELETE' })
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      if (!response.ok) {
        setFeedback(await getErrorMessage(response, 'Unable to delete the subcategory.'))
        return
      }
      setFeedback('Subcategory deleted.')
      await loadCategories()
    } catch {
      setFeedback('Unable to delete the subcategory. Please try again.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="border-b border-border pb-5">
        <button type="button" onClick={onBack} className="mb-4 text-xs font-semibold text-primary hover:underline">
          ← Back to Book Management
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Administration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Book Categories</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage normalized main categories and their subcategories.
        </p>
      </header>

      {feedback && <p role="status" className="rounded-lg border border-border bg-card p-3 text-sm">{feedback}</p>}
      {loadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
          <button type="button" className="ml-3 font-semibold underline" onClick={() => void loadCategories()}>
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={submitCategory} className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">{editingCategoryId === null ? 'Add Main Category' : 'Edit Main Category'}</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={editingCategoryId === null ? categoryName : editingCategoryName}
              onChange={(event) =>
                editingCategoryId === null
                  ? setCategoryName(event.target.value)
                  : setEditingCategoryName(event.target.value)
              }
              maxLength={100}
              required
              aria-label="Main category name"
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <button disabled={busy} className="h-10 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60">
              {editingCategoryId === null ? 'Add category' : 'Save category'}
            </button>
            {editingCategoryId !== null && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditingCategoryId(null)
                  setEditingCategoryName('')
                }}
                className="h-10 rounded-lg border border-border px-4 text-xs font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <form onSubmit={submitSubcategory} className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">{editingSubcategoryId === null ? 'Add Subcategory' : 'Edit Subcategory'}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={editingSubcategoryId === null ? subcategoryName : editingSubcategoryName}
              onChange={(event) =>
                editingSubcategoryId === null
                  ? setSubcategoryName(event.target.value)
                  : setEditingSubcategoryName(event.target.value)
              }
              maxLength={100}
              required
              aria-label="Subcategory name"
              className="h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <select
              value={parentCategoryId}
              disabled={categories.length === 0}
              onChange={(event) => setParentCategoryId(event.target.value)}
              aria-label="Subcategory parent category"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="">Select parent category</option>
              {categories.map((category) => (
                <option key={category.mainCategoryId} value={category.mainCategoryId}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={busy} className="h-10 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60">
              {editingSubcategoryId === null ? 'Add subcategory' : 'Save subcategory'}
            </button>
            {editingSubcategoryId !== null && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditingSubcategoryId(null)
                  setEditingSubcategoryName('')
                }}
                className="h-10 rounded-lg border border-border px-4 text-xs font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <p role="status" className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Loading categories…
        </p>
      ) : categories.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No main categories yet. Add one to start organizing books.
        </p>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <article key={category.mainCategoryId} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">{category.name}</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditingCategoryId(category.mainCategoryId)
                      setEditingCategoryName(category.name)
                      setEditingSubcategoryId(null)
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteCategory(category)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {category.subcategories.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No subcategories.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {category.subcategories.map((subcategory) => (
                    <li key={subcategory.subcategoryId} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm">{subcategory.name}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingSubcategoryId(subcategory.subcategoryId)
                            setEditingSubcategoryName(subcategory.name)
                            setParentCategoryId(String(category.mainCategoryId))
                            setEditingCategoryId(null)
                          }}
                          className="text-xs font-semibold text-primary disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deleteSubcategory(subcategory.subcategoryId, subcategory.name)}
                          className="text-xs font-semibold text-red-700 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
