"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Dispatch, FormEvent, SetStateAction } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { Field } from "@/components/ui/field"
import { FilterBar } from "@/components/ui/filter-bar"
import { fieldControlClassName } from "@/components/ui/form-control"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { TableStateRow } from "@/components/ui/table-state-row"
import { Tooltip } from "@/components/ui/tooltip"
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog"
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

/** `key` addresses the per-kind copy under `inventory.master.kinds.*`. */
const configs: Record<InventoryMasterKind, { key: string; base: string; icon: string }> = {
    categories: { key: "categories", base: "/inventory/master/categories", icon: "account_tree" },
    brands: { key: "brands", base: "/inventory/master/brands", icon: "sell" },
    units: { key: "units", base: "/inventory/master/units-of-measure", icon: "straighten" },
    products: { key: "products", base: "/inventory/master/products", icon: "inventory_2" },
    "product-units": { key: "productUnits", base: "/inventory/master/product-units", icon: "qr_code_2" },
    "variant-groups": { key: "variantGroups", base: "/inventory/master/variant-groups", icon: "category" },
    variants: { key: "variants", base: "/inventory/master/variants", icon: "tune" },
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
    const t = useTranslations("inventory.master")
    const commonT = useTranslations("common")
    const [confirm, confirmDialog] = useConfirm()
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
    const title = t(`kinds.${config.key}.title`)
    const singular = t(`kinds.${config.key}.singular`)
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
            toast.error(caught instanceof Error ? caught.message : t("toast.loadError"))
        } finally {
            setIsLoading(false)
        }
    }, [kind, requestOptions, t])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void refreshData()
        })
        return () => {
            active = false
        }
    }, [refreshData])

    const rowLabels = useMemo(
        () => ({
            rootCategory: t("rootCategory"),
            brand: t("meta.brand"),
            sellableSku: t("meta.sellableSku"),
        }),
        [t],
    )

    const rows = useMemo(() => {
        const scopedCategories = kind === "categories" ? categoriesWithAncestorsForQuery(categories, query) : categories
        const source = getRows(
            kind,
            { categories: scopedCategories, brands, units, products, variantGroups, variants, productUnits },
            rowLabels,
        )
        if (kind === "categories") return source
        if (!query) return source
        const lowered = query.toLowerCase()
        return source.filter((row) => row.search.toLowerCase().includes(lowered))
    }, [brands, categories, kind, productUnits, products, query, rowLabels, units, variantGroups, variants])

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
            toast.success(t("toast.saved", { name: singular }))
            router.push(config.base)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("toast.saveError"))
        } finally {
            setIsLoading(false)
        }
    }

    async function deleteEntityFromDetail() {
        if (!requestOptions || !itemId) return

        const ok = await confirm({
            title: t("detail.deleteTitle", { name: singular }),
            message: t("detail.deleteMessage"),
            confirmLabel: commonT("delete"),
            cancelLabel: commonT("cancel"),
            danger: true,
        })
        if (!ok) return

        setIsLoading(true)

        try {
            await deleteEntity(kind, requestOptions, itemId)
            await refreshData()
            toast.success(t("toast.deleted", { name: singular }))
            router.push(config.base)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("toast.deleteError"))
        } finally {
            setIsLoading(false)
        }
    }

    const heading =
        mode === "create"
            ? t("heading.create", { name: singular })
            : mode === "edit"
              ? t("heading.edit", { name: singular })
              : mode === "detail"
                ? t("heading.detail", { name: singular })
                : title

    return (
        <div className="grid gap-6">
            {confirmDialog}
            <PageHeader
                dataAttribute="data-inventory-page-header"
                eyebrow={(
                    <>
                        <Icon name={config.icon} size={16} />
                        <span>{t("eyebrow")}</span>
                    </>
                )}
                title={heading}
                subtitle={t(`kinds.${config.key}.description`)}
                status={
                    <StatusPill tone={activeCompanyId ? "green" : "amber"}>
                        {activeCompanyId ? commonT("companyScoped") : commonT("noCompany")}
                    </StatusPill>
                }
                backHref={mode !== "list" ? config.base : undefined}
                backLabel={t("backToList")}
                actions={(
                    <>
                        {mode === "list" && kind === "products" && requestOptions && (
                            <Button type="button" variant="outline" size="xl" onClick={() => setImportOpen(true)}>
                                <Icon name="description" size={18} />
                                {t("actions.import")}
                            </Button>
                        )}
                        {mode === "list" && (
                            <Link href={`${config.base}/new`} className={buttonVariants({ size: "xl" })}>
                                {t("heading.create", { name: singular })}
                            </Link>
                        )}
                        {mode === "detail" && itemId && (
                            <Link href={`${config.base}/${itemId}/edit`} className={buttonVariants({ size: "xl" })}>
                                {commonT("edit")}
                            </Link>
                        )}
                    </>
                )}
            />

            {requestOptions && kind === "products" ? (
                <SpreadsheetImportDialog
                    open={importOpen}
                    onClose={() => setImportOpen(false)}
                    title={t("import.title")}
                    description={t("import.description")}
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
                <section>
                    <FilterBar
                        end={<StatusPill tone="neutral">{t("list.recordCount", { count: rows.length })}</StatusPill>}
                    >
                        <Input
                            label={t("list.searchLabel", { name: title })}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t("list.searchLabel", { name: title })}
                            className="w-full md:min-w-80"
                        />
                    </FilterBar>
                    <MasterTable
                        kind={kind}
                        base={config.base}
                        rows={rows}
                        query={query}
                        isLoading={isLoading}
                        singular={singular}
                    />
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
                <Card as="form" onSubmit={submitForm} className="grid gap-5">
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
                    <div className="flex justify-end gap-3 border-t border-line pt-4">
                        <Link href={config.base} className={buttonVariants({ variant: "secondary", size: "xl" })}>
                            {commonT("cancel")}
                        </Link>
                        <Button type="submit" size="xl" disabled={isLoading}>
                            {isLoading ? t("form.saving") : commonT("save")}
                        </Button>
                    </div>
                </Card>
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

type RowLabels = {
    rootCategory: string
    brand: string
    sellableSku: string
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
    labels: RowLabels,
) {
    const categoryOptions = flattenCategoryTree(data.categories)
    const rowsByKind = {
        categories: categoryOptions.map((option) => ({
            id: option.category.id,
            title: option.category.name,
            meta: option.parentBreadcrumb || labels.rootCategory,
            status: option.category.is_active,
            search: `${option.category.name} ${option.breadcrumb} ${option.category.path}`,
            raw: option.category,
        })),
        brands: data.brands.map((item) => row(item.id, item.name, labels.brand, item.is_active, item.name, item)),
        units: data.units.map((item) => row(item.id, item.name, item.code, item.is_active, `${item.name} ${item.code}`, item)),
        products: data.products.map((item) => row(item.id, item.name, item.status, item.status === "active", item.name, item)),
        "product-units": data.productUnits.map((item) => row(item.id, item.sku, item.name ?? labels.sellableSku, item.is_active, `${item.sku} ${item.name ?? ""}`, item)),
        "variant-groups": data.variantGroups.map((item) => row(item.id, item.name, item.unit?.code ?? item.code, item.is_active, `${item.name} ${item.code}`, item)),
        variants: data.variants.map((item) => row(item.id, item.name, item.group?.name ?? item.code, item.is_active, `${item.name} ${item.code}`, item)),
    } satisfies Record<InventoryMasterKind, MasterRow[]>

    return rowsByKind[kind]
}

function row(id: number, title: string, meta: string, status: boolean, search: string, raw: MasterEntity) {
    const image = ("images" in raw ? raw.images?.[0] : undefined) ?? undefined
    return { id, title, meta, status, search, raw, image }
}

const rowActionClass =
    "flex h-8 w-8 items-center justify-center rounded-md transition-colors"

function MasterTable({
    kind,
    base,
    rows,
    query,
    isLoading = false,
    singular,
}: {
    kind: InventoryMasterKind
    base: string
    rows: MasterRow[]
    query: string
    isLoading?: boolean
    singular: string
}) {
    const t = useTranslations("inventory.master")

    if (kind === "categories") {
        return <CategoryTreeTable base={base} rows={rows} query={query} isLoading={isLoading} singular={singular} />
    }

    return (
        <DataTable
            columns={[t("table.name"), t("table.context"), t("table.status"), t("table.actions")]}
            minWidth={620}
        >
            <TableStateRow
                isLoading={isLoading && rows.length === 0}
                count={rows.length}
                columns={4}
                emptyMessage={t("table.empty")}
            />
            {rows.map((item) => (
                <tr key={item.id}>
                    <td className="font-semibold text-ink">
                        <div className="flex items-center gap-3">
                            {item.image ? (
                                <img
                                    src={item.image.url}
                                    alt={item.image.alt_text || item.title}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-10 w-10 rounded-md border border-line object-cover"
                                />
                            ) : null}
                            <span>{item.title}</span>
                        </div>
                    </td>
                    <td className="text-ink-muted">{item.meta}</td>
                    <td>
                        <StatusPill tone={item.status ? "green" : "neutral"}>
                            {item.status ? t("status.active") : t("status.inactive")}
                        </StatusPill>
                    </td>
                    <td>
                        <div className="flex gap-2">
                            <Tooltip label={t("table.view", { name: singular })}>
                                <Link
                                    href={`${base}/${item.id}`}
                                    aria-label={t("table.view", { name: singular })}
                                    className={cn(rowActionClass, "bg-surface-muted text-ink-secondary hover:bg-brand-soft hover:text-brand-ink")}
                                >
                                    <Icon name="open_in_new" size={16} />
                                </Link>
                            </Tooltip>
                            <Tooltip label={t("table.edit", { name: singular })}>
                                <Link
                                    href={`${base}/${item.id}/edit`}
                                    aria-label={t("table.edit", { name: singular })}
                                    className={cn(rowActionClass, "bg-brand-soft text-brand-ink hover:bg-brand-soft/70")}
                                >
                                    <Icon name="edit" size={16} />
                                </Link>
                            </Tooltip>
                        </div>
                    </td>
                </tr>
            ))}
        </DataTable>
    )
}

/**
 * P5 surface: the leveled category tree keeps its hand-rolled table so the
 * expand/collapse interaction stays exactly as-is — only tokens migrated.
 */
function CategoryTreeTable({
    base,
    rows,
    query,
    isLoading = false,
    singular,
}: {
    base: string
    rows: MasterRow[]
    query: string
    isLoading?: boolean
    singular: string
}) {
    const t = useTranslations("inventory.master")
    const categories = useMemo(() => rows.map((row) => row.raw as Category), [rows])
    const tree = useMemo(() => buildCategoryTree(categories), [categories])
    const parentIds = useMemo(() => expandableCategoryIds(categories), [categories])
    const categoryMeta = useMemo(() => {
        return new Map(flattenCategoryTree(categories).map((option) => [option.category.id, option.parentBreadcrumb || t("rootCategory")]))
    }, [categories, t])
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
        <div className="overflow-x-auto rounded-lg bg-surface shadow-card">
            <table className="w-full min-w-[620px] text-left text-sm text-ink-secondary">
                <thead className="border-b border-line bg-surface-muted/50">
                    <tr>
                        <th className="px-5 py-3 type-card-label uppercase tracking-wider whitespace-nowrap">{t("table.name")}</th>
                        <th className="px-5 py-3 type-card-label uppercase tracking-wider whitespace-nowrap">{t("table.context")}</th>
                        <th className="px-5 py-3 type-card-label uppercase tracking-wider whitespace-nowrap">{t("table.status")}</th>
                        <th className="px-5 py-3 type-card-label uppercase tracking-wider whitespace-nowrap">{t("table.actions")}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {visibleRows.map(({ node, depth }) => {
                        const hasChildren = node.children.length > 0
                        const expanded = effectiveExpandedIds.has(node.id)

                        return (
                            <tr key={node.id} className="transition-colors hover:bg-surface-muted/60">
                                <td className="px-5 py-4 font-bold text-ink">
                                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 22}px` }}>
                                        {hasChildren ? (
                                            <button
                                                type="button"
                                                aria-label={expanded ? t("table.collapse", { name: node.name }) : t("table.expand", { name: node.name })}
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
                                                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition hover:bg-surface-muted hover:text-ink-secondary"
                                            >
                                                <Icon name="chevron_right" size={16} className={cn("transition-transform", expanded ? "rotate-90" : "")} />
                                            </button>
                                        ) : (
                                            <span className="h-7 w-7" aria-hidden="true" />
                                        )}
                                        {depth > 0 ? <span className="h-6 w-px bg-line" aria-hidden="true" /> : null}
                                        <span>{node.name}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-ink-muted">{categoryMeta.get(node.id) ?? t("rootCategory")}</td>
                                <td className="px-5 py-4">
                                    <StatusPill tone={node.is_active ? "green" : "neutral"}>
                                        {node.is_active ? t("status.active") : t("status.inactive")}
                                    </StatusPill>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex gap-2">
                                        <Tooltip label={t("table.view", { name: singular })}>
                                            <Link
                                                href={`${base}/${node.id}`}
                                                aria-label={t("table.view", { name: singular })}
                                                className={cn(rowActionClass, "bg-surface-muted text-ink-secondary hover:bg-brand-soft hover:text-brand-ink")}
                                            >
                                                <Icon name="open_in_new" size={16} />
                                            </Link>
                                        </Tooltip>
                                        <Tooltip label={t("table.edit", { name: singular })}>
                                            <Link
                                                href={`${base}/${node.id}/edit`}
                                                aria-label={t("table.edit", { name: singular })}
                                                className={cn(rowActionClass, "bg-brand-soft text-brand-ink hover:bg-brand-soft/70")}
                                            >
                                                <Icon name="edit" size={16} />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    {isLoading && visibleRows.length === 0
                        ? Array.from({ length: 4 }).map((_, row) => (
                            <tr key={row} aria-hidden="true">
                                {Array.from({ length: 4 }).map((__, cell) => (
                                    <td key={cell} className="px-5 py-4"><Skeleton className="h-4" /></td>
                                ))}
                            </tr>
                        ))
                        : visibleRows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-5 py-8 text-center text-ink-muted">{t("table.empty")}</td>
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
    const t = useTranslations("inventory.master")
    const commonT = useTranslations("common")

    if (!active) {
        return (
            <Card>
                <EmptyState compact icon="search_off" title={t("detail.notFound")} />
            </Card>
        )
    }

    const details = detailRows(kind, active, {
        active: t("status.active"),
        inactive: t("status.inactive"),
    })
    const images = "images" in active ? active.images ?? [] : []

    return (
        <Card as="section" className="grid gap-4">
            {images.length > 0 ? (
                <div className="flex flex-wrap gap-3 border-b border-line pb-4">
                    {images.map((image) => (
                        <img
                            key={image.id}
                            src={image.url}
                            alt={image.alt_text || t("detail.imageAlt")}
                            loading="lazy"
                            decoding="async"
                            className="h-24 w-24 rounded-md border border-line object-cover"
                        />
                    ))}
                </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
                {details.map(([key, value]) => (
                    <div key={key} className="border-b border-line pb-3">
                        <p className="type-card-label">{t(`detail.${key}`)}</p>
                        <p className="mt-1 font-semibold text-ink">{value || "-"}</p>
                    </div>
                ))}
            </div>
            <div className="flex justify-end border-t border-line pt-4">
                <Button type="button" variant="destructive" onClick={onDelete}>{commonT("delete")}</Button>
            </div>
        </Card>
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
    const t = useTranslations("inventory.master")
    const set = (key: keyof FormState, value: string | boolean | string[]) => setForm((current) => ({ ...current, [key]: value }))

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {["categories", "brands", "units", "products", "product-units", "variant-groups", "variants"].includes(kind) && (
                <Field label={kind === "units" ? t("form.unitName") : t("form.name")} value={form.name} onChange={(event) => set("name", event.target.value)} required={kind !== "product-units"} />
            )}
            {["units", "variant-groups", "variants"].includes(kind) && (
                <Field label={t("form.code")} value={form.code} onChange={(event) => set("code", event.target.value)} required />
            )}
            {kind === "categories" && (
                <CategoryLeveledSelect
                    label={t("form.parentCategory")}
                    value={form.parent_id}
                    onChange={(value) => set("parent_id", String(value))}
                    categories={categories}
                    mode="all"
                    emptyLabel={t("rootCategory")}
                    placeholder={t("rootCategory")}
                />
            )}
            {kind === "products" && (
                <>
                    <SearchableSelect label={t("form.baseUnit")} value={form.base_uom_id} onChange={(value) => set("base_uom_id", String(value))} required options={units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` }))} />
                    <CategoryLeveledSelect label={t("form.category")} value={form.category_id} onChange={(value) => set("category_id", String(value))} categories={categories} mode="leaf" emptyLabel={t("form.noCategory")} placeholder={t("form.noCategory")} />
                    <SearchableSelect label={t("form.brand")} value={form.brand_id} onChange={(value) => set("brand_id", String(value))} options={brands.map((brand) => ({ value: brand.id, label: brand.name }))} />
                    {mode === "create" && (
                        <>
                            <Field label={t("form.initialSku")} value={form.sku} onChange={(event) => set("sku", event.target.value)} required />
                            <Field label={t("form.initialVariantName")} value={form.variant_name} onChange={(event) => set("variant_name", event.target.value)} />
                        </>
                    )}
                </>
            )}
            {kind === "variant-groups" && (
                <>
                    <SearchableSelect label={t("form.linkedUnit")} value={form.unit_of_measure_id} onChange={(value) => set("unit_of_measure_id", String(value))} required options={units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` }))} />
                    <Field label={t("form.description")} value={form.description} onChange={(event) => set("description", event.target.value)} />
                </>
            )}
            {kind === "variants" && (
                <>
                    <SearchableSelect label={t("form.variantGroup")} value={form.variant_group_id} onChange={(value) => set("variant_group_id", String(value))} required options={variantGroups.map((group) => ({ value: group.id, label: group.name }))} />
                    <Field label={t("form.position")} type="number" value={form.position} onChange={(event) => set("position", event.target.value)} />
                </>
            )}
            {kind === "product-units" && (
                <>
                    <SearchableSelect label={t("form.product")} value={form.product_id} onChange={(value) => set("product_id", String(value))} required options={products.map((product) => ({ value: product.id, label: product.name }))} />
                    <Field label={t("form.sku")} value={form.sku} onChange={(event) => set("sku", event.target.value)} required />
                    <Field label={t("form.barcode")} value={form.barcode} onChange={(event) => set("barcode", event.target.value)} />
                    <div className="grid gap-2 md:col-span-2">
                        <p className="text-sm font-semibold text-ink-secondary">{t("form.selectedVariants")}</p>
                        <div className="grid gap-2 rounded-lg bg-surface-muted p-3 sm:grid-cols-2 lg:grid-cols-3">
                            {variants.map((variant) => (
                                <label key={variant.id} className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
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
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                <input type="checkbox" checked={form.is_active} onChange={(event) => set("is_active", event.target.checked)} />
                {t("form.active")}
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
    const t = useTranslations("inventory.master.form.image")

    return (
        <Card inset padding="sm" className="grid gap-4 md:grid-cols-2">
            <Field
                label={t("remoteUrl")}
                value={value.remoteUrl}
                onChange={(event) => onChange((current) => ({ ...current, remoteUrl: event.target.value }))}
                placeholder="https://example.com/menu.jpg"
            />
            <Field
                label={t("altText")}
                value={value.altText}
                onChange={(event) => onChange((current) => ({ ...current, altText: event.target.value }))}
                placeholder={t("altPlaceholder")}
            />
            <Field label={t("file")}>
                <input
                    aria-label={t("file")}
                    type="file"
                    accept="image/*"
                    onChange={(event) => onChange((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
                    className={cn(fieldControlClassName, "py-2")}
                />
            </Field>
            <div className="flex items-end">
                {value.remoteUrl ? (
                    <img
                        src={value.remoteUrl}
                        alt={t("previewAlt")}
                        loading="lazy"
                        decoding="async"
                        className="h-24 w-24 rounded-md border border-line object-cover"
                    />
                ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-line text-xs font-semibold text-ink-faint">
                        {t("preview")}
                    </div>
                )}
            </div>
        </Card>
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

/**
 * Returns `[detailLabelKey, value]` pairs; keys resolve under
 * `inventory.master.detail.*` at render time.
 */
function detailRows(
    kind: InventoryMasterKind,
    entity: MasterEntity,
    statusLabels: { active: string; inactive: string },
): Array<[string, string]> {
    const common = "is_active" in entity
        ? (entity.is_active ? statusLabels.active : statusLabels.inactive)
        : "status" in entity
          ? entity.status
          : statusLabels.active
    if (kind === "categories") return [["name", (entity as Category).name], ["path", (entity as Category).path], ["status", common]]
    if (kind === "brands") return [["name", (entity as Brand).name], ["status", common]]
    if (kind === "units") return [["name", (entity as UnitOfMeasure).name], ["code", (entity as UnitOfMeasure).code], ["status", common]]
    if (kind === "products") return [["name", (entity as InventoryProduct).name], ["status", (entity as InventoryProduct).status], ["baseUnitId", String((entity as InventoryProduct).base_uom_id)]]
    if (kind === "variant-groups") return [["name", (entity as VariantGroup).name], ["code", (entity as VariantGroup).code], ["unit", (entity as VariantGroup).unit?.name ?? String((entity as VariantGroup).unit_of_measure_id)], ["status", common]]
    if (kind === "variants") return [["name", (entity as VariantMaster).name], ["code", (entity as VariantMaster).code], ["group", (entity as VariantMaster).group?.name ?? String((entity as VariantMaster).variant_group_id)], ["status", common]]
    const productUnit = entity as ProductUnit
    return [["sku", productUnit.sku], ["name", productUnit.name ?? ""], ["product", productUnit.product?.name ?? String(productUnit.product_id)], ["variants", productUnit.variants.map((variant) => variant.name).join(", ")], ["status", common]]
}
