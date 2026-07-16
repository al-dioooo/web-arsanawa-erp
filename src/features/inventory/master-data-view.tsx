"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Dispatch, FormEvent, SetStateAction } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { Tooltip } from "@/components/ui/tooltip"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
import { CategoryLeveledSelect } from "@/features/inventory/components/category-leveled-select"
import { ProductVariantManager } from "@/features/inventory/components/product-variant-manager"
import {
    buildCategoryTree,
    categoriesWithAncestorsForQuery,
    expandableCategoryIds,
    flattenCategoryTree,
    type CategoryTreeNode,
} from "@/features/inventory/category-tree"
import { InventoryPageHeader, inventorySurfaceClass } from "@/features/inventory/inventory-layout"
import {
    createBrand,
    createCategory,
    createProduct,
    createProductUnit,
    createUnit,
    createVariantGroup,
    createVariantMaster,
    deleteBrand,
    deleteCategory,
    deleteProduct,
    deleteProductUnit,
    deleteUnit,
    deleteVariantGroup,
    deleteVariantMaster,
    commitProductImport,
    downloadProductImportTemplate,
    inspectProductImport,
    listBrands,
    listCategories,
    listProducts,
    listProductUnits,
    listUnitsOfMeasure,
    listVariantGroups,
    listVariantMasters,
    previewProductImport,
    uploadProductImage,
    uploadProductUnitImage,
    updateBrand,
    saveCategoryDetails,
    updateProduct,
    updateProductUnit,
    updateUnit,
    updateVariantGroup,
    updateVariantMaster,
} from "@/features/inventory/inventory-api"
import type {
    Brand,
    Category,
    InventoryProduct,
    ProductUnit,
    UnitOfMeasure,
    VariantGroup,
    VariantMaster,
} from "@/features/inventory/inventory-types"
import { cn } from "@/lib/utils"

export type InventoryMasterKind =
    | "categories"
    | "brands"
    | "units"
    | "products"
    | "product-units"
    | "variant-groups"
    | "variants"

type Mode = "list" | "detail" | "create" | "edit"

type FormState = {
    name: string
    code: string
    sku: string
    variant_name: string
    barcode: string
    description: string
    parent_id: string
    category_id: string
    brand_id: string
    base_uom_id: string
    unit_of_measure_id: string
    product_id: string
    variant_group_id: string
    variant_ids: string[]
    position: string
    is_active: boolean
}

type ImageInputState = {
    remoteUrl: string
    altText: string
    file: File | null
}

const emptyForm: FormState = {
    name: "",
    code: "",
    sku: "",
    variant_name: "",
    barcode: "",
    description: "",
    parent_id: "",
    category_id: "",
    brand_id: "",
    base_uom_id: "",
    unit_of_measure_id: "",
    product_id: "",
    variant_group_id: "",
    variant_ids: [],
    position: "0",
    is_active: true,
}

const configs: Record<InventoryMasterKind, { title: string; singular: string; base: string; icon: string }> = {
    categories: { title: "Product Categories", singular: "Product Category", base: "/inventory/master/categories", icon: "account_tree" },
    brands: { title: "Product Brands", singular: "Product Brand", base: "/inventory/master/brands", icon: "sell" },
    units: { title: "Units of Measure", singular: "Unit of Measure", base: "/inventory/master/units-of-measure", icon: "straighten" },
    products: { title: "Products", singular: "Product", base: "/inventory/master/products", icon: "inventory_2" },
    "product-units": { title: "Product Units", singular: "Product Unit", base: "/inventory/master/product-units", icon: "qr_code_2" },
    "variant-groups": { title: "Variant Groups", singular: "Variant Group", base: "/inventory/master/variant-groups", icon: "category" },
    variants: { title: "Variants", singular: "Variant", base: "/inventory/master/variants", icon: "tune" },
}

export function InventoryMasterDataView({
    kind,
    mode,
    id,
}: {
    kind: InventoryMasterKind
    mode: Mode
    id?: string
}) {
    const router = useRouter()
    const { token, activeCompanyId, organizationContext } = useSession()
    const branches = useMemo(() => organizationContext?.branches ?? [], [organizationContext?.branches])
    const [categories, setCategories] = useState<Category[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    const [units, setUnits] = useState<UnitOfMeasure[]>([])
    const [products, setProducts] = useState<InventoryProduct[]>([])
    const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
    const [variants, setVariants] = useState<VariantMaster[]>([])
    const [productUnits, setProductUnits] = useState<ProductUnit[]>([])
    const [form, setForm] = useState<FormState>(emptyForm)
    const [query, setQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const [imageInput, setImageInput] = useState<ImageInputState>({ remoteUrl: "", altText: "", file: null })

    const config = configs[kind]
    const itemId = id ? Number(id) : null
    const requestOptions = useMemo(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const refreshData = useCallback(async () => {
        if (!requestOptions) return

        setIsLoading(true)

        try {
            // Fetch only the entity sets this kind lists or references in its
            // form selectors, not every master data type.
            const needs = {
                categories: kind === "categories" || kind === "products",
                brands: kind === "brands" || kind === "products",
                units: kind === "units" || kind === "products" || kind === "variant-groups",
                products: kind === "products" || kind === "product-units",
                variantGroups: kind === "variant-groups" || kind === "variants",
                variants: kind === "variants" || kind === "product-units",
                productUnits: kind === "product-units",
            }

            const [categoriesData, brandsData, unitsData, productsData, groups, masters, unitsResponse] =
                await Promise.all([
                    needs.categories ? listCategories(requestOptions) : null,
                    needs.brands ? listBrands(requestOptions) : null,
                    needs.units ? listUnitsOfMeasure(requestOptions) : null,
                    needs.products ? listProducts(requestOptions) : null,
                    needs.variantGroups ? listVariantGroups(requestOptions) : null,
                    needs.variants ? listVariantMasters(requestOptions) : null,
                    needs.productUnits ? listProductUnits(requestOptions, { per_page: 100 }) : null,
                ])

            if (categoriesData) setCategories(categoriesData.categories)
            if (brandsData) setBrands(brandsData.brands)
            if (unitsData) setUnits(unitsData.units)
            if (productsData) setProducts(productsData.products)
            if (groups) setVariantGroups(groups.data.variant_groups)
            if (masters) setVariants(masters.data.variants)
            if (unitsResponse) setProductUnits(unitsResponse.data.product_units)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to load inventory master data.")
        } finally {
            setIsLoading(false)
        }
    }, [kind, requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void refreshData()
        })
        return () => {
            active = false
        }
    }, [refreshData])

    const rows = useMemo(() => {
        const scopedCategories = kind === "categories" ? categoriesWithAncestorsForQuery(categories, query) : categories
        const source = getRows(kind, { categories: scopedCategories, brands, units, products, variantGroups, variants, productUnits })
        if (kind === "categories") return source
        if (!query) return source
        const lowered = query.toLowerCase()
        return source.filter((row) => row.search.toLowerCase().includes(lowered))
    }, [brands, categories, kind, productUnits, products, query, units, variantGroups, variants])

    const active = itemId ? rows.find((row) => row.id === itemId)?.raw : null

    useEffect(() => {
        let mounted = true
        void Promise.resolve().then(() => {
            if (!mounted) return

            if ((mode === "edit" || mode === "detail") && active) {
                setForm(formFromEntity(kind, active as MasterEntity))
            } else if (mode === "create") {
                setForm(emptyForm)
            }
        })

        return () => {
            mounted = false
        }
    }, [active, kind, mode])

    async function submitForm(event: FormEvent) {
        event.preventDefault()
        if (!requestOptions) return

        setIsLoading(true)

        try {
            if (mode === "create") {
                const response = await createEntity(kind, requestOptions, form)
                await saveImageIfNeeded(kind, requestOptions, entityIdFromResponse(kind, response), imageInput)
            } else if (mode === "edit" && itemId) {
                await updateEntity(kind, requestOptions, itemId, form, (active as MasterEntity | null) ?? null)
                await saveImageIfNeeded(kind, requestOptions, itemId, imageInput)
            }

            await refreshData()
            toast.success(`${config.singular} saved.`)
            router.push(config.base)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to save master data.")
        } finally {
            setIsLoading(false)
        }
    }

    async function deleteEntityFromDetail() {
        if (!requestOptions || !itemId) return
        if (!confirm(`Delete this ${config.singular.toLowerCase()}?`)) return

        setIsLoading(true)

        try {
            await deleteEntity(kind, requestOptions, itemId)
            await refreshData()
            toast.success(`${config.singular} deleted.`)
            router.push(config.base)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to delete master data.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-6">
            <InventoryPageHeader
                eyebrow="Inventory Master"
                icon={config.icon}
                title={heading(config, mode)}
                description={descriptionFor(kind)}
                isCompanyScoped={Boolean(activeCompanyId)}
                actions={(
                    <>
                        {mode !== "list" && (
                            <Link href={config.base}>
                                <Button variant="secondary" size="xl" type="button">Back to List</Button>
                            </Link>
                        )}
                        {mode === "list" && kind === "products" && requestOptions && (
                            <Button type="button" variant="outline" size="xl" onClick={() => setImportOpen(true)}>
                                <Icon name="description" size={18} />
                                Import Products
                            </Button>
                        )}
                        {mode === "list" && (
                            <Link href={`${config.base}/new`}>
                                <Button type="button" size="xl" className="bg-teal-700 text-white hover:bg-teal-800">New {config.singular}</Button>
                            </Link>
                        )}
                        {mode === "detail" && itemId && (
                            <Link href={`${config.base}/${itemId}/edit`}>
                                <Button type="button" size="xl" className="bg-teal-700 text-white hover:bg-teal-800">Edit</Button>
                            </Link>
                        )}
                    </>
                )}
            />

            {requestOptions && kind === "products" ? (
                <SpreadsheetImportDialog
                    open={importOpen}
                    onClose={() => setImportOpen(false)}
                    title="Import Products"
                    description="Upload or inspect a public Google Sheets product template, preview row validation, then queue the import."
                    operations={{
                        downloadTemplate: (format) => downloadProductImportTemplate(requestOptions, format),
                        inspect: (input) => inspectProductImport(requestOptions, input),
                        preview: (importId, sheetName) => previewProductImport(requestOptions, importId, sheetName),
                        commit: (importId) => commitProductImport(requestOptions, importId),
                    }}
                    onCommitted={() => void refreshData()}
                />
            ) : null}

            {mode === "list" && (
                <section className="grid gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Input
                            label={`Search ${config.title}`}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={`Search ${config.title.toLowerCase()}`}
                            className="w-full md:min-w-80"
                        />
                        <StatusPill tone="neutral">{`${rows.length} records`}</StatusPill>
                    </div>
                    <MasterTable kind={kind} base={config.base} rows={rows} query={query} isLoading={isLoading} />
                </section>
            )}

            {mode === "detail" && (
                <DetailPanel
                    kind={kind}
                    active={active as MasterEntity | null}
                    onDelete={deleteEntityFromDetail}
                />
            )}

            {mode === "detail" && kind === "products" && requestOptions && itemId && (
                <ProductVariantManager
                    productId={itemId}
                    requestOptions={requestOptions}
                    branches={branches}
                    onChanged={() => void refreshData()}
                />
            )}

            {(mode === "create" || mode === "edit") && (
                <form onSubmit={submitForm} className={cn("grid gap-5 p-5", inventorySurfaceClass)}>
                    <FormFields
                        kind={kind}
                        mode={mode}
                        form={form}
                        setForm={setForm}
                        categories={categories}
                        brands={brands}
                        units={units}
                        products={products}
                        variantGroups={variantGroups}
                        variants={variants}
                    />
                    {["products", "product-units"].includes(kind) ? (
                        <ProductImageInput value={imageInput} onChange={setImageInput} />
                    ) : null}
                    <div className="flex justify-end gap-3 border-t border-navy-100 pt-4">
                        <Link href={config.base}>
                            <Button type="button" variant="secondary" size="xl">Cancel</Button>
                        </Link>
                        <Button type="submit" size="xl" disabled={isLoading} className="bg-teal-700 text-white hover:bg-teal-800">
                            {isLoading ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    )
}

type MasterEntity = Category | Brand | UnitOfMeasure | InventoryProduct | ProductUnit | VariantGroup | VariantMaster

type MasterRow = {
    id: number
    title: string
    meta: string
    status: boolean
    search: string
    raw: MasterEntity
    image?: { url: string; alt_text?: string | null }
}

function getRows(
    kind: InventoryMasterKind,
    data: {
        categories: Category[]
        brands: Brand[]
        units: UnitOfMeasure[]
        products: InventoryProduct[]
        variantGroups: VariantGroup[]
        variants: VariantMaster[]
        productUnits: ProductUnit[]
    },
) {
    const categoryOptions = flattenCategoryTree(data.categories)
    const rowsByKind = {
        categories: categoryOptions.map((option) => ({
            id: option.category.id,
            title: option.category.name,
            meta: option.parentBreadcrumb || "Root category",
            status: option.category.is_active,
            search: `${option.category.name} ${option.breadcrumb} ${option.category.path}`,
            raw: option.category,
        })),
        brands: data.brands.map((item) => row(item.id, item.name, "Brand", item.is_active, item.name, item)),
        units: data.units.map((item) => row(item.id, item.name, item.code, item.is_active, `${item.name} ${item.code}`, item)),
        products: data.products.map((item) => row(item.id, item.name, item.status, item.status === "active", item.name, item)),
        "product-units": data.productUnits.map((item) => row(item.id, item.sku, item.name ?? "Sellable SKU", item.is_active, `${item.sku} ${item.name ?? ""}`, item)),
        "variant-groups": data.variantGroups.map((item) => row(item.id, item.name, item.unit?.code ?? item.code, item.is_active, `${item.name} ${item.code}`, item)),
        variants: data.variants.map((item) => row(item.id, item.name, item.group?.name ?? item.code, item.is_active, `${item.name} ${item.code}`, item)),
    } satisfies Record<InventoryMasterKind, MasterRow[]>

    return rowsByKind[kind]
}

function row(id: number, title: string, meta: string, status: boolean, search: string, raw: MasterEntity) {
    const image = ("images" in raw ? raw.images?.[0] : undefined) ?? undefined
    return { id, title, meta, status, search, raw, image }
}

function MasterTable({
    kind,
    base,
    rows,
    query,
    isLoading = false,
}: {
    kind: InventoryMasterKind
    base: string
    rows: MasterRow[]
    query: string
    isLoading?: boolean
}) {
    if (kind === "categories") {
        return <CategoryTreeTable base={base} rows={rows} query={query} isLoading={isLoading} />
    }

    return (
        <div className={cn("overflow-x-auto", inventorySurfaceClass)}>
            <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-navy-100 bg-navy-50/60 text-xs uppercase tracking-wider text-navy-500">
                    <tr>
                        <th className="px-5 py-3 font-bold">Name</th>
                        <th className="px-5 py-3 font-bold">Context</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                        <th className="px-5 py-3 font-bold">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                    {rows.map((item) => (
                        <tr key={item.id} className="hover:bg-navy-50/40">
                            <td className="px-5 py-4 font-bold text-navy-950">
                                <div className="flex items-center gap-3">
                                    {item.image ? (
                                        <img
                                            src={item.image.url}
                                            alt={item.image.alt_text || item.title}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-10 w-10 rounded-md border border-navy-100 object-cover"
                                        />
                                    ) : null}
                                    <span>{item.title}</span>
                                </div>
                            </td>
                            <td className="px-5 py-4 text-navy-500">{item.meta}</td>
                            <td className="px-5 py-4">
                                <StatusPill tone={item.status ? "green" : "neutral"}>{item.status ? "active" : "inactive"}</StatusPill>
                            </td>
                            <td className="px-5 py-4">
                                <div className="flex gap-2">
                                    <Tooltip label="View Product">
                                        <Link href={`${base}/${item.id}`} aria-label="View Product" className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-50 text-navy-700 hover:bg-navy-100">
                                            <Icon name="open_in_new" size={16} />
                                        </Link>
                                    </Tooltip>
                                    <Tooltip label="Edit Product">
                                        <Link href={`${base}/${item.id}/edit`} aria-label="Edit Product" className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-teal-800 hover:bg-teal-100">
                                            <Icon name="edit" size={16} />
                                        </Link>
                                    </Tooltip>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-navy-400">
                                {isLoading ? "Loading records..." : "No records found."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

function CategoryTreeTable({
    base,
    rows,
    query,
    isLoading = false,
}: {
    base: string
    rows: MasterRow[]
    query: string
    isLoading?: boolean
}) {
    const categories = useMemo(() => rows.map((row) => row.raw as Category), [rows])
    const tree = useMemo(() => buildCategoryTree(categories), [categories])
    const parentIds = useMemo(() => expandableCategoryIds(categories), [categories])
    const categoryMeta = useMemo(() => {
        return new Map(flattenCategoryTree(categories).map((option) => [option.category.id, option.parentBreadcrumb || "Root category"]))
    }, [categories])
    const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set())
    const effectiveExpandedIds = useMemo(() => {
        if (query.trim()) {
            return parentIds
        }

        const expandedIds = new Set(parentIds)
        collapsedIds.forEach((id) => expandedIds.delete(id))

        return expandedIds
    }, [collapsedIds, parentIds, query])
    const visibleRows = visibleCategoryRows(tree, effectiveExpandedIds)

    return (
        <div className={cn("overflow-x-auto", inventorySurfaceClass)}>
            <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-navy-100 bg-navy-50/60 text-xs uppercase tracking-wider text-navy-500">
                    <tr>
                        <th className="px-5 py-3 font-bold">Name</th>
                        <th className="px-5 py-3 font-bold">Context</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                        <th className="px-5 py-3 font-bold">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                    {visibleRows.map(({ node, depth }) => {
                        const hasChildren = node.children.length > 0
                        const expanded = effectiveExpandedIds.has(node.id)

                        return (
                            <tr key={node.id} className="hover:bg-navy-50/40">
                                <td className="px-5 py-4 font-bold text-navy-950">
                                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 22}px` }}>
                                        {hasChildren ? (
                                            <button
                                                type="button"
                                                aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                                                onClick={() => {
                                                    setCollapsedIds((current) => {
                                                        const next = new Set(current)
                                                        if (expanded) {
                                                            next.add(node.id)
                                                        } else {
                                                            next.delete(node.id)
                                                        }

                                                        return next
                                                    })
                                                }}
                                                className="flex h-7 w-7 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-100 hover:text-navy-700"
                                            >
                                                <Icon name="chevron_right" size={16} className={cn("transition-transform", expanded ? "rotate-90" : "")} />
                                            </button>
                                        ) : (
                                            <span className="h-7 w-7" aria-hidden="true" />
                                        )}
                                        {depth > 0 ? <span className="h-6 w-px bg-navy-100" aria-hidden="true" /> : null}
                                        <span>{node.name}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-navy-500">{categoryMeta.get(node.id) ?? "Root category"}</td>
                                <td className="px-5 py-4">
                                    <StatusPill tone={node.is_active ? "green" : "neutral"}>{node.is_active ? "active" : "inactive"}</StatusPill>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex gap-2">
                                        <Tooltip label="View Product Category">
                                            <Link href={`${base}/${node.id}`} aria-label="View Product Category" className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-50 text-navy-700 hover:bg-navy-100">
                                                <Icon name="open_in_new" size={16} />
                                            </Link>
                                        </Tooltip>
                                        <Tooltip label="Edit Product Category">
                                            <Link href={`${base}/${node.id}/edit`} aria-label="Edit Product Category" className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-teal-800 hover:bg-teal-100">
                                                <Icon name="edit" size={16} />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    {visibleRows.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-navy-400">
                                {isLoading ? "Loading records..." : "No records found."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

function visibleCategoryRows(
    nodes: CategoryTreeNode[],
    expandedIds: Set<number>,
    depth = 0,
): Array<{ node: CategoryTreeNode; depth: number }> {
    return nodes.flatMap((node) => {
        const row = { node, depth }

        if (!expandedIds.has(node.id)) {
            return [row]
        }

        return [row, ...visibleCategoryRows(node.children, expandedIds, depth + 1)]
    })
}

function DetailPanel({
    kind,
    active,
    onDelete,
}: {
    kind: InventoryMasterKind
    active: MasterEntity | null
    onDelete: () => void
}) {
    if (!active) {
        return <div className={cn("p-8 text-center text-navy-400", inventorySurfaceClass)}>Record not found.</div>
    }

    const details = detailRows(kind, active)
    const images = "images" in active ? active.images ?? [] : []

    return (
        <section className={cn("grid gap-4 p-5", inventorySurfaceClass)}>
            {images.length > 0 ? (
                <div className="flex flex-wrap gap-3 border-b border-navy-50 pb-4">
                    {images.map((image) => (
                        <img
                            key={image.id}
                            src={image.url}
                            alt={image.alt_text || "Product image"}
                            loading="lazy"
                            decoding="async"
                            className="h-24 w-24 rounded-md border border-navy-100 object-cover"
                        />
                    ))}
                </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
                {details.map(([label, value]) => (
                    <div key={label} className="border-b border-navy-50 pb-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-400">{label}</p>
                        <p className="mt-1 font-semibold text-navy-900">{value || "-"}</p>
                    </div>
                ))}
            </div>
            <div className="flex justify-end border-t border-navy-100 pt-4">
                <Button type="button" variant="destructive" onClick={onDelete}>Delete</Button>
            </div>
        </section>
    )
}

function FormFields({
    kind,
    mode,
    form,
    setForm,
    categories,
    brands,
    units,
    products,
    variantGroups,
    variants,
}: {
    kind: InventoryMasterKind
    mode: Mode
    form: FormState
    setForm: Dispatch<SetStateAction<FormState>>
    categories: Category[]
    brands: Brand[]
    units: UnitOfMeasure[]
    products: InventoryProduct[]
    variantGroups: VariantGroup[]
    variants: VariantMaster[]
}) {
    const set = (key: keyof FormState, value: string | boolean | string[]) => setForm((current) => ({ ...current, [key]: value }))

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {["categories", "brands", "units", "products", "product-units", "variant-groups", "variants"].includes(kind) && (
                <Field label={kind === "units" ? "Unit Name" : "Name"} value={form.name} onChange={(event) => set("name", event.target.value)} required={kind !== "product-units"} />
            )}
            {["units", "variant-groups", "variants"].includes(kind) && (
                <Field label="Code" value={form.code} onChange={(event) => set("code", event.target.value)} required />
            )}
            {kind === "categories" && (
                <CategoryLeveledSelect
                    label="Parent Category"
                    value={form.parent_id}
                    onChange={(value) => set("parent_id", String(value))}
                    categories={categories}
                    mode="all"
                    emptyLabel="Root category"
                    placeholder="Root category"
                />
            )}
            {kind === "products" && (
                <>
                    <SearchableSelect label="Base Unit" value={form.base_uom_id} onChange={(value) => set("base_uom_id", String(value))} required options={units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` }))} />
                    <CategoryLeveledSelect label="Category" value={form.category_id} onChange={(value) => set("category_id", String(value))} categories={categories} mode="leaf" emptyLabel="No category" placeholder="No category" />
                    <SearchableSelect label="Brand" value={form.brand_id} onChange={(value) => set("brand_id", String(value))} options={brands.map((brand) => ({ value: brand.id, label: brand.name }))} />
                    {mode === "create" && (
                        <>
                            <Field label="Initial variant SKU" value={form.sku} onChange={(event) => set("sku", event.target.value)} required />
                            <Field label="Initial variant name" value={form.variant_name} onChange={(event) => set("variant_name", event.target.value)} />
                        </>
                    )}
                </>
            )}
            {kind === "variant-groups" && (
                <>
                    <SearchableSelect label="Linked Unit of Measure" value={form.unit_of_measure_id} onChange={(value) => set("unit_of_measure_id", String(value))} required options={units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` }))} />
                    <Field label="Description" value={form.description} onChange={(event) => set("description", event.target.value)} />
                </>
            )}
            {kind === "variants" && (
                <>
                    <SearchableSelect label="Variant Group" value={form.variant_group_id} onChange={(value) => set("variant_group_id", String(value))} required options={variantGroups.map((group) => ({ value: group.id, label: group.name }))} />
                    <Field label="Position" type="number" value={form.position} onChange={(event) => set("position", event.target.value)} />
                </>
            )}
            {kind === "product-units" && (
                <>
                    <SearchableSelect label="Product" value={form.product_id} onChange={(value) => set("product_id", String(value))} required options={products.map((product) => ({ value: product.id, label: product.name }))} />
                    <Field label="SKU" value={form.sku} onChange={(event) => set("sku", event.target.value)} required />
                    <Field label="Barcode" value={form.barcode} onChange={(event) => set("barcode", event.target.value)} />
                    <div className="grid gap-2 md:col-span-2">
                        <p className="text-sm font-bold text-navy-700">Selected Variants</p>
                        <div className="grid gap-2 rounded-lg border border-navy-100 p-3 sm:grid-cols-2 lg:grid-cols-3">
                            {variants.map((variant) => (
                                <label key={variant.id} className="flex items-center gap-2 text-sm font-semibold text-navy-700">
                                    <input
                                        type="checkbox"
                                        checked={form.variant_ids.includes(String(variant.id))}
                                        onChange={(event) => {
                                            set("variant_ids", event.target.checked
                                                ? [...form.variant_ids, String(variant.id)]
                                                : form.variant_ids.filter((id) => id !== String(variant.id)))
                                        }}
                                    />
                                    <span>{variant.group?.name ? `${variant.group.name}: ` : ""}{variant.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </>
            )}
            <label className="flex items-center gap-2 text-sm font-bold text-navy-700">
                <input type="checkbox" checked={form.is_active} onChange={(event) => set("is_active", event.target.checked)} />
                Active
            </label>
        </div>
    )
}

function ProductImageInput({
    value,
    onChange,
}: {
    value: ImageInputState
    onChange: Dispatch<SetStateAction<ImageInputState>>
}) {
    return (
        <div className="grid gap-4 rounded-xl border border-navy-100 bg-navy-50/30 p-4 md:grid-cols-2">
            <Field
                label="Remote image URL"
                value={value.remoteUrl}
                onChange={(event) => onChange((current) => ({ ...current, remoteUrl: event.target.value }))}
                placeholder="https://example.com/menu.jpg"
            />
            <Field
                label="Image alt text"
                value={value.altText}
                onChange={(event) => onChange((current) => ({ ...current, altText: event.target.value }))}
                placeholder="Product image description"
            />
            <label className="grid gap-1.5 text-sm font-medium text-navy-700">
                <span className="text-sm font-semibold text-navy-700">Image file</span>
                <input
                    aria-label="Image file"
                    type="file"
                    accept="image/*"
                    onChange={(event) => onChange((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
                    className="min-h-11 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-900"
                />
            </label>
            <div className="flex items-end">
                {value.remoteUrl ? (
                    <img
                        src={value.remoteUrl}
                        alt="Remote product preview"
                        loading="lazy"
                        decoding="async"
                        className="h-24 w-24 rounded-md border border-navy-100 object-cover"
                    />
                ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-navy-200 text-xs font-semibold text-navy-400">
                        Preview
                    </div>
                )}
            </div>
        </div>
    )
}

function formFromEntity(kind: InventoryMasterKind, entity: MasterEntity): FormState {
    if (kind === "categories") {
        const category = entity as Category
        return { ...emptyForm, name: category.name, parent_id: category.parent_id ? String(category.parent_id) : "", is_active: category.is_active }
    }
    if (kind === "brands") {
        const brand = entity as Brand
        return { ...emptyForm, name: brand.name, is_active: brand.is_active }
    }
    if (kind === "units") {
        const unit = entity as UnitOfMeasure
        return { ...emptyForm, name: unit.name, code: unit.code, is_active: unit.is_active }
    }
    if (kind === "products") {
        const product = entity as InventoryProduct
        return { ...emptyForm, name: product.name, category_id: product.category_id ? String(product.category_id) : "", brand_id: product.brand_id ? String(product.brand_id) : "", base_uom_id: String(product.base_uom_id), is_active: product.status === "active" }
    }
    if (kind === "variant-groups") {
        const group = entity as VariantGroup
        return { ...emptyForm, name: group.name, code: group.code, description: group.description ?? "", unit_of_measure_id: String(group.unit_of_measure_id), is_active: group.is_active }
    }
    if (kind === "variants") {
        const variant = entity as VariantMaster
        return { ...emptyForm, name: variant.name, code: variant.code, variant_group_id: String(variant.variant_group_id), position: String(variant.position), is_active: variant.is_active }
    }
    const productUnit = entity as ProductUnit
    return { ...emptyForm, name: productUnit.name ?? "", sku: productUnit.sku, barcode: productUnit.barcode ?? "", product_id: String(productUnit.product_id), variant_ids: productUnit.variants.map((variant) => String(variant.id)), is_active: productUnit.is_active }
}

async function createEntity(kind: InventoryMasterKind, options: { token: string; companyId: number }, form: FormState) {
    if (kind === "categories") return createCategory(options, { name: form.name, parent_id: form.parent_id ? Number(form.parent_id) : null, is_active: form.is_active })
    if (kind === "brands") return createBrand(options, form.name)
    if (kind === "units") return createUnit(options, { name: form.name, code: form.code })
    if (kind === "products") return createProduct(options, { name: form.name, base_uom_id: Number(form.base_uom_id), category_id: form.category_id ? Number(form.category_id) : undefined, brand_id: form.brand_id ? Number(form.brand_id) : undefined, status: form.is_active ? "active" : "inactive", variants: [{ sku: form.sku, name: form.variant_name || undefined }] })
    if (kind === "variant-groups") return createVariantGroup(options, { name: form.name, code: form.code, unit_of_measure_id: Number(form.unit_of_measure_id), description: form.description || null, is_active: form.is_active })
    if (kind === "variants") return createVariantMaster(options, { variant_group_id: Number(form.variant_group_id), name: form.name, code: form.code, position: Number(form.position || 0), is_active: form.is_active })
    return createProductUnit(options, { product_id: Number(form.product_id), sku: form.sku, barcode: form.barcode || null, name: form.name || null, variant_ids: form.variant_ids.map(Number), is_active: form.is_active })
}

async function updateEntity(kind: InventoryMasterKind, options: { token: string; companyId: number }, id: number, form: FormState, original: MasterEntity | null) {
    if (kind === "categories") {
        const originalParentId = original ? (original as Category).parent_id ?? null : null
        return saveCategoryDetails(
            options,
            id,
            { name: form.name, is_active: form.is_active, parent_id: form.parent_id ? Number(form.parent_id) : null },
            originalParentId,
        )
    }
    if (kind === "brands") return updateBrand(options, id, { name: form.name, is_active: form.is_active })
    if (kind === "units") return updateUnit(options, id, { name: form.name, code: form.code, is_active: form.is_active })
    if (kind === "products") return updateProduct(options, id, { name: form.name, base_uom_id: Number(form.base_uom_id), category_id: form.category_id ? Number(form.category_id) : null, brand_id: form.brand_id ? Number(form.brand_id) : null, status: form.is_active ? "active" : "inactive" })
    if (kind === "variant-groups") return updateVariantGroup(options, id, { name: form.name, code: form.code, unit_of_measure_id: Number(form.unit_of_measure_id), description: form.description || null, is_active: form.is_active })
    if (kind === "variants") return updateVariantMaster(options, id, { variant_group_id: Number(form.variant_group_id), name: form.name, code: form.code, position: Number(form.position || 0), is_active: form.is_active })
    return updateProductUnit(options, id, { product_id: Number(form.product_id), sku: form.sku, barcode: form.barcode || null, name: form.name || null, variant_ids: form.variant_ids.map(Number), is_active: form.is_active })
}

async function deleteEntity(kind: InventoryMasterKind, options: { token: string; companyId: number }, id: number) {
    if (kind === "categories") return deleteCategory(options, id)
    if (kind === "brands") return deleteBrand(options, id)
    if (kind === "units") return deleteUnit(options, id)
    if (kind === "products") return deleteProduct(options, id)
    if (kind === "variant-groups") return deleteVariantGroup(options, id)
    if (kind === "variants") return deleteVariantMaster(options, id)
    return deleteProductUnit(options, id)
}

function entityIdFromResponse(kind: InventoryMasterKind, response: unknown): number | null {
    if (!response || typeof response !== "object" || !("data" in response)) return null
    const data = (response as { data?: Record<string, { id?: number }> }).data

    if (kind === "products") return data?.product?.id ?? null
    if (kind === "product-units") return data?.product_unit?.id ?? null

    return null
}

async function saveImageIfNeeded(
    kind: InventoryMasterKind,
    options: { token: string; companyId: number },
    id: number | null,
    image: ImageInputState,
) {
    if (!id || (!image.file && !image.remoteUrl)) return

    const payload = {
        file: image.file ?? undefined,
        remoteUrl: image.file ? undefined : image.remoteUrl,
        altText: image.altText || undefined,
        isPrimary: true,
    }

    if (kind === "products") {
        await uploadProductImage(options, id, payload)
    } else if (kind === "product-units") {
        await uploadProductUnitImage(options, id, payload)
    }
}

function detailRows(kind: InventoryMasterKind, entity: MasterEntity): Array<[string, string]> {
    const common = "is_active" in entity ? (entity.is_active ? "Active" : "Inactive") : "status" in entity ? entity.status : "Active"
    if (kind === "categories") return [["Name", (entity as Category).name], ["Path", (entity as Category).path], ["Status", common]]
    if (kind === "brands") return [["Name", (entity as Brand).name], ["Status", common]]
    if (kind === "units") return [["Name", (entity as UnitOfMeasure).name], ["Code", (entity as UnitOfMeasure).code], ["Status", common]]
    if (kind === "products") return [["Name", (entity as InventoryProduct).name], ["Status", (entity as InventoryProduct).status], ["Base Unit ID", String((entity as InventoryProduct).base_uom_id)]]
    if (kind === "variant-groups") return [["Name", (entity as VariantGroup).name], ["Code", (entity as VariantGroup).code], ["Unit", (entity as VariantGroup).unit?.name ?? String((entity as VariantGroup).unit_of_measure_id)], ["Status", common]]
    if (kind === "variants") return [["Name", (entity as VariantMaster).name], ["Code", (entity as VariantMaster).code], ["Group", (entity as VariantMaster).group?.name ?? String((entity as VariantMaster).variant_group_id)], ["Status", common]]
    const productUnit = entity as ProductUnit
    return [["SKU", productUnit.sku], ["Name", productUnit.name ?? ""], ["Product", productUnit.product?.name ?? String(productUnit.product_id)], ["Variants", productUnit.variants.map((variant) => variant.name).join(", ")], ["Status", common]]
}

function heading(config: { title: string; singular: string }, mode: Mode) {
    if (mode === "create") return `New ${config.singular}`
    if (mode === "edit") return `Edit ${config.singular}`
    if (mode === "detail") return `${config.singular} Detail`
    return config.title
}

function descriptionFor(kind: InventoryMasterKind) {
    if (kind === "categories") return "Model product type, series, model, and other product hierarchy levels with nested categories."
    if (kind === "product-units") return "Manage final sellable SKU records by selecting a product and its variant values."
    if (kind === "variant-groups") return "Define reusable variant dimensions and link each group to its unit of measure context."
    if (kind === "variants") return "Manage reusable company-wide variant values used by Product Units."
    if (kind === "units") return "Maintain counting units such as pax, box, tray, pieces, kilograms, or liters."
    return "Maintain inventory master data with separated list, detail, create, and edit workflows."
}
