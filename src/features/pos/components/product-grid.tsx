"use client"

import { useMemo, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { formatCurrency } from "@/lib/money"
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
        <div className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-navy-400">
                        <Icon name="search" size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search products or SKU..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="min-h-11 w-full rounded-md border border-navy-100 bg-white pl-10 text-sm text-navy-900 outline-none transition placeholder:text-navy-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                    />
                </div>
                <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="min-h-11 rounded-md border border-navy-100 bg-white px-3 text-sm text-navy-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {"- ".repeat(category.depth)}
                            {category.name}
                        </option>
                    ))}
                </select>
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
                            className="flex flex-col items-start gap-1 rounded-xl border border-navy-100 p-4 text-left transition-colors hover:border-teal-700 hover:bg-teal-50/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer outline-none"
                        >
                            <span className="line-clamp-2 text-sm font-bold text-navy-900">{product.name}</span>
                            {variant.name ? (
                                <span className="text-xs text-navy-500">{variant.name}</span>
                            ) : null}
                            <code className="rounded border border-navy-100 bg-navy-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                                {variant.sku}
                            </code>
                            <span className={`mt-1 text-sm font-bold ${missingPrice ? "text-orange-700" : "text-teal-700"}`}>
                                {missingPrice ? "No price" : formatCurrency(price)}
                            </span>
                        </button>
                    )
                })}
                {tiles.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm font-medium text-navy-400">
                        No products found.
                    </div>
                )}
            </div>
        </div>
    )
}
