"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SelectDescription } from "@/components/ui/select-description"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
import { InventoryPageHeader } from "@/features/inventory/inventory-layout"
import {
    createBrand,
    createCategory,
    createProduct,
    createUnit,
    loadInventory,
} from "@/features/inventory/inventory-api"
import type {
    Brand,
    Category,
    InventoryProduct,
    UnitOfMeasure,
} from "@/features/inventory/inventory-types"

export function CatalogueView() {
    const { token, activeCompanyId } = useSession()
    const searchParams = useSearchParams()
    const [categories, setCategories] = useState<Category[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    const [units, setUnits] = useState<UnitOfMeasure[]>([])
    const [products, setProducts] = useState<InventoryProduct[]>([])
    const [productTotal, setProductTotal] = useState(0)

    const [isLoading, setIsLoading] = useState(false)

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("")

    // Sync category filter from `?category=<id>` (set by the sidebar category tree).
    useEffect(() => {
        const param = searchParams.get("category") ?? ""
        let active = true
        void Promise.resolve().then(() => {
            if (active) setSelectedCategory(param)
        })
        return () => {
            active = false
        }
    }, [searchParams])
    const [selectedBrand, setSelectedBrand] = useState("")
    const [selectedStatus, setSelectedStatus] = useState("")

    // Form states
    const [categoryName, setCategoryName] = useState("")
    const [brandName, setBrandName] = useState("")
    const [unitForm, setUnitForm] = useState({ name: "", code: "" })
    const [productForm, setProductForm] = useState({
        name: "",
        sku: "",
        variant_name: "",
        category_id: "",
        brand_id: "",
        base_uom_id: "",
    })

    const requestOptions = useMemo(() => {
        if (!token || !activeCompanyId) {
            return null
        }
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const refreshData = useCallback(async () => {
        if (!requestOptions) return

        setIsLoading(true)

        try {
            const loaded = await loadInventory(requestOptions)
            setCategories(loaded.categories)
            setBrands(loaded.brands)
            setUnits(loaded.units)
            setProducts(loaded.products)
            setProductTotal(loaded.productTotal)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to load catalogue.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) {
                void refreshData()
            }
        })
        return () => {
            active = false
        }
    }, [refreshData])

    async function runMutation(callback: () => Promise<unknown>, successMessage: string) {
        if (!requestOptions) return

        setIsLoading(true)

        try {
            await callback()
            toast.success(successMessage)
            await refreshData()
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "The request failed.")
        } finally {
            setIsLoading(false)
        }
    }

    // Filtered products list
    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch =
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.variants.some((v) => v.sku.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesCategory =
                !selectedCategory || product.category_id === Number(selectedCategory)

            const matchesBrand = !selectedBrand || product.brand_id === Number(selectedBrand)

            const matchesStatus = !selectedStatus || product.status === selectedStatus

            return matchesSearch && matchesCategory && matchesBrand && matchesStatus
        })
    }, [products, searchQuery, selectedCategory, selectedBrand, selectedStatus])

    return (
        <div className="grid gap-6">
            <InventoryPageHeader
                title="Product Catalogue"
                description="Manage company-scoped products, custom variants, categories, brands, and units of measure."
                isCompanyScoped={Boolean(activeCompanyId)}
            />

            {/* Filter and Content section */}
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                {/* Left column: Products list */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-navy-50 pb-4">
                        <h2 className="text-lg font-bold text-navy-900 font-display flex items-center gap-2">
                            <Icon name="list_alt" className="text-teal-700" />
                            <span>Products ({filteredProducts.length} of {productTotal})</span>
                        </h2>
                    </div>

                    {/* Search and Filters */}
                    <div className="grid gap-3 sm:grid-cols-4">
                        <Input
                            label="Search products"
                            type="text"
                            placeholder="Search SKU or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <SelectDescription
                            label="Category"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            options={[
                                { value: "", label: "All Categories" },
                                ...categories.map((category) => ({
                                    value: category.id,
                                    label: `${"- ".repeat(category.depth)}${category.name}`,
                                })),
                            ]}
                        />

                        <SelectDescription
                            label="Brand"
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            options={[
                                { value: "", label: "All Brands" },
                                ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
                            ]}
                        />

                        <SelectDescription
                            label="Status"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            options={[
                                { value: "", label: "All Statuses", description: "Show active and inactive products." },
                                { value: "active", label: "Active", description: "Only products available for normal workflows." },
                                { value: "inactive", label: "Inactive", description: "Only products held out of normal workflows." },
                            ]}
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
                            <thead>
                                <tr className="text-xs font-bold uppercase tracking-wider text-navy-500 bg-navy-50/30">
                                    <th className="border-b border-navy-100 py-3 px-4 font-display">Product</th>
                                    <th className="border-b border-navy-100 py-3 px-4 font-display">Variants (SKU · Name)</th>
                                    <th className="border-b border-navy-100 py-3 px-4 font-display">Tags</th>
                                    <th className="border-b border-navy-100 py-3 px-4 font-display">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-navy-50/20 transition-colors">
                                        <td className="border-b border-navy-100/50 py-3 px-4">
                                            <p className="font-bold text-navy-900">{product.name}</p>
                                            <p className="text-xs text-navy-400 font-medium">ID {product.id}</p>
                                        </td>
                                        <td className="border-b border-navy-100/50 py-3 px-4 text-navy-700 font-medium">
                                            {product.variants.map((variant) => (
                                                <div key={variant.id} className="py-0.5">
                                                    <code className="text-xs bg-navy-50 px-1.5 py-0.5 rounded border border-navy-100 text-teal-800 font-semibold">{variant.sku}</code>
                                                    {variant.name ? <span className="text-navy-500 text-xs ml-1.5">({variant.name})</span> : null}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="border-b border-navy-100/50 py-3 px-4 text-navy-600 font-medium">
                                            {product.tags?.map((tag) => tag.name).join(", ") || <span className="text-navy-300">-</span>}
                                        </td>
                                        <td className="border-b border-navy-100/50 py-3 px-4">
                                            <StatusPill tone={product.status === "active" ? "green" : "neutral"}>
                                                {product.status}
                                            </StatusPill>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-navy-400 font-medium bg-navy-50/10">
                                            No products found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right column: Forms */}
                <div className="grid gap-6">
                    {/* Create Product Form */}
                    <form
                        className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void runMutation(() => {
                                return createProduct(requestOptions!, {
                                    name: productForm.name,
                                    category_id: productForm.category_id ? Number(productForm.category_id) : undefined,
                                    brand_id: productForm.brand_id ? Number(productForm.brand_id) : undefined,
                                    base_uom_id: Number(productForm.base_uom_id),
                                    variants: [{ sku: productForm.sku, name: productForm.variant_name || undefined }],
                                })
                            }, "Product created successfully.").then(() => {
                                setProductForm({
                                    name: "",
                                    sku: "",
                                    variant_name: "",
                                    category_id: "",
                                    brand_id: "",
                                    base_uom_id: "",
                                })
                            })
                        }}
                    >
                        <h2 className="text-lg font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-3">
                            <Icon name="add" className="text-teal-700" />
                            <span>Create Product</span>
                        </h2>
                        <div className="grid gap-3.5">
                            <Field
                                label="Product Name"
                                value={productForm.name}
                                onChange={(event) =>
                                    setProductForm((current) => ({ ...current, name: event.target.value }))
                                }
                                placeholder="e.g. Rice Crackers"
                                required
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field
                                    label="SKU"
                                    value={productForm.sku}
                                    onChange={(event) =>
                                        setProductForm((current) => ({ ...current, sku: event.target.value }))
                                    }
                                    placeholder="SKU-RICE-01"
                                    required
                                />
                                <Field
                                    label="Variant Name"
                                    value={productForm.variant_name}
                                    onChange={(event) =>
                                        setProductForm((current) => ({ ...current, variant_name: event.target.value }))
                                    }
                                    placeholder="e.g. Original"
                                />
                            </div>
                            <SearchableSelect
                                label="Base Unit"
                                value={productForm.base_uom_id}
                                onChange={(val) =>
                                    setProductForm((current) => ({ ...current, base_uom_id: String(val) }))
                                }
                                required
                                options={units.map((unit) => ({
                                    value: unit.id,
                                    label: `${unit.name} (${unit.code})`
                                }))}
                                placeholder="Select unit"
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <SearchableSelect
                                    label="Category"
                                    value={productForm.category_id}
                                    onChange={(val) =>
                                        setProductForm((current) => ({ ...current, category_id: String(val) }))
                                    }
                                    options={categories.map((category) => ({
                                        value: category.id,
                                        label: `${"- ".repeat(category.depth)}${category.name}`
                                    }))}
                                    placeholder="None"
                                />
                                <SearchableSelect
                                    label="Brand"
                                    value={productForm.brand_id}
                                    onChange={(val) =>
                                        setProductForm((current) => ({ ...current, brand_id: String(val) }))
                                    }
                                    options={brands.map((brand) => ({
                                        value: brand.id,
                                        label: brand.name
                                    }))}
                                    placeholder="None"
                                />
                            </div>
                            <Button type="submit" size="xl" disabled={isLoading || !units.length} className="w-full cursor-pointer bg-teal-700 hover:bg-teal-800 text-white mt-2">
                                Create Product
                            </Button>
                        </div>
                    </form>

                    {/* Quick Category Form */}
                    <form
                        className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void runMutation(() => createCategory(requestOptions!, categoryName), "Category created successfully.").then(() => {
                                setCategoryName("")
                            })
                        }}
                    >
                        <h3 className="text-base font-bold text-navy-900 font-display border-b border-navy-50 pb-2">Quick Category</h3>
                        <div className="grid gap-3">
                            <Field
                                label="Category Name"
                                value={categoryName}
                                onChange={(event) => setCategoryName(event.target.value)}
                                placeholder="e.g. Snacks"
                                required
                            />
                            <Button type="submit" variant="secondary" size="xl" disabled={isLoading} className="w-full cursor-pointer">
                                Add Category
                            </Button>
                        </div>
                    </form>

                    {/* Quick Brand & Unit Forms */}
                    <div className="grid gap-6">
                        <form
                            className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4"
                            onSubmit={(event) => {
                                event.preventDefault()
                                void runMutation(() => createBrand(requestOptions!, brandName), "Brand created successfully.").then(() => {
                                    setBrandName("")
                                })
                            }}
                        >
                            <h3 className="text-base font-bold text-navy-900 font-display border-b border-navy-50 pb-2">Quick Brand</h3>
                            <div className="grid gap-3">
                                <Field
                                    label="Brand Name"
                                    value={brandName}
                                    onChange={(event) => setBrandName(event.target.value)}
                                    placeholder="e.g. Arsanawa Foods"
                                    required
                                />
                                <Button type="submit" variant="secondary" size="xl" disabled={isLoading} className="w-full cursor-pointer">
                                    Add Brand
                                </Button>
                            </div>
                        </form>

                        <form
                            className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4"
                            onSubmit={(event) => {
                                event.preventDefault()
                                void runMutation(() => createUnit(requestOptions!, unitForm), "Unit of measure created successfully.").then(() => {
                                    setUnitForm({ name: "", code: "" })
                                })
                            }}
                        >
                            <h3 className="text-base font-bold text-navy-900 font-display border-b border-navy-50 pb-2">Quick Unit</h3>
                            <div className="grid gap-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field
                                        label="Unit Name"
                                        value={unitForm.name}
                                        onChange={(event) =>
                                            setUnitForm((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder="e.g. Pieces"
                                        required
                                    />
                                    <Field
                                        label="Code"
                                        value={unitForm.code}
                                        onChange={(event) =>
                                            setUnitForm((current) => ({ ...current, code: event.target.value }))
                                        }
                                        placeholder="pcs"
                                        required
                                    />
                                </div>
                                <Button type="submit" variant="secondary" size="xl" disabled={isLoading} className="w-full cursor-pointer">
                                    Add Unit
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
