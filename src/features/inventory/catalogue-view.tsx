"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SelectDescription } from "@/components/ui/select-description"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { TableStateRow } from "@/components/ui/table-state-row"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
import { InventoryPageHeader } from "@/features/inventory/inventory-layout"
import { CategoryLeveledSelect } from "@/features/inventory/components/category-leveled-select"
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

function readableError(caught: unknown, fallback: string): string {
    return caught instanceof Error && caught.message ? caught.message : fallback
}

export function CatalogueView() {
    const t = useTranslations("inventory.catalogue")
    const { token, activeCompanyId } = useSession()
    const searchParams = useSearchParams()
    const [categories, setCategories] = useState<Category[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    const [units, setUnits] = useState<UnitOfMeasure[]>([])
    const [products, setProducts] = useState<InventoryProduct[]>([])
    const [productTotal, setProductTotal] = useState(0)

    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

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

    const loadErrorFallback = t("loadError")

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
            setLoadError(null)
        } catch (caught) {
            setLoadError(readableError(caught, loadErrorFallback))
        } finally {
            setIsLoading(false)
        }
    }, [loadErrorFallback, requestOptions])

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
            toast.error(readableError(caught, t("mutationError")))
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

    const showSkeleton = isLoading && filteredProducts.length === 0

    function statusLabel(status: string): string {
        if (status === "active") return t("statuses.active")
        if (status === "inactive") return t("statuses.inactive")
        return status
    }

    return (
        <div className="grid gap-6">
            <InventoryPageHeader
                title={t("title")}
                description={t("subtitle")}
                isCompanyScoped={Boolean(activeCompanyId)}
            />

            {/* Filter and Content section */}
            <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
                {/* Left column: Products list */}
                <DataTable
                    minWidth={640}
                    columns={[t("table.product"), t("table.variants"), t("table.tags"), t("table.status")]}
                    toolbar={
                        <div className="grid gap-4">
                            <h2 className="type-section flex items-center gap-2">
                                <Icon name="list_alt" className="text-brand-ink" />
                                <span>{t("products.heading", { count: filteredProducts.length, total: productTotal })}</span>
                            </h2>

                            {/* Search and Filters */}
                            <div className="grid gap-3 sm:grid-cols-4">
                                <Input
                                    label={t("filters.search")}
                                    type="text"
                                    placeholder={t("filters.searchPlaceholder")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />

                                <CategoryLeveledSelect
                                    label={t("filters.category")}
                                    value={selectedCategory}
                                    onChange={(value) => setSelectedCategory(String(value))}
                                    categories={categories}
                                    mode="all"
                                    emptyLabel={t("filters.allCategories")}
                                    placeholder={t("filters.allCategories")}
                                />

                                <SelectDescription
                                    label={t("filters.brand")}
                                    value={selectedBrand}
                                    onChange={(e) => setSelectedBrand(e.target.value)}
                                    options={[
                                        { value: "", label: t("filters.allBrands") },
                                        ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
                                    ]}
                                />

                                <SelectDescription
                                    label={t("filters.status")}
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    options={[
                                        { value: "", label: t("filters.allStatuses"), description: t("filters.allStatusesDescription") },
                                        { value: "active", label: t("filters.active"), description: t("filters.activeDescription") },
                                        { value: "inactive", label: t("filters.inactive"), description: t("filters.inactiveDescription") },
                                    ]}
                                />
                            </div>
                        </div>
                    }
                >
                    <TableStateRow
                        isLoading={showSkeleton}
                        isError={Boolean(loadError)}
                        error={loadError ? new Error(loadError) : undefined}
                        count={filteredProducts.length}
                        columns={4}
                        emptyMessage={t("table.empty")}
                        onRetry={() => void refreshData()}
                    />
                    {!loadError && !showSkeleton && filteredProducts.map((product) => (
                        <tr key={product.id}>
                            <td>
                                <p className="font-semibold text-ink">{product.name}</p>
                                <p className="text-xs text-ink-faint">{t("table.idLabel", { id: product.id })}</p>
                            </td>
                            <td>
                                {product.variants.map((variant) => (
                                    <div key={variant.id} className="py-0.5">
                                        <code className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-ink">{variant.sku}</code>
                                        {variant.name ? <span className="ms-1.5 text-xs text-ink-muted">({variant.name})</span> : null}
                                    </div>
                                ))}
                            </td>
                            <td>
                                {product.tags?.map((tag) => tag.name).join(", ") || <span className="text-ink-faint">-</span>}
                            </td>
                            <td>
                                <StatusPill tone={product.status === "active" ? "green" : "neutral"}>
                                    {statusLabel(product.status)}
                                </StatusPill>
                            </td>
                        </tr>
                    ))}
                </DataTable>

                {/* Right column: Forms */}
                <div className="grid gap-6">
                    {/* Create Product Form */}
                    <Card
                        as="form"
                        padding="lg"
                        className="flex flex-col gap-4"
                        onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                            event.preventDefault()
                            void runMutation(() => {
                                return createProduct(requestOptions!, {
                                    name: productForm.name,
                                    category_id: productForm.category_id ? Number(productForm.category_id) : undefined,
                                    brand_id: productForm.brand_id ? Number(productForm.brand_id) : undefined,
                                    base_uom_id: Number(productForm.base_uom_id),
                                    variants: [{ sku: productForm.sku, name: productForm.variant_name || undefined }],
                                })
                            }, t("createProduct.success")).then(() => {
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
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name="add" className="text-brand-ink" />
                            <span>{t("createProduct.heading")}</span>
                        </h2>
                        <div className="grid gap-3.5">
                            <Field
                                label={t("createProduct.name")}
                                value={productForm.name}
                                onChange={(event) =>
                                    setProductForm((current) => ({ ...current, name: event.target.value }))
                                }
                                placeholder={t("createProduct.namePlaceholder")}
                                required
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field
                                    label={t("createProduct.sku")}
                                    value={productForm.sku}
                                    onChange={(event) =>
                                        setProductForm((current) => ({ ...current, sku: event.target.value }))
                                    }
                                    placeholder="SKU-RICE-01"
                                    required
                                />
                                <Field
                                    label={t("createProduct.variantName")}
                                    value={productForm.variant_name}
                                    onChange={(event) =>
                                        setProductForm((current) => ({ ...current, variant_name: event.target.value }))
                                    }
                                    placeholder={t("createProduct.variantNamePlaceholder")}
                                />
                            </div>
                            <SearchableSelect
                                label={t("createProduct.baseUnit")}
                                value={productForm.base_uom_id}
                                onChange={(val) =>
                                    setProductForm((current) => ({ ...current, base_uom_id: String(val) }))
                                }
                                required
                                options={units.map((unit) => ({
                                    value: unit.id,
                                    label: `${unit.name} (${unit.code})`
                                }))}
                                placeholder={t("createProduct.selectUnit")}
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <CategoryLeveledSelect
                                    label={t("createProduct.category")}
                                    value={productForm.category_id}
                                    onChange={(val) =>
                                        setProductForm((current) => ({ ...current, category_id: String(val) }))
                                    }
                                    categories={categories}
                                    mode="leaf"
                                    emptyLabel={t("createProduct.noCategory")}
                                    placeholder={t("createProduct.nonePlaceholder")}
                                />
                                <SearchableSelect
                                    label={t("createProduct.brand")}
                                    value={productForm.brand_id}
                                    onChange={(val) =>
                                        setProductForm((current) => ({ ...current, brand_id: String(val) }))
                                    }
                                    options={brands.map((brand) => ({
                                        value: brand.id,
                                        label: brand.name
                                    }))}
                                    placeholder={t("createProduct.nonePlaceholder")}
                                />
                            </div>
                            <Button type="submit" size="xl" disabled={isLoading || !units.length} className="mt-2 w-full">
                                {t("createProduct.submit")}
                            </Button>
                        </div>
                    </Card>

                    {/* Quick Category Form */}
                    <Card
                        as="form"
                        padding="lg"
                        className="flex flex-col gap-4"
                        onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                            event.preventDefault()
                            void runMutation(() => createCategory(requestOptions!, categoryName), t("quickCategory.success")).then(() => {
                                setCategoryName("")
                            })
                        }}
                    >
                        <h3 className="type-section">{t("quickCategory.heading")}</h3>
                        <div className="grid gap-3">
                            <Field
                                label={t("quickCategory.name")}
                                value={categoryName}
                                onChange={(event) => setCategoryName(event.target.value)}
                                placeholder={t("quickCategory.placeholder")}
                                required
                            />
                            <Button type="submit" variant="secondary" size="xl" disabled={isLoading} className="w-full">
                                {t("quickCategory.submit")}
                            </Button>
                        </div>
                    </Card>

                    {/* Quick Brand & Unit Forms */}
                    <div className="grid gap-6">
                        <Card
                            as="form"
                            padding="lg"
                            className="flex flex-col gap-4"
                            onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                                event.preventDefault()
                                void runMutation(() => createBrand(requestOptions!, brandName), t("quickBrand.success")).then(() => {
                                    setBrandName("")
                                })
                            }}
                        >
                            <h3 className="type-section">{t("quickBrand.heading")}</h3>
                            <div className="grid gap-3">
                                <Field
                                    label={t("quickBrand.name")}
                                    value={brandName}
                                    onChange={(event) => setBrandName(event.target.value)}
                                    placeholder={t("quickBrand.placeholder")}
                                    required
                                />
                                <Button type="submit" variant="secondary" size="xl" disabled={isLoading} className="w-full">
                                    {t("quickBrand.submit")}
                                </Button>
                            </div>
                        </Card>

                        <Card
                            as="form"
                            padding="lg"
                            className="flex flex-col gap-4"
                            onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                                event.preventDefault()
                                void runMutation(() => createUnit(requestOptions!, unitForm), t("quickUnit.success")).then(() => {
                                    setUnitForm({ name: "", code: "" })
                                })
                            }}
                        >
                            <h3 className="type-section">{t("quickUnit.heading")}</h3>
                            <div className="grid gap-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field
                                        label={t("quickUnit.name")}
                                        value={unitForm.name}
                                        onChange={(event) =>
                                            setUnitForm((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder={t("quickUnit.placeholder")}
                                        required
                                    />
                                    <Field
                                        label={t("quickUnit.code")}
                                        value={unitForm.code}
                                        onChange={(event) =>
                                            setUnitForm((current) => ({ ...current, code: event.target.value }))
                                        }
                                        placeholder="pcs"
                                        required
                                    />
                                </div>
                                <Button type="submit" variant="secondary" size="xl" disabled={isLoading} className="w-full">
                                    {t("quickUnit.submit")}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
