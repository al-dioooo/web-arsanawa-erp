"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { StatusPill } from "@/components/ui/status-pill"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
import {
    loadInventory,
    loadStockSnapshot,
    recordAdjustment,
    recordIssue,
    recordReceipt,
    recordTransfer,
} from "@/features/inventory/inventory-api"
import type {
    ProductVariant,
    StockLot,
    StockMovement,
} from "@/features/inventory/inventory-types"
import { compactDateTime } from "@/lib/format"

function numberLabel(value: string | number | null | undefined): string {
    const numeric = Number(value ?? 0)
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 4,
    }).format(Number.isFinite(numeric) ? numeric : 0)
}

function moneyLabel(value: string | number | null | undefined): string {
    const numeric = Number(value ?? 0)
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number.isFinite(numeric) ? numeric : 0)
}

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

export function StockView() {
    const { token, activeCompanyId, organizationContext } = useSession()
    const [variants, setVariants] = useState<Array<ProductVariant & { product_name: string }>>([])
    const [lots, setLots] = useState<StockLot[]>([])
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [movementTotal, setMovementTotal] = useState(0)
    const [totalValue, setTotalValue] = useState("0.0000")
    const [selectedOnHand, setSelectedOnHand] = useState("0.0000")

    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [receiptForm, setReceiptForm] = useState({
        branch_id: "",
        product_variant_id: "",
        quantity: "",
        unit_cost: "",
        lot_number: "",
        received_at: today(),
        expiry_date: "",
    })
    const [issueForm, setIssueForm] = useState({
        quantity: "",
        notes: "",
    })
    const [adjustmentForm, setAdjustmentForm] = useState({
        quantity: "",
        unit_cost: "",
        notes: "",
    })
    const [transferForm, setTransferForm] = useState({
        to_branch_id: "",
        quantity: "",
        notes: "",
    })

    const requestOptions = useMemo(() => {
        if (!token || !activeCompanyId) {
            return null
        }
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const branches = useMemo(() => {
        return organizationContext?.branches ?? []
    }, [organizationContext?.branches])

    // Load products to extract variant names
    const loadProductVariants = useCallback(async () => {
        if (!requestOptions) return

        try {
            const loaded = await loadInventory(requestOptions)
            const list = loaded.products.flatMap((product) =>
                product.variants.map((variant) => ({
                    ...variant,
                    product_name: product.name,
                }))
            )
            setVariants(list)

            // Set default branch & variant if not set
            if (selectedBranchId === null && branches.length > 0) {
                setSelectedBranchId(branches[0].id)
            }
            if (selectedVariantId === null && list.length > 0) {
                setSelectedVariantId(list[0].id)
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load variants.")
        }
    }, [branches, requestOptions, selectedBranchId, selectedVariantId])

    const refreshStock = useCallback(async () => {
        if (!requestOptions) return

        setIsLoading(true)
        setError(null)

        try {
            const stock = await loadStockSnapshot(requestOptions, selectedBranchId, selectedVariantId)
            setLots(stock.lots)
            setMovements(stock.movements)
            setMovementTotal(stock.movementTotal)
            setTotalValue(stock.totalValue)
            setSelectedOnHand(stock.selectedOnHand)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load stock.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions, selectedBranchId, selectedVariantId])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) {
                void loadProductVariants()
            }
        })
        return () => {
            active = false
        }
    }, [loadProductVariants])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) {
                if (selectedBranchId !== null || selectedVariantId !== null) {
                    void refreshStock()
                }
            }
        })
        return () => {
            active = false
        }
    }, [refreshStock, selectedBranchId, selectedVariantId])

    // Sync receipt form with selectors
    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) {
                setReceiptForm((current) => ({
                    ...current,
                    branch_id: selectedBranchId ? String(selectedBranchId) : current.branch_id,
                    product_variant_id: selectedVariantId ? String(selectedVariantId) : current.product_variant_id,
                }))
            }
        })
        return () => {
            active = false
        }
    }, [selectedBranchId, selectedVariantId])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return

            setTransferForm((current) => {
                if (branches.length < 2) return current
                if (current.to_branch_id && Number(current.to_branch_id) !== selectedBranchId) return current

                const targetBranch = branches.find((branch) => branch.id !== selectedBranchId) ?? branches[0]
                return { ...current, to_branch_id: targetBranch ? String(targetBranch.id) : "" }
            })
        })
        return () => {
            active = false
        }
    }, [branches, selectedBranchId])

    async function handleReceiptSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!requestOptions) return

        setIsLoading(true)
        setError(null)
        setMessage(null)

        try {
            await recordReceipt(requestOptions, {
                branch_id: Number(receiptForm.branch_id),
                product_variant_id: Number(receiptForm.product_variant_id),
                quantity: Number(receiptForm.quantity),
                unit_cost: Number(receiptForm.unit_cost),
                lot_number: receiptForm.lot_number || undefined,
                received_at: receiptForm.received_at,
                expiry_date: receiptForm.expiry_date || undefined,
            })

            setMessage("Stock receipt recorded successfully.")
            setReceiptForm((current) => ({
                ...current,
                quantity: "",
                unit_cost: "",
                lot_number: "",
                expiry_date: "",
            }))
            await refreshStock()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Failed to record receipt.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleIssueSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!requestOptions || !selectedBranchId || !selectedVariantId) return

        setIsLoading(true)
        setError(null)
        setMessage(null)

        try {
            await recordIssue(requestOptions, {
                branch_id: selectedBranchId,
                product_variant_id: selectedVariantId,
                quantity: Number(issueForm.quantity),
                notes: issueForm.notes || null,
            })

            setMessage("Stock issue recorded successfully.")
            setIssueForm({ quantity: "", notes: "" })
            await refreshStock()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Failed to record issue.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAdjustmentSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!requestOptions || !selectedBranchId || !selectedVariantId) return

        setIsLoading(true)
        setError(null)
        setMessage(null)

        try {
            await recordAdjustment(requestOptions, {
                branch_id: selectedBranchId,
                product_variant_id: selectedVariantId,
                quantity: Number(adjustmentForm.quantity),
                unit_cost: adjustmentForm.unit_cost ? Number(adjustmentForm.unit_cost) : undefined,
                notes: adjustmentForm.notes || null,
            })

            setMessage("Stock adjustment recorded successfully.")
            setAdjustmentForm({ quantity: "", unit_cost: "", notes: "" })
            await refreshStock()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Failed to record adjustment.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleTransferSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!requestOptions || !selectedBranchId || !selectedVariantId || !transferForm.to_branch_id) return

        setIsLoading(true)
        setError(null)
        setMessage(null)

        try {
            await recordTransfer(requestOptions, {
                from_branch_id: selectedBranchId,
                to_branch_id: Number(transferForm.to_branch_id),
                items: [
                    {
                        product_variant_id: selectedVariantId,
                        quantity: Number(transferForm.quantity),
                    },
                ],
                notes: transferForm.notes || null,
            })

            setMessage("Stock transfer recorded successfully.")
            setTransferForm((current) => ({ ...current, quantity: "", notes: "" }))
            await refreshStock()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Failed to record transfer.")
        } finally {
            setIsLoading(false)
        }
    }

    const selectedVariantName = useMemo(() => {
        const v = variants.find((v) => v.id === selectedVariantId)
        return v ? `${v.product_name} (${v.sku})` : "None"
    }, [variants, selectedVariantId])

    const selectedBranchName = useMemo(() => {
        const b = branches.find((b) => b.id === selectedBranchId)
        return b ? b.name : "All Branches"
    }, [branches, selectedBranchId])

    return (
        <div className="grid gap-6">
            {/* Header section */}
            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                            Inventory
                        </p>
                        <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">
                            Stock & Movements
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500 font-body">
                            Track stock levels, lot expirations, and audit movement logs for your branches.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <StatusPill tone={activeCompanyId ? "green" : "amber"}>
                            {activeCompanyId ? "Company scoped" : "No company"}
                        </StatusPill>
                        <StatusPill tone={isLoading ? "amber" : "neutral"}>
                            {isLoading ? "Syncing" : "Ready"}
                        </StatusPill>
                    </div>
                </div>

                {message && (
                    <div className="mt-4 rounded-xl border border-emerald-250 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-850">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="mt-4 rounded-xl border border-rose-250 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-850">
                        {error}
                    </div>
                )}
            </section>

            {/* Metrics Section */}
            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">Active Context Valued</p>
                    <p className="text-2xl font-bold text-navy-900 font-brand mt-1">{moneyLabel(totalValue)}</p>
                    <p className="text-xs text-navy-400 font-medium">Total value in {selectedBranchName}</p>
                </div>
                <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">Selected On Hand</p>
                    <p className="text-2xl font-bold text-teal-700 font-brand mt-1">{numberLabel(selectedOnHand)}</p>
                    <p className="text-xs text-navy-450 font-semibold truncate">For variant: {selectedVariantName}</p>
                </div>
                <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">Active Batches</p>
                    <p className="text-2xl font-bold text-orange-500 font-brand mt-1">
                        {lots.filter((lot) => lot.status === "active").length}
                    </p>
                    <p className="text-xs text-navy-450 font-medium">Tracked lots in selected branch</p>
                </div>
            </section>

            {/* Primary Layout */}
            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                {/* Left Side: Filter and Receipt */}
                <div className="grid gap-6">
                    {/* Filters Card */}
                    <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4">
                        <h2 className="text-base font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-2">
                            <Icon name="warehouse" size={20} className="text-teal-700" />
                            <span>Stock Filter</span>
                        </h2>
                        <div className="grid gap-3">
                            <SearchableSelect
                                label="Branch Context"
                                value={selectedBranchId ?? ""}
                                onChange={(val) => setSelectedBranchId(val ? Number(val) : null)}
                                options={branches.map((branch) => ({
                                    value: branch.id,
                                    label: branch.name
                                }))}
                                placeholder="All Branches"
                            />

                            <SearchableSelect
                                label="Product Variant"
                                value={selectedVariantId ?? ""}
                                onChange={(val) => setSelectedVariantId(val ? Number(val) : null)}
                                options={variants.map((variant) => ({
                                    value: variant.id,
                                    label: `${variant.product_name} · ${variant.sku}`
                                }))}
                                placeholder="Select Variant"
                            />
                        </div>
                    </div>

                    {/* Record Receipt Form */}
                    <form
                        className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4"
                        onSubmit={handleReceiptSubmit}
                    >
                        <h2 className="text-base font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-2">
                            <Icon name="add" size={20} className="text-orange-500" />
                            <span>Record Receipt</span>
                        </h2>
                        <div className="grid gap-3">
                            <SearchableSelect
                                label="Receipt Branch"
                                value={receiptForm.branch_id}
                                onChange={(val) => {
                                    setReceiptForm((current) => ({ ...current, branch_id: String(val) }))
                                    setSelectedBranchId(val ? Number(val) : null)
                                }}
                                required
                                options={branches.map((branch) => ({
                                    value: branch.id,
                                    label: branch.name
                                }))}
                                placeholder="Select Branch"
                            />

                            <SearchableSelect
                                label="Receipt Variant"
                                value={receiptForm.product_variant_id}
                                onChange={(val) => {
                                    setReceiptForm((current) => ({ ...current, product_variant_id: String(val) }))
                                    setSelectedVariantId(val ? Number(val) : null)
                                }}
                                required
                                options={variants.map((variant) => ({
                                    value: variant.id,
                                    label: `${variant.product_name} · ${variant.sku}`
                                }))}
                                placeholder="Select Variant"
                            />

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field
                                    label="Quantity"
                                    type="number"
                                    min="0.0001"
                                    step="0.0001"
                                    value={receiptForm.quantity}
                                    onChange={(event) =>
                                        setReceiptForm((current) => ({ ...current, quantity: event.target.value }))
                                    }
                                    placeholder="10.0"
                                    required
                                />
                                <Field
                                    label="Unit Cost (IDR)"
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={receiptForm.unit_cost}
                                    onChange={(event) =>
                                        setReceiptForm((current) => ({ ...current, unit_cost: event.target.value }))
                                    }
                                    placeholder="50000"
                                    required
                                />
                            </div>

                            <Field
                                label="Lot Number"
                                value={receiptForm.lot_number}
                                onChange={(event) =>
                                    setReceiptForm((current) => ({ ...current, lot_number: event.target.value }))
                                }
                                placeholder="e.g. LOT-202605"
                            />

                            <div className="grid gap-3 sm:grid-cols-2">
                                <DatePicker
                                    label="Received At"
                                    value={receiptForm.received_at}
                                    onChange={(val) =>
                                        setReceiptForm((current) => ({ ...current, received_at: val }))
                                    }
                                    required
                                />
                                <DatePicker
                                    label="Expiry Date"
                                    value={receiptForm.expiry_date}
                                    onChange={(val) =>
                                        setReceiptForm((current) => ({ ...current, expiry_date: val }))
                                    }
                                />
                            </div>

                            <Button
                                type="submit"
                                size="xl"
                                disabled={isLoading || !branches.length || !variants.length}
                                className="w-full cursor-pointer bg-teal-700 hover:bg-teal-800 text-white mt-2"
                            >
                                Record Receipt
                            </Button>
                        </div>
                    </form>

                    <form
                        className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4"
                        onSubmit={handleIssueSubmit}
                    >
                        <h2 className="text-base font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-2">
                            <Icon name="remove_circle" size={20} className="text-rose-600" />
                            <span>Record Issue</span>
                        </h2>
                        <div className="grid gap-3">
                            <Field
                                label="Issue quantity"
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={issueForm.quantity}
                                onChange={(event) =>
                                    setIssueForm((current) => ({ ...current, quantity: event.target.value }))
                                }
                                required
                            />
                            <Field
                                label="Issue notes"
                                value={issueForm.notes}
                                onChange={(event) =>
                                    setIssueForm((current) => ({ ...current, notes: event.target.value }))
                                }
                                placeholder="Reason or reference"
                            />
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={isLoading || !selectedBranchId || !selectedVariantId}
                            >
                                Record issue
                            </Button>
                        </div>
                    </form>

                    <form
                        className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4"
                        onSubmit={handleAdjustmentSubmit}
                    >
                        <h2 className="text-base font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-2">
                            <Icon name="sync_alt" size={20} className="text-teal-700" />
                            <span>Record Adjustment</span>
                        </h2>
                        <div className="grid gap-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field
                                    label="Adjustment quantity"
                                    type="number"
                                    step="0.0001"
                                    value={adjustmentForm.quantity}
                                    onChange={(event) =>
                                        setAdjustmentForm((current) => ({
                                            ...current,
                                            quantity: event.target.value,
                                        }))
                                    }
                                    required
                                />
                                <Field
                                    label="Adjustment cost"
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={adjustmentForm.unit_cost}
                                    onChange={(event) =>
                                        setAdjustmentForm((current) => ({
                                            ...current,
                                            unit_cost: event.target.value,
                                        }))
                                    }
                                    placeholder="Optional"
                                />
                            </div>
                            <Field
                                label="Adjustment notes"
                                value={adjustmentForm.notes}
                                onChange={(event) =>
                                    setAdjustmentForm((current) => ({ ...current, notes: event.target.value }))
                                }
                                placeholder="Stock count or correction"
                            />
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={isLoading || !selectedBranchId || !selectedVariantId}
                            >
                                Record adjustment
                            </Button>
                        </div>
                    </form>

                    <form
                        className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4"
                        onSubmit={handleTransferSubmit}
                    >
                        <h2 className="text-base font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-2">
                            <Icon name="swap_horiz" size={20} className="text-orange-500" />
                            <span>Record Transfer</span>
                        </h2>
                        <div className="grid gap-3">
                            <SearchableSelect
                                label="Destination branch"
                                value={transferForm.to_branch_id}
                                onChange={(val) =>
                                    setTransferForm((current) => ({ ...current, to_branch_id: String(val) }))
                                }
                                required
                                options={branches
                                    .filter((branch) => branch.id !== selectedBranchId)
                                    .map((branch) => ({
                                        value: branch.id,
                                        label: branch.name,
                                    }))}
                                placeholder="Select destination"
                            />
                            <Field
                                label="Transfer quantity"
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={transferForm.quantity}
                                onChange={(event) =>
                                    setTransferForm((current) => ({ ...current, quantity: event.target.value }))
                                }
                                required
                            />
                            <Field
                                label="Transfer notes"
                                value={transferForm.notes}
                                onChange={(event) =>
                                    setTransferForm((current) => ({ ...current, notes: event.target.value }))
                                }
                                placeholder="Transfer memo"
                            />
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={
                                    isLoading ||
                                    !selectedBranchId ||
                                    !selectedVariantId ||
                                    !transferForm.to_branch_id
                                }
                            >
                                Record transfer
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Right Side: Lots & Movement Ledger */}
                <div className="grid gap-6">
                    {/* Lots Card */}
                    <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-2">
                            <Icon name="local_offer" className="text-teal-700" />
                            <span>Tracked Lots ({lots.length})</span>
                        </h2>
                        <div className="grid gap-3 max-h-72 overflow-y-auto pr-1">
                            {lots.map((lot) => (
                                <div
                                    key={lot.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-navy-100 bg-navy-50/20 px-4 py-3"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-navy-900">{lot.lot_number ?? `Lot #${lot.id}`}</p>
                                        <p className="text-xs text-navy-500 font-semibold mt-0.5">
                                            Var ID: {lot.product_variant_id} · Branch ID: {lot.branch_id}
                                        </p>
                                        {lot.expiry_date && (
                                            <p className="text-[10px] text-orange-600 font-bold mt-1">
                                                Expires: {lot.expiry_date}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-navy-900">{numberLabel(lot.remaining_quantity)} remaining</p>
                                            <p className="text-[10px] text-navy-450 font-medium">Cost: {moneyLabel(lot.unit_cost)}</p>
                                        </div>
                                        <StatusPill tone={lot.status === "active" ? "green" : "neutral"}>
                                            {lot.status}
                                        </StatusPill>
                                    </div>
                                </div>
                            ))}
                            {lots.length === 0 && (
                                <p className="text-xs text-navy-450 text-center py-6 font-medium">
                                    No lots registered for this context.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Movement Ledger Card */}
                    <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-2">
                            <Icon name="history" className="text-teal-700" />
                            <span>Movement Ledger (Last {movements.length} of {movementTotal})</span>
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
                                <thead>
                                    <tr className="text-xs font-bold uppercase tracking-wider text-navy-500 bg-navy-50/30">
                                        <th className="border-b border-navy-100 py-3 px-4 font-display">Type</th>
                                        <th className="border-b border-navy-100 py-3 px-4 font-display">Variant ID</th>
                                        <th className="border-b border-navy-100 py-3 px-4 font-display">Qty</th>
                                        <th className="border-b border-navy-100 py-3 px-4 font-display">Cost</th>
                                        <th className="border-b border-navy-100 py-3 px-4 font-display">Occurred At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map((movement) => (
                                        <tr key={movement.id} className="hover:bg-navy-50/20 transition-colors">
                                            <td className="border-b border-navy-100/50 py-3 px-4 font-bold text-navy-900">
                                                {movement.type.replaceAll("_", " ").toUpperCase()}
                                            </td>
                                            <td className="border-b border-navy-100/50 py-3 px-4 text-navy-700 font-medium">
                                                {movement.product_variant_id}
                                            </td>
                                            <td className="border-b border-navy-100/50 py-3 px-4 text-navy-700 font-medium">
                                                {numberLabel(movement.quantity)}
                                            </td>
                                            <td className="border-b border-navy-100/50 py-3 px-4 text-navy-700 font-medium">
                                                {moneyLabel(movement.unit_cost)}
                                            </td>
                                            <td className="border-b border-navy-100/50 py-3 px-4 text-navy-600 font-medium">
                                                {compactDateTime(movement.occurred_at)}
                                            </td>
                                        </tr>
                                    ))}
                                    {movements.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-navy-400 font-medium bg-navy-50/10">
                                                No movements logged.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
