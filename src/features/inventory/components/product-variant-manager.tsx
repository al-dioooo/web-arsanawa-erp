"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import {
    addVariant,
    deleteVariant,
    getProduct,
    setVariantAvailability,
    syncProductTags,
    updateVariant,
} from "@/features/inventory/inventory-api"
import { inventorySurfaceClass } from "@/features/inventory/inventory-layout"
import type { InventoryProduct, ProductVariant } from "@/features/inventory/inventory-types"
import type { Branch } from "@/lib/types"

type RequestOptions = { token: string; companyId: number }

type VariantFormState = { sku: string; name: string; barcode: string }

const emptyVariantForm: VariantFormState = { sku: "", name: "", barcode: "" }

/**
 * Variant CRUD, tag editing, and per-branch availability for one product.
 * Owns its own product fetch so every mutation can re-read the stored state.
 */
export function ProductVariantManager({
    productId,
    requestOptions,
    branches,
    onChanged,
}: {
    productId: number
    requestOptions: RequestOptions
    branches: Branch[]
    onChanged?: () => void
}) {
    const [product, setProduct] = useState<InventoryProduct | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isMutating, setIsMutating] = useState(false)
    const [addForm, setAddForm] = useState<VariantFormState>(emptyVariantForm)
    const [editingVariantId, setEditingVariantId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<VariantFormState>(emptyVariantForm)
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")
    const [confirm, confirmDialog] = useConfirm()

    const loadProduct = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await getProduct(requestOptions, productId)
            setProduct(response.data.product)
            setTags((response.data.product.tags ?? []).map((tag) => tag.name))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to load product variants.")
        } finally {
            setIsLoading(false)
        }
    }, [productId, requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void loadProduct()
        })
        return () => {
            active = false
        }
    }, [loadProduct])

    async function runMutation(action: () => Promise<unknown>, successMessage: string) {
        setIsMutating(true)
        try {
            await action()
            toast.success(successMessage)
            await loadProduct()
            onChanged?.()
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Something went wrong.")
        } finally {
            setIsMutating(false)
        }
    }

    async function submitAddVariant(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!addForm.sku.trim()) return
        await runMutation(
            () =>
                addVariant(requestOptions, productId, {
                    sku: addForm.sku.trim(),
                    name: addForm.name.trim() || null,
                    barcode: addForm.barcode.trim() || null,
                }),
            "Variant added.",
        )
        setAddForm(emptyVariantForm)
    }

    function startEditVariant(variant: ProductVariant) {
        setEditingVariantId(variant.id)
        setEditForm({ sku: variant.sku, name: variant.name ?? "", barcode: variant.barcode ?? "" })
    }

    async function saveEditVariant(variantId: number) {
        await runMutation(
            () =>
                updateVariant(requestOptions, productId, variantId, {
                    sku: editForm.sku.trim(),
                    name: editForm.name.trim() || null,
                    barcode: editForm.barcode.trim() || null,
                }),
            "Variant updated.",
        )
        setEditingVariantId(null)
    }

    async function toggleVariantActive(variant: ProductVariant) {
        await runMutation(
            () => updateVariant(requestOptions, productId, variant.id, { is_active: !variant.is_active }),
            variant.is_active ? "Variant deactivated." : "Variant activated.",
        )
    }

    async function removeVariant(variant: ProductVariant) {
        const ok = await confirm({
            title: `Delete variant “${variant.sku}”?`,
            message: "This permanently removes the variant along with its prices, stock lots, and movements.",
            confirmLabel: "Delete",
            danger: true,
        })
        if (!ok) return
        await runMutation(() => deleteVariant(requestOptions, productId, variant.id), "Variant deleted.")
    }

    function addTag() {
        const value = tagInput.trim()
        if (!value || tags.includes(value)) {
            setTagInput("")
            return
        }
        setTags((current) => [...current, value])
        setTagInput("")
    }

    async function saveTags() {
        await runMutation(() => syncProductTags(requestOptions, productId, tags), "Tags saved.")
    }

    function variantAvailability(variant: ProductVariant, branchId: number): boolean {
        const row = variant.branch_availability?.find((entry) => entry.branch_id === branchId)
        return row ? row.is_available : true
    }

    async function toggleAvailability(variant: ProductVariant, branchId: number) {
        const next = !variantAvailability(variant, branchId)
        await runMutation(
            () =>
                setVariantAvailability(requestOptions, productId, variant.id, {
                    branch_id: branchId,
                    is_available: next,
                }),
            next ? "Variant made available." : "Variant hidden for branch.",
        )
    }

    const variants = product?.variants ?? []

    return (
        <div className="grid gap-6">
            {confirmDialog}

            <section className={`grid gap-4 p-5 ${inventorySurfaceClass}`}>
                <div>
                    <h3 className="text-sm font-bold text-navy-950">Variants</h3>
                    <p className="text-xs text-navy-500">
                        Sellable SKUs for this product. Pricing and POS sales key off variants.
                    </p>
                </div>

                <DataTable columns={["SKU", "Name", "Barcode", "Status", "Actions"]}>
                    {isLoading && variants.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-5 py-6 text-center text-sm text-navy-400">
                                Loading variants...
                            </td>
                        </tr>
                    ) : variants.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-5 py-6 text-center text-sm text-navy-400">
                                No variants yet. Add one below to make this product sellable.
                            </td>
                        </tr>
                    ) : (
                        variants.map((variant) =>
                            editingVariantId === variant.id ? (
                                <tr key={variant.id} className="border-t border-navy-50">
                                    <td className="px-5 py-3">
                                        <Field
                                            label="Edit SKU"
                                            hideLabel
                                            value={editForm.sku}
                                            onChange={(event) => setEditForm((current) => ({ ...current, sku: event.target.value }))}
                                            required
                                        />
                                    </td>
                                    <td className="px-5 py-3">
                                        <Field
                                            label="Edit variant name"
                                            hideLabel
                                            value={editForm.name}
                                            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                                        />
                                    </td>
                                    <td className="px-5 py-3">
                                        <Field
                                            label="Edit barcode"
                                            hideLabel
                                            value={editForm.barcode}
                                            onChange={(event) => setEditForm((current) => ({ ...current, barcode: event.target.value }))}
                                        />
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusPill tone={variant.is_active ? "green" : "neutral"}>
                                            {variant.is_active ? "Active" : "Inactive"}
                                        </StatusPill>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={isMutating || !editForm.sku.trim()}
                                                onClick={() => void saveEditVariant(variant.id)}
                                            >
                                                Save
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingVariantId(null)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={variant.id} className="border-t border-navy-50">
                                    <td className="px-5 py-3 font-semibold text-navy-950">{variant.sku}</td>
                                    <td className="px-5 py-3 text-navy-700">{variant.name || "—"}</td>
                                    <td className="px-5 py-3 text-navy-500">{variant.barcode || "—"}</td>
                                    <td className="px-5 py-3">
                                        <StatusPill tone={variant.is_active ? "green" : "neutral"}>
                                            {variant.is_active ? "Active" : "Inactive"}
                                        </StatusPill>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Edit variant ${variant.sku}`}
                                                disabled={isMutating}
                                                onClick={() => startEditVariant(variant)}
                                            >
                                                <Icon name="edit" size={16} />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={isMutating}
                                                onClick={() => void toggleVariantActive(variant)}
                                            >
                                                {variant.is_active ? "Deactivate" : "Activate"}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Delete variant ${variant.sku}`}
                                                disabled={isMutating}
                                                onClick={() => void removeVariant(variant)}
                                            >
                                                <Icon name="delete" size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ),
                        )
                    )}
                </DataTable>

                <form onSubmit={submitAddVariant} className="grid items-end gap-3 border-t border-navy-50 pt-4 sm:grid-cols-4">
                    <Field
                        label="New variant SKU"
                        value={addForm.sku}
                        onChange={(event) => setAddForm((current) => ({ ...current, sku: event.target.value }))}
                        required
                    />
                    <Field
                        label="Variant name"
                        value={addForm.name}
                        onChange={(event) => setAddForm((current) => ({ ...current, name: event.target.value }))}
                    />
                    <Field
                        label="Barcode"
                        value={addForm.barcode}
                        onChange={(event) => setAddForm((current) => ({ ...current, barcode: event.target.value }))}
                    />
                    <Button type="submit" disabled={isMutating} className="bg-teal-700 text-white hover:bg-teal-800">
                        Add variant
                    </Button>
                </form>
            </section>

            <section className={`grid gap-4 p-5 ${inventorySurfaceClass}`}>
                <div>
                    <h3 className="text-sm font-bold text-navy-950">Tags</h3>
                    <p className="text-xs text-navy-500">Labels for grouping and filtering products.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700"
                        >
                            {tag}
                            <button
                                type="button"
                                aria-label={`Remove tag ${tag}`}
                                className="text-teal-500 hover:text-teal-900"
                                onClick={() => setTags((current) => current.filter((entry) => entry !== tag))}
                            >
                                <Icon name="close" size={12} />
                            </button>
                        </span>
                    ))}
                    {tags.length === 0 && <span className="text-xs text-navy-400">No tags.</span>}
                </div>
                <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <Field
                        label="Add tag"
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault()
                                addTag()
                            }
                        }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                        Add
                    </Button>
                    <Button type="button" disabled={isMutating} onClick={() => void saveTags()} className="bg-teal-700 text-white hover:bg-teal-800">
                        Save tags
                    </Button>
                </div>
            </section>

            {branches.length > 0 && (
                <section className={`grid gap-4 p-5 ${inventorySurfaceClass}`}>
                    <div>
                        <h3 className="text-sm font-bold text-navy-950">Branch availability</h3>
                        <p className="text-xs text-navy-500">
                            Variants are available everywhere unless switched off for a branch.
                        </p>
                    </div>
                    <DataTable columns={["Variant", ...branches.map((branch) => branch.name)]}>
                        {variants.length === 0 ? (
                            <tr>
                                <td colSpan={branches.length + 1} className="px-5 py-6 text-center text-sm text-navy-400">
                                    Add a variant to manage availability.
                                </td>
                            </tr>
                        ) : (
                            variants.map((variant) => (
                                <tr key={variant.id} className="border-t border-navy-50">
                                    <td className="px-5 py-3 font-semibold text-navy-950">{variant.sku}</td>
                                    {branches.map((branch) => (
                                        <td key={branch.id} className="px-5 py-3">
                                            <label className="flex items-center gap-2 text-xs font-semibold text-navy-700">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`${variant.sku} available at ${branch.name}`}
                                                    checked={variantAvailability(variant, branch.id)}
                                                    disabled={isMutating}
                                                    onChange={() => void toggleAvailability(variant, branch.id)}
                                                />
                                                Available
                                            </label>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </DataTable>
                </section>
            )}
        </div>
    )
}
