export type CategoryOption = {
  mainCategoryId: number
  name: string
  subcategories: Array<{ subcategoryId: number; name: string }>
}

type Props = {
  categories: CategoryOption[]
  mainCategoryIds: number[]
  primaryMainCategoryId: number | null
  subcategoryIds: number[]
  onMainCategoryIdsChange: (ids: number[]) => void
  onPrimaryMainCategoryIdChange: (id: number | null) => void
  onSubcategoryIdsChange: (ids: number[]) => void
  disabled?: boolean
}

export function BookCategorySelector({
  categories,
  mainCategoryIds,
  primaryMainCategoryId,
  subcategoryIds,
  onMainCategoryIdsChange,
  onPrimaryMainCategoryIdChange,
  onSubcategoryIdsChange,
  disabled = false,
}: Props) {
  const selectedIds = new Set(mainCategoryIds)
  const selectedCategories = categories.filter((category) => selectedIds.has(category.mainCategoryId))
  const selectedSubcategoryIds = new Set(subcategoryIds)

  function toggleMainCategory(categoryId: number, checked: boolean) {
    const nextIds = checked
      ? [...mainCategoryIds, categoryId]
      : mainCategoryIds.filter((id) => id !== categoryId)
    const nextSet = new Set(nextIds)
    const validSubcategoryIds = categories
      .filter((category) => nextSet.has(category.mainCategoryId))
      .flatMap((category) => category.subcategories.map((subcategory) => subcategory.subcategoryId))

    onMainCategoryIdsChange(nextIds)
    onSubcategoryIdsChange(subcategoryIds.filter((id) => validSubcategoryIds.includes(id)))
    if (!checked && primaryMainCategoryId === categoryId) {
      onPrimaryMainCategoryIdChange(null)
    }
  }

  function toggleSubcategory(subcategoryId: number, checked: boolean) {
    onSubcategoryIdsChange(
      checked
        ? [...subcategoryIds, subcategoryId]
        : subcategoryIds.filter((id) => id !== subcategoryId),
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <fieldset>
        <legend className="text-xs font-semibold">Main categories (select one or more)</legend>
        {categories.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Create a main category before assigning this book.</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <label key={category.mainCategoryId} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.has(category.mainCategoryId)}
                  disabled={disabled}
                  onChange={(event) => toggleMainCategory(category.mainCategoryId, event.target.checked)}
                />
                {category.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <label className="block text-xs font-semibold">
        Primary main category
        <select
          value={primaryMainCategoryId ?? ''}
          disabled={disabled || selectedCategories.length === 0}
          onChange={(event) => {
            const value = Number(event.target.value)
            onPrimaryMainCategoryIdChange(Number.isSafeInteger(value) && value > 0 ? value : null)
          }}
          className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="">Select a primary category</option>
          {selectedCategories.map((category) => (
            <option key={category.mainCategoryId} value={category.mainCategoryId}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-xs font-semibold">Subcategories (optional)</legend>
        {selectedCategories.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Select main categories to see their subcategories.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {selectedCategories.map((category) => (
              <div key={category.mainCategoryId}>
                <p className="text-xs font-medium text-muted-foreground">{category.name}</p>
                {category.subcategories.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">No subcategories.</p>
                ) : (
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {category.subcategories.map((subcategory) => (
                      <label key={subcategory.subcategoryId} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedSubcategoryIds.has(subcategory.subcategoryId)}
                          disabled={disabled}
                          onChange={(event) =>
                            toggleSubcategory(subcategory.subcategoryId, event.target.checked)
                          }
                        />
                        {subcategory.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </fieldset>
      {mainCategoryIds.length === 0 && (
        <p role="alert" className="text-xs text-amber-700">At least one main category is required.</p>
      )}
      {mainCategoryIds.length > 0 && !mainCategoryIds.includes(primaryMainCategoryId ?? -1) && (
        <p role="alert" className="text-xs text-amber-700">Choose a primary category from the selected main categories.</p>
      )}
    </div>
  )
}
