"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { SelectDescription } from "@/components/ui/select-description"
import { formatCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Category, InventoryProduct, ProductVariant } from "@/features/inventory/inventory-types"

export type ProductTile = {
    product: InventoryProduct
    variant: ProductVariant
    price: string | null
}

type ProductGridProps = {
    products: InventoryProduct[]
    categories: Category[]
    /** Map of `productId:variantId` → resolved price string (or null). */
    priceMap: Record<string, string | null>
    onAdd: (product: InventoryProduct, variant: ProductVariant) => void
    disabled?: boolean
}

export function ProductGrid({ products, categories, priceMap, onAdd, disabled }: ProductGridProps) {
    const t = useTranslations("pos.register.products")
    const [search, setSearch] = useState("")
    const [categoryId, setCategoryId] = useState("")

    const tiles = useMemo<ProductTile[]>(() => {
        const query = search.toLowerCase()
        const list: ProductTile[] = []
        for (const product of products) {
            if (product.status !== "active") continue
            if (categoryId && product.category_id !== Number(categoryId)) continue
            for (const variant of product.variants) {
                if (!variant.is_active) continue
                const haystack = `${product.name} ${variant.sku} ${variant.name ?? ""}`.toLowerCase()
                if (query && !haystack.includes(query)) continue
                list.push({ product, variant, price: priceMap[`${product.id}:${variant.id}`] ?? null })
            }
        }
        return list
    }, [products, categoryId, search, priceMap])

    return (
        <div className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card">
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <Input
                    label={t("search")}
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <SelectDescription
                    label={t("category")}
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    options={[
                        { value: "", label: t("allCategories") },
                        ...categories.map((category) => ({
                            value: category.id,
                            label: `${"- ".repeat(category.depth)}${category.name}`,
                        })),
                    ]}
                />
            </div>

            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                {tiles.map(({ product, variant, price }) => {
                    const missingPrice = price === null

                    return (
                        <button
                            key={`${product.id}:${variant.id}`}
                            type="button"
                            disabled={disabled || missingPrice}
                            onClick={() => {
                                if (!missingPrice) onAdd(product, variant)
                            }}
                            className="flex flex-col items-start gap-1 rounded-md border border-line p-4 text-left transition-colors hover:border-brand hover:bg-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer outline-none"
                        >
                            {product.images?.[0] ? (
                                <img
                                    src={product.images[0].url}
                                    alt={product.images[0].alt_text || product.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="mb-2 aspect-square w-full rounded-sm border border-line object-cover"
                                />
                            ) : null}
                            <span className="line-clamp-2 text-sm font-bold text-ink">{product.name}</span>
                            {variant.name ? (
                                <span className="text-xs text-ink-muted">{variant.name}</span>
                            ) : null}
                            <code className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">
                                {variant.sku}
                            </code>
                            <span
                                className={cn(
                                    "mt-1 text-sm font-bold tabular-nums",
                                    missingPrice ? "text-warning-strong" : "text-brand-ink",
                                )}
                            >
                                {missingPrice ? t("noPrice") : formatCurrency(price)}
                            </span>
                        </button>
                    )
                })}
                {tiles.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm font-medium text-ink-muted">
                        {t("empty")}
                    </div>
                )}
            </div>
        </div>
    )
}
