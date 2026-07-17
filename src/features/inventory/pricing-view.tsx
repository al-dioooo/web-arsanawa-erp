"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { EnterTransition } from "@/components/ui/enter"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { StatusPill } from "@/components/ui/status-pill"
import { TableStateRow } from "@/components/ui/table-state-row"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
import { InventoryPageHeader } from "@/features/inventory/inventory-layout"
import {
    createPriceList,
    listPriceListPrices,
    loadInventory,
    setPrice,
} from "@/features/inventory/inventory-api"
import type {
    Price,
    PriceList,
    ProductVariant,
} from "@/features/inventory/inventory-types"
import { formatCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

function readableError(caught: unknown, fallback: string): string {
    return caught instanceof Error && caught.message ? caught.message : fallback
}

export function PricingView() {
    const t = useTranslations("inventory.pricing")
    const { token, activeCompanyId, organizationContext } = useSession()
    const [priceLists, setPriceLists] = useState<PriceList[]>([])
    const [variants, setVariants] = useState<Array<ProductVariant & { product_name: string }>>([])
    const [selectedPriceListId, setSelectedPriceListId] = useState<number | null>(null)

    const [isLoading, setIsLoading] = useState(false)
    const [prices, setPrices] = useState<Price[]>([])
    const [pricesLoading, setPricesLoading] = useState(false)
    const [pricesError, setPricesError] = useState<string | null>(null)

    // Forms
    const [priceListForm, setPriceListForm] = useState({
        name: "",
        branch_id: "",
        is_default: false,
    })

    const [priceForm, setPriceForm] = useState({
        product_variant_id: "",
        price: "",
        effective_from: today(),
    })

    const requestOptions = useMemo(() => {
        if (!token || !activeCompanyId) {
            return null
        }
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const branches = organizationContext?.branches ?? []

    const loadErrorFallback = t("loadError")

    const refreshData = useCallback(async () => {
        if (!requestOptions) return

        setIsLoading(true)

        try {
            const loaded = await loadInventory(requestOptions, { includePriceLists: true })
            setPriceLists(loaded.priceLists)

            const list = loaded.products.flatMap((product) =>
                product.variants.map((variant) => ({
                    ...variant,
                    product_name: product.name,
                }))
            )
            setVariants(list)

            // Set default selected price list if none is selected
            if (selectedPriceListId === null && loaded.priceLists.length > 0) {
                setSelectedPriceListId(loaded.priceLists[0].id)
            }
        } catch (caught) {
            toast.error(readableError(caught, loadErrorFallback))
        } finally {
            setIsLoading(false)
        }
    }, [loadErrorFallback, requestOptions, selectedPriceListId])

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

    // Prices load separately per selected list so switching lists doesn't
    // re-fetch the whole catalogue. Responses are keyed to the list they were
    // requested for, so a slow response can't overwrite a newer selection.
    const selectedPriceListRef = useRef(selectedPriceListId)

    useEffect(() => {
        selectedPriceListRef.current = selectedPriceListId
    }, [selectedPriceListId])

    const pricesErrorFallback = t("pricesError")

    const loadPrices = useCallback(async () => {
        if (!requestOptions || !selectedPriceListId) return

        const requestedListId = selectedPriceListId
        setPricesLoading(true)
        setPricesError(null)

        try {
            const response = await listPriceListPrices(requestOptions, requestedListId)
            if (selectedPriceListRef.current !== requestedListId) return
            setPrices(response.data.prices)
        } catch (caught) {
            if (selectedPriceListRef.current !== requestedListId) return
            setPricesError(readableError(caught, pricesErrorFallback))
        } finally {
            if (selectedPriceListRef.current === requestedListId) {
                setPricesLoading(false)
            }
        }
    }, [pricesErrorFallback, requestOptions, selectedPriceListId])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) {
                void loadPrices()
            }
        })
        return () => {
            active = false
        }
    }, [loadPrices])

    // Latest effective price per variant; rows arrive newest-first.
    const currentPriceByVariant = useMemo(() => {
        const reference = today()
        const map = new Map<number, Price>()
        for (const price of prices) {
            if (map.has(price.product_variant_id)) continue
            if (price.effective_from && price.effective_from > reference) continue
            if (price.effective_to && price.effective_to < reference) continue
            map.set(price.product_variant_id, price)
        }
        return map
    }, [prices])

    async function handleCreatePriceList(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!requestOptions) return

        setIsLoading(true)

        try {
            await createPriceList(requestOptions, {
                name: priceListForm.name,
                branch_id: priceListForm.branch_id ? Number(priceListForm.branch_id) : null,
                is_default: priceListForm.is_default,
            })
            toast.success(t("createList.success"))
            setPriceListForm({ name: "", branch_id: "", is_default: false })
            await refreshData()
        } catch (caught) {
            toast.error(readableError(caught, t("createList.failure")))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleSetPrice(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!requestOptions || !selectedPriceListId) return

        setIsLoading(true)

        try {
            await setPrice(requestOptions, selectedPriceListId, {
                product_variant_id: Number(priceForm.product_variant_id),
                price: Number(priceForm.price),
                effective_from: priceForm.effective_from,
            })
            toast.success(t("setPriceForm.success"))
            setPriceForm((current) => ({ ...current, price: "" }))
            await Promise.all([refreshData(), loadPrices()])
        } catch (caught) {
            toast.error(readableError(caught, t("setPriceForm.failure")))
        } finally {
            setIsLoading(false)
        }
    }

    const activePriceList = useMemo(() => {
        return priceLists.find((pl) => pl.id === selectedPriceListId) ?? null
    }, [priceLists, selectedPriceListId])

    const showPricesSkeleton = pricesLoading && prices.length === 0

    return (
        <div className="grid gap-6">
            <InventoryPageHeader
                title={t("title")}
                description={t("subtitle")}
                isCompanyScoped={Boolean(activeCompanyId)}
            />

            {/* Main Layout Grid */}
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                {/* Left Side: Price Lists Grid & Selected Price List details */}
                <div className="grid gap-6">
                    {/* Price Lists Overview Card */}
                    <Card padding="lg" className="flex flex-col gap-4">
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name="sell" className="text-brand-ink" />
                            <span>{t("lists.heading", { count: priceLists.length })}</span>
                        </h2>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {priceLists.map((priceList) => {
                                const isSelected = priceList.id === selectedPriceListId
                                return (
                                    <Card
                                        as="article"
                                        inset
                                        padding="sm"
                                        key={priceList.id}
                                        onClick={() => setSelectedPriceListId(priceList.id)}
                                        className={cn(
                                            "cursor-pointer transition-all duration-150",
                                            isSelected
                                                ? "bg-brand-soft ring-2 ring-brand"
                                                : "hover:bg-brand-soft/40",
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="truncate text-sm font-bold text-ink">
                                                {priceList.name}
                                            </h3>
                                            <StatusPill tone={priceList.is_active ? "green" : "neutral"}>
                                                {priceList.is_active ? t("statuses.active") : t("statuses.inactive")}
                                            </StatusPill>
                                        </div>

                                        <p className="mt-3 text-xs font-semibold text-ink-muted">
                                            {priceList.branch_id
                                                ? t("lists.branchScope", { id: priceList.branch_id })
                                                : t("lists.companyWide")}
                                        </p>

                                        {priceList.is_default && (
                                            <p className="mt-2.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-ink">
                                                <Icon name="check_circle" size={12} />
                                                <span>{t("lists.default")}</span>
                                            </p>
                                        )}
                                    </Card>
                                )
                            })}
                            {priceLists.length === 0 && (
                                <EmptyState
                                    compact
                                    icon="sell"
                                    className="col-span-full"
                                    title={t("lists.empty")}
                                    description={t("lists.emptyHint")}
                                />
                            )}
                        </div>
                    </Card>

                    {/* Selected Price List details & Variant prices */}
                    {activePriceList && (
                        <DataTable
                            minWidth={560}
                            columns={[
                                t("table.productSku"),
                                t("table.variantSku"),
                                t("table.currentPrice"),
                                t("table.effectiveFrom"),
                                t("table.actions"),
                            ]}
                            toolbar={
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="type-section flex items-center gap-2">
                                            <Icon name="list_alt" className="text-brand-ink" />
                                            <span>{t("manage.heading", { name: activePriceList.name })}</span>
                                        </h2>
                                        <p className="mt-1 text-xs text-ink-muted">
                                            {t("manage.hint")}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {activePriceList.is_default && <StatusPill tone="green">{t("statuses.default")}</StatusPill>}
                                        <StatusPill tone={activePriceList.is_active ? "green" : "neutral"}>
                                            {activePriceList.is_active ? t("statuses.active") : t("statuses.inactive")}
                                        </StatusPill>
                                    </div>
                                </div>
                            }
                        >
                            <TableStateRow
                                isLoading={showPricesSkeleton}
                                isError={Boolean(pricesError)}
                                error={pricesError ? new Error(pricesError) : undefined}
                                count={variants.length}
                                columns={5}
                                emptyMessage={t("table.empty")}
                                onRetry={() => void loadPrices()}
                            />
                            {!pricesError && !showPricesSkeleton && variants.map((variant) => {
                                const currentPrice = currentPriceByVariant.get(variant.id)
                                return (
                                    <tr key={variant.id}>
                                        <td>
                                            <p className="font-semibold text-ink">{variant.product_name}</p>
                                            {variant.name && (
                                                <p className="text-xs text-ink-muted">{variant.name}</p>
                                            )}
                                        </td>
                                        <td>
                                            <code className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-ink">
                                                {variant.sku}
                                            </code>
                                        </td>
                                        <td>
                                            {currentPrice ? (
                                                <span className="font-semibold text-ink tabular-nums">{formatCurrency(currentPrice.price)}</span>
                                            ) : (
                                                <span className="text-xs font-semibold text-ink-faint">{t("table.notPriced")}</span>
                                            )}
                                        </td>
                                        <td className="text-xs font-semibold text-ink-muted">
                                            {currentPrice?.effective_from ?? "—"}
                                        </td>
                                        <td>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setPriceForm((current) => ({
                                                        ...current,
                                                        product_variant_id: String(variant.id),
                                                    }))
                                                    // Auto scroll to price form on mobile
                                                    const priceFormEl = document.getElementById("set-price-form")
                                                    if (priceFormEl) {
                                                        priceFormEl.scrollIntoView({ behavior: "smooth" })
                                                    }
                                                }}
                                            >
                                                {t("table.setPrice")}
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </DataTable>
                    )}
                </div>

                {/* Right Side: Side Forms */}
                <div className="grid gap-6 self-start">
                    {/* Create Price List Form */}
                    <Card as="form" padding="lg" className="flex flex-col gap-4" onSubmit={handleCreatePriceList}>
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name="add" size={20} className="text-brand-ink" />
                            <span>{t("createList.heading")}</span>
                        </h2>

                        <div className="grid gap-3">
                            <Field
                                label={t("createList.name")}
                                value={priceListForm.name}
                                onChange={(event) =>
                                    setPriceListForm((current) => ({ ...current, name: event.target.value }))
                                }
                                placeholder={t("createList.namePlaceholder")}
                                required
                            />

                            <SearchableSelect
                                label={t("createList.branch")}
                                value={priceListForm.branch_id}
                                onChange={(val) =>
                                    setPriceListForm((current) => ({ ...current, branch_id: String(val) }))
                                }
                                options={branches.map((branch) => ({
                                    value: branch.id,
                                    label: branch.name
                                }))}
                                placeholder={t("createList.branchPlaceholder")}
                            />

                            <label className="flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink-secondary">
                                <input
                                    type="checkbox"
                                    checked={priceListForm.is_default}
                                    onChange={(event) =>
                                        setPriceListForm((current) => ({ ...current, is_default: event.target.checked }))
                                    }
                                    className="rounded-sm border-line text-brand focus:ring-ring/50"
                                />
                                <span>{t("createList.isDefault")}</span>
                            </label>

                            <Button type="submit" size="xl" disabled={isLoading} className="mt-2 w-full">
                                {t("createList.submit")}
                            </Button>
                        </div>
                    </Card>

                    {/* Set Price Form */}
                    {activePriceList && priceForm.product_variant_id && (
                        <EnterTransition
                            as="form"
                            id="set-price-form"
                            from="bottom"
                            className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card"
                            onSubmit={handleSetPrice}
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="type-section flex items-center gap-2">
                                    <Icon name="payments" size={20} className="text-orange-700" />
                                    <span>{t("setPriceForm.heading")}</span>
                                </h2>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={t("setPriceForm.close")}
                                    onClick={() => setPriceForm((current) => ({ ...current, product_variant_id: "" }))}
                                >
                                    <Icon name="close" size={16} />
                                </Button>
                            </div>

                            <div className="grid gap-3">
                                <SearchableSelect
                                    label={t("setPriceForm.variant")}
                                    value={priceForm.product_variant_id}
                                    onChange={(val) =>
                                        setPriceForm((current) => ({ ...current, product_variant_id: String(val) }))
                                    }
                                    required
                                    options={variants.map((v) => ({
                                        value: v.id,
                                        label: `${v.product_name} (${v.sku})`
                                    }))}
                                    placeholder={t("setPriceForm.variantPlaceholder")}
                                />

                                <Field
                                    label={t("setPriceForm.price")}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={priceForm.price}
                                    onChange={(event) =>
                                        setPriceForm((current) => ({ ...current, price: event.target.value }))
                                    }
                                    placeholder={t("setPriceForm.pricePlaceholder")}
                                    required
                                />

                                <DatePicker
                                    label={t("setPriceForm.effectiveFrom")}
                                    value={priceForm.effective_from}
                                    onChange={(val) =>
                                        setPriceForm((current) => ({ ...current, effective_from: val }))
                                    }
                                    required
                                />

                                <div className="rounded-md bg-surface-muted p-2.5 text-xs font-medium leading-relaxed text-ink-muted">
                                    {t("setPriceForm.note", { name: activePriceList.name })}
                                </div>

                                <Button type="submit" size="xl" disabled={isLoading} className="mt-2 w-full">
                                    {t("setPriceForm.submit")}
                                </Button>
                            </div>
                        </EnterTransition>
                    )}
                </div>
            </div>
        </div>
    )
}
