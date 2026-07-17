"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { TableStateRow } from "@/components/ui/table-state-row"
import {
    addVariant,
    deleteVariant,
    getProduct,
    setVariantAvailability,
    syncProductTags,
    updateVariant,
} from "@/features/inventory/inventory-api"
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
    const t = useTranslations("inventory.master.variantManager")
    const statusT = useTranslations("inventory.master.status")
    const commonT = useTranslations("common")
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
            toast.error(caught instanceof Error ? caught.message : t("toast.loadError"))
        } finally {
            setIsLoading(false)
        }
    }, [productId, requestOptions, t])

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
            toast.error(caught instanceof Error ? caught.message : t("toast.error"))
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
            t("toast.added"),
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
            t("toast.updated"),
        )
        setEditingVariantId(null)
    }

    async function toggleVariantActive(variant: ProductVariant) {
        await runMutation(
            () => updateVariant(requestOptions, productId, variant.id, { is_active: !variant.is_active }),
            variant.is_active ? t("toast.deactivated") : t("toast.activated"),
        )
    }

    async function removeVariant(variant: ProductVariant) {
        const ok = await confirm({
            title: t("deleteTitle", { sku: variant.sku }),
            message: t("deleteMessage"),
            confirmLabel: commonT("delete"),
            cancelLabel: commonT("cancel"),
            danger: true,
        })
        if (!ok) return
        await runMutation(() => deleteVariant(requestOptions, productId, variant.id), t("toast.deleted"))
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
        await runMutation(() => syncProductTags(requestOptions, productId, tags), t("toast.tagsSaved"))
    }

    function variantAvailability(variant: ProductVariant, branchId: number): boolean {
        const row = variant.branch_availability?.find((entry) => entry.branch_id === branchId)
        return row ? row.is_available : true
    }

    async function toggleAvailability(variant: ProductVariant, branchId: number) {
        const existing = variant.branch_availability?.find((entry) => entry.branch_id === branchId)
        const next = !variantAvailability(variant, branchId)
        await runMutation(
            () =>
                setVariantAvailability(requestOptions, productId, variant.id, {
                    branch_id: branchId,
                    is_available: next,
                    // The API upserts the whole row, so preserve the stored
                    // exclusivity flag instead of silently resetting it.
                    is_exclusive: existing?.is_exclusive ?? false,
                }),
            next ? t("toast.available") : t("toast.hidden"),
        )
    }

    const variants = product?.variants ?? []

    return (
        <div className="grid gap-6">
            {confirmDialog}

            <Card as="section" className="grid gap-4">
                <div>
                    <h3 className="text-sm font-bold text-ink">{t("title")}</h3>
                    <p className="text-xs text-ink-muted">{t("subtitle")}</p>
                </div>

                <DataTable
                    columns={[
                        t("columns.sku"),
                        t("columns.name"),
                        t("columns.barcode"),
                        t("columns.status"),
                        t("columns.actions"),
                    ]}
                >
                    <TableStateRow
                        isLoading={isLoading && variants.length === 0}
                        count={variants.length}
                        columns={5}
                        skeletonRows={3}
                        emptyMessage={t("empty")}
                    />
                    {variants.map((variant) =>
                        editingVariantId === variant.id ? (
                            <tr key={variant.id}>
                                <td>
                                    <Field
                                        label={t("editSku")}
                                        hideLabel
                                        value={editForm.sku}
                                        onChange={(event) => setEditForm((current) => ({ ...current, sku: event.target.value }))}
                                        required
                                    />
                                </td>
                                <td>
                                    <Field
                                        label={t("editName")}
                                        hideLabel
                                        value={editForm.name}
                                        onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                                    />
                                </td>
                                <td>
                                    <Field
                                        label={t("editBarcode")}
                                        hideLabel
                                        value={editForm.barcode}
                                        onChange={(event) => setEditForm((current) => ({ ...current, barcode: event.target.value }))}
                                    />
                                </td>
                                <td>
                                    <StatusPill tone={variant.is_active ? "green" : "neutral"}>
                                        {variant.is_active ? statusT("active") : statusT("inactive")}
                                    </StatusPill>
                                </td>
                                <td>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={isMutating || !editForm.sku.trim()}
                                            onClick={() => void saveEditVariant(variant.id)}
                                        >
                                            {commonT("save")}
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingVariantId(null)}>
                                            {commonT("cancel")}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            <tr key={variant.id}>
                                <td className="font-semibold text-ink">{variant.sku}</td>
                                <td className="text-ink-secondary">{variant.name || "—"}</td>
                                <td className="text-ink-muted">{variant.barcode || "—"}</td>
                                <td>
                                    <StatusPill tone={variant.is_active ? "green" : "neutral"}>
                                        {variant.is_active ? statusT("active") : statusT("inactive")}
                                    </StatusPill>
                                </td>
                                <td>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            aria-label={t("editAria", { sku: variant.sku })}
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
                                            {variant.is_active ? t("deactivate") : t("activate")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            aria-label={t("deleteAria", { sku: variant.sku })}
                                            disabled={isMutating}
                                            onClick={() => void removeVariant(variant)}
                                        >
                                            <Icon name="delete" size={16} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ),
                    )}
                </DataTable>

                <form onSubmit={submitAddVariant} className="grid items-end gap-3 border-t border-line pt-4 sm:grid-cols-4">
                    <Field
                        label={t("newSku")}
                        value={addForm.sku}
                        onChange={(event) => setAddForm((current) => ({ ...current, sku: event.target.value }))}
                        required
                    />
                    <Field
                        label={t("newName")}
                        value={addForm.name}
                        onChange={(event) => setAddForm((current) => ({ ...current, name: event.target.value }))}
                    />
                    <Field
                        label={t("newBarcode")}
                        value={addForm.barcode}
                        onChange={(event) => setAddForm((current) => ({ ...current, barcode: event.target.value }))}
                    />
                    <Button type="submit" disabled={isMutating}>
                        {t("add")}
                    </Button>
                </form>
            </Card>

            <Card as="section" className="grid gap-4">
                <div>
                    <h3 className="text-sm font-bold text-ink">{t("tags.title")}</h3>
                    <p className="text-xs text-ink-muted">{t("tags.subtitle")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-pill bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink"
                        >
                            {tag}
                            <button
                                type="button"
                                aria-label={t("tags.removeAria", { tag })}
                                className="text-brand-ink/70 transition-colors hover:text-brand-ink"
                                onClick={() => setTags((current) => current.filter((entry) => entry !== tag))}
                            >
                                <Icon name="close" size={12} />
                            </button>
                        </span>
                    ))}
                    {tags.length === 0 && <span className="text-xs text-ink-muted">{t("tags.empty")}</span>}
                </div>
                <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <Field
                        label={t("tags.addLabel")}
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
                        {t("tags.addButton")}
                    </Button>
                    <Button type="button" disabled={isMutating} onClick={() => void saveTags()}>
                        {t("tags.save")}
                    </Button>
                </div>
            </Card>

            {branches.length > 0 && (
                <Card as="section" className="grid gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-ink">{t("availability.title")}</h3>
                        <p className="text-xs text-ink-muted">{t("availability.subtitle")}</p>
                    </div>
                    <DataTable columns={[t("availability.variantColumn"), ...branches.map((branch) => branch.name)]}>
                        <TableStateRow
                            isLoading={false}
                            count={variants.length}
                            columns={branches.length + 1}
                            emptyMessage={t("availability.empty")}
                        />
                        {variants.map((variant) => (
                            <tr key={variant.id}>
                                <td className="font-semibold text-ink">{variant.sku}</td>
                                {branches.map((branch) => (
                                    <td key={branch.id}>
                                        <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                                            <input
                                                type="checkbox"
                                                aria-label={t("availability.availableAria", { sku: variant.sku, branch: branch.name })}
                                                checked={variantAvailability(variant, branch.id)}
                                                disabled={isMutating}
                                                onChange={() => void toggleAvailability(variant, branch.id)}
                                            />
                                            {t("availability.available")}
                                        </label>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </DataTable>
                </Card>
            )}
        </div>
    )
}
