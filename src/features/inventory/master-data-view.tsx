"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Dispatch, FormEvent, SetStateAction } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
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
    listProductUnits,
    listVariantGroups,
    listVariantMasters,
    loadInventory,
    updateBrand,
    updateCategory,
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

const emptyForm: FormState = {
    name: "",
    code: "",
    sku: "",
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
    const { token, activeCompanyId } = useSession()
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
    const [error, setError] = useState<string | null>(null)

    const config = configs[kind]
    const itemId = id ? Number(id) : null
    const requestOptions = useMemo(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const refreshData = useCallback(async () => {
        if (!requestOptions) return

        setIsLoading(true)
        setError(null)

        try {
            const [inventory, groups, masters, unitsResponse] = await Promise.all([
                loadInventory(requestOptions),
                listVariantGroups(requestOptions),
                listVariantMasters(requestOptions),
                listProductUnits(requestOptions, { per_page: 100 }),
            ])

            setCategories(inventory.categories)
            setBrands(inventory.brands)
            setUnits(inventory.units)
            setProducts(inventory.products)
            setVariantGroups(groups.data.variant_groups)
            setVariants(masters.data.variants)
            setProductUnits(unitsResponse.data.product_units)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load inventory master data.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions])

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
        const source = getRows(kind, { categories, brands, units, products, variantGroups, variants, productUnits })
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
        setError(null)

        try {
            if (mode === "create") {
                await createEntity(kind, requestOptions, form)
            } else if (mode === "edit" && itemId) {
                await updateEntity(kind, requestOptions, itemId, form)
            }

            await refreshData()
            router.push(config.base)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to save master data.")
        } finally {
            setIsLoading(false)
        }
    }

    async function deleteEntityFromDetail() {
        if (!requestOptions || !itemId) return
        if (!confirm(`Delete this ${config.singular.toLowerCase()}?`)) return

        setIsLoading(true)
        setError(null)

        try {
            await deleteEntity(kind, requestOptions, itemId)
            await refreshData()
            router.push(config.base)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to delete master data.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-6">
            <header className="flex flex-col gap-4 border-b border-navy-100 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-700">
                        <Icon name={config.icon} size={16} />
                        <span>Inventory Master</span>
                    </div>
                    <h1 className="font-brand text-2xl font-bold text-navy-950">{heading(config, mode)}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500">
                        {descriptionFor(kind)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {mode !== "list" && (
                        <Link href={config.base}>
                            <Button variant="secondary" type="button">Back to List</Button>
                        </Link>
                    )}
                    {mode === "list" && (
                        <Link href={`${config.base}/new`}>
                            <Button type="button" className="bg-teal-700 text-white hover:bg-teal-800">New {config.singular}</Button>
                        </Link>
                    )}
                    {mode === "detail" && itemId && (
                        <Link href={`${config.base}/${itemId}/edit`}>
                            <Button type="button" className="bg-teal-700 text-white hover:bg-teal-800">Edit</Button>
                        </Link>
                    )}
                </div>
            </header>

            {error && (
                <div className="rounded-lg border border-rose-250 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-850">
                    {error}
                </div>
            )}

            {mode === "list" && (
                <section className="grid gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full md:max-w-sm">
                            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={`Search ${config.title.toLowerCase()}`}
                                className="min-h-11 w-full rounded-lg border border-navy-100 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                            />
                        </div>
                        <StatusPill tone={isLoading ? "amber" : "neutral"}>{isLoading ? "Syncing" : `${rows.length} records`}</StatusPill>
                    </div>
                    <MasterTable base={config.base} rows={rows} />
                </section>
            )}

            {mode === "detail" && (
                <DetailPanel
                    kind={kind}
                    active={active as MasterEntity | null}
                    onDelete={deleteEntityFromDetail}
                />
            )}

            {(mode === "create" || mode === "edit") && (
                <form onSubmit={submitForm} className="grid gap-5 rounded-lg border border-navy-100 bg-white p-5">
                    <FormFields
                        kind={kind}
                        form={form}
                        setForm={setForm}
                        categories={categories}
                        brands={brands}
                        units={units}
                        products={products}
                        variantGroups={variantGroups}
                        variants={variants}
                    />
                    <div className="flex justify-end gap-3 border-t border-navy-100 pt-4">
                        <Link href={config.base}>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={isLoading} className="bg-teal-700 text-white hover:bg-teal-800">
                            {isLoading ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    )
}

type MasterEntity = Category | Brand | UnitOfMeasure | InventoryProduct | ProductUnit | VariantGroup | VariantMaster

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
    const rowsByKind = {
        categories: data.categories.map((item) => ({
            id: item.id,
            title: `${"- ".repeat(item.depth)}${item.name}`,
            meta: item.parent_id ? `Parent #${item.parent_id}` : "Root category",
            status: item.is_active,
            search: `${item.name} ${item.path}`,
            raw: item,
        })),
        brands: data.brands.map((item) => row(item.id, item.name, "Brand", item.is_active, item.name, item)),
        units: data.units.map((item) => row(item.id, item.name, item.code, item.is_active, `${item.name} ${item.code}`, item)),
        products: data.products.map((item) => row(item.id, item.name, item.status, item.status === "active", item.name, item)),
        "product-units": data.productUnits.map((item) => row(item.id, item.sku, item.name ?? "Sellable SKU", item.is_active, `${item.sku} ${item.name ?? ""}`, item)),
        "variant-groups": data.variantGroups.map((item) => row(item.id, item.name, item.unit?.code ?? item.code, item.is_active, `${item.name} ${item.code}`, item)),
        variants: data.variants.map((item) => row(item.id, item.name, item.group?.name ?? item.code, item.is_active, `${item.name} ${item.code}`, item)),
    } satisfies Record<InventoryMasterKind, Array<{ id: number; title: string; meta: string; status: boolean; search: string; raw: MasterEntity }>>

    return rowsByKind[kind]
}

function row(id: number, title: string, meta: string, status: boolean, search: string, raw: MasterEntity) {
    return { id, title, meta, status, search, raw }
}

function MasterTable({
    base,
    rows,
}: {
    base: string
    rows: Array<{ id: number; title: string; meta: string; status: boolean }>
}) {
    return (
        <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white">
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
                            <td className="px-5 py-4 font-bold text-navy-950">{item.title}</td>
                            <td className="px-5 py-4 text-navy-500">{item.meta}</td>
                            <td className="px-5 py-4">
                                <StatusPill tone={item.status ? "green" : "neutral"}>{item.status ? "active" : "inactive"}</StatusPill>
                            </td>
                            <td className="px-5 py-4">
                                <div className="flex gap-2">
                                    <Link href={`${base}/${item.id}`} className="rounded-md bg-navy-50 px-3 py-1.5 text-xs font-bold text-navy-700 hover:bg-navy-100">View</Link>
                                    <Link href={`${base}/${item.id}/edit`} className="rounded-md bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100">Edit</Link>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-navy-400">No records found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
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
        return <div className="rounded-lg border border-navy-100 bg-white p-8 text-center text-navy-400">Record not found.</div>
    }

    const details = detailRows(kind, active)

    return (
        <section className="grid gap-4 rounded-lg border border-navy-100 bg-white p-5">
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
                <SearchableSelect
                    label="Parent Category"
                    value={form.parent_id}
                    onChange={(value) => set("parent_id", String(value))}
                    options={categories.map((category) => ({ value: category.id, label: `${"- ".repeat(category.depth)}${category.name}` }))}
                    placeholder="Root category"
                />
            )}
            {kind === "products" && (
                <>
                    <SearchableSelect label="Base Unit" value={form.base_uom_id} onChange={(value) => set("base_uom_id", String(value))} required options={units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` }))} />
                    <SearchableSelect label="Category" value={form.category_id} onChange={(value) => set("category_id", String(value))} options={categories.map((category) => ({ value: category.id, label: `${"- ".repeat(category.depth)}${category.name}` }))} />
                    <SearchableSelect label="Brand" value={form.brand_id} onChange={(value) => set("brand_id", String(value))} options={brands.map((brand) => ({ value: brand.id, label: brand.name }))} />
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
    if (kind === "products") return createProduct(options, { name: form.name, base_uom_id: Number(form.base_uom_id), category_id: form.category_id ? Number(form.category_id) : undefined, brand_id: form.brand_id ? Number(form.brand_id) : undefined, status: form.is_active ? "active" : "inactive" })
    if (kind === "variant-groups") return createVariantGroup(options, { name: form.name, code: form.code, unit_of_measure_id: Number(form.unit_of_measure_id), description: form.description || null, is_active: form.is_active })
    if (kind === "variants") return createVariantMaster(options, { variant_group_id: Number(form.variant_group_id), name: form.name, code: form.code, position: Number(form.position || 0), is_active: form.is_active })
    return createProductUnit(options, { product_id: Number(form.product_id), sku: form.sku, barcode: form.barcode || null, name: form.name || null, variant_ids: form.variant_ids.map(Number), is_active: form.is_active })
}

async function updateEntity(kind: InventoryMasterKind, options: { token: string; companyId: number }, id: number, form: FormState) {
    if (kind === "categories") return updateCategory(options, id, { name: form.name, is_active: form.is_active })
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
