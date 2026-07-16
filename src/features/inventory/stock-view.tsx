"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { InputDate } from "@/components/ui/input-date"
import { MotionLinkItem } from "@/components/ui/motion-link"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import { InventoryPageHeader, inventorySurfaceClass } from "@/features/inventory/inventory-layout"
import {
    getStockMovement,
    listProductUnits,
    loadStockLots,
    loadStockMovements,
    loadStockSnapshot,
    recordAdjustment,
    recordIssue,
    recordReceipt,
    recordTransfer,
} from "@/features/inventory/inventory-api"
import type { ProductUnit, StockLot, StockMovement } from "@/features/inventory/inventory-types"
import { compactDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

type RequestOptions = { token: string; companyId: number }
type Branch = { id: number; name: string }
const STOCK_OVERVIEW_PATH = "/inventory/stock"
const MISSING_CONTEXT_MESSAGE = "Select an active company, branch, and Product Unit before recording stock."

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

const quantityFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 })
const idrFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
})

function numberLabel(value: string | number | null | undefined): string {
    const numeric = Number(value ?? 0)
    return quantityFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

function moneyLabel(value: string | number | null | undefined): string {
    const numeric = Number(value ?? 0)
    return idrFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

function productUnitLabel(unit?: ProductUnit | null): string {
    if (!unit) return "No Product Unit"
    return unit.product?.name ? `${unit.sku} · ${unit.product.name}` : unit.sku
}

function readableError(caught: unknown, fallback: string): string {
    return caught instanceof Error && caught.message ? caught.message : fallback
}

function useStockActionSubmit() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const submitStockAction = useCallback(async ({
        action,
        successMessage,
        failureMessage,
        contextError,
    }: {
        action: () => Promise<unknown>
        successMessage: string
        failureMessage: string
        contextError?: string | null
    }) => {
        if (isSubmitting) return

        if (contextError) {
            toast.error(contextError)
            return
        }

        setIsSubmitting(true)
        try {
            await action()
            toast.success(successMessage)
            router.push(STOCK_OVERVIEW_PATH)
        } catch (caught) {
            toast.error(readableError(caught, failureMessage))
        } finally {
            setIsSubmitting(false)
        }
    }, [isSubmitting, router])

    return { isSubmitting, submitStockAction }
}

function useStockOptions() {
    const { token, activeCompanyId, organizationContext } = useSession()
    const [productUnits, setProductUnits] = useState<ProductUnit[]>([])
    const [error, setError] = useState<string | null>(null)

    const requestOptions = useMemo<RequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const branches = useMemo<Branch[]>(() => organizationContext?.branches ?? [], [organizationContext?.branches])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(async () => {
            if (!active || !requestOptions) return
            try {
                const response = await listProductUnits(requestOptions, { per_page: 100 })
                if (active) setProductUnits(response.data.product_units)
            } catch (caught) {
                if (active) {
                    const message = caught instanceof Error ? caught.message : "Unable to load product units."
                    setError(message)
                    toast.error(message)
                }
            }
        })

        return () => {
            active = false
        }
    }, [requestOptions])

    return {
        requestOptions,
        branches,
        productUnits,
        defaultBranchId: branches[0]?.id ?? null,
        defaultProductUnitId: productUnits[0]?.id ?? null,
        error,
    }
}

function PageHeader({
    title,
    description,
    isCompanyScoped,
    status,
}: {
    title: string
    description: string
    isCompanyScoped?: boolean
    status?: string
}) {
    return (
        <InventoryPageHeader
            eyebrow="Inventory · Stock Movement"
            title={title}
            description={description}
            isCompanyScoped={isCompanyScoped}
            status={status ? <StatusPill tone="neutral">{status}</StatusPill> : undefined}
        />
    )
}

function ActionLink({ href, icon, label, description }: { href: string; icon: string; label: string; description: string }) {
    return (
        <MotionLinkItem href={href} icon={icon} label={label} className="rounded-2xl">
            {description}
        </MotionLinkItem>
    )
}

function StockSelectors({
    branches,
    productUnits,
    branchId,
    productUnitId,
    onBranchChange,
    onProductUnitChange,
}: {
    branches: Branch[]
    productUnits: ProductUnit[]
    branchId: number | null
    productUnitId: number | null
    onBranchChange: (value: number) => void
    onProductUnitChange: (value: number) => void
}) {
    return (
        <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Branch" value={branchId ?? ""} onChange={(event) => onBranchChange(Number(event.target.value))}>
                {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
            </SelectField>
            <SelectField label="Product Unit" value={productUnitId ?? ""} onChange={(event) => onProductUnitChange(Number(event.target.value))}>
                {productUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>{productUnitLabel(unit)}</option>
                ))}
            </SelectField>
        </div>
    )
}

export function StockOverviewView() {
    const { requestOptions, branches, productUnits, defaultBranchId, defaultProductUnitId } = useStockOptions()
    const [branchId, setBranchId] = useState<number | null>(null)
    const [productUnitId, setProductUnitId] = useState<number | null>(null)
    const [snapshot, setSnapshot] = useState({ totalValue: "0.0000", selectedOnHand: "0.0000", lots: [] as StockLot[], movements: [] as StockMovement[], movementTotal: 0 })

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return
            if (branchId === null && defaultBranchId !== null) setBranchId(defaultBranchId)
            if (productUnitId === null && defaultProductUnitId !== null) setProductUnitId(defaultProductUnitId)
        })
        return () => {
            active = false
        }
    }, [branchId, defaultBranchId, defaultProductUnitId, productUnitId])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(async () => {
            if (!active || !requestOptions) return
            try {
                const loaded = await loadStockSnapshot(requestOptions, branchId, productUnitId)
                if (active) setSnapshot(loaded)
            } catch (caught) {
                if (active) {
                    const message = caught instanceof Error ? caught.message : "Unable to load stock overview."
                    toast.error(message)
                }
            }
        })
        return () => {
            active = false
        }
    }, [branchId, productUnitId, requestOptions])

    return (
        <div className="grid gap-6">
            <PageHeader title="Stock Overview" description="Review valuation, on-hand levels, active lots, and recent immutable stock movements." isCompanyScoped={Boolean(requestOptions)} />
            <section className={cn(inventorySurfaceClass, "p-5")}>
                <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            </section>
            <section className="grid gap-4 md:grid-cols-3">
                <div className={cn(inventorySurfaceClass, "p-5")}>
                    <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Active Context Value</p>
                    <p className="mt-2 font-brand text-2xl font-bold text-navy-950">{moneyLabel(snapshot.totalValue)}</p>
                </div>
                <div className={cn(inventorySurfaceClass, "p-5")}>
                    <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Selected On Hand</p>
                    <p className="mt-2 font-brand text-2xl font-bold text-teal-700">{numberLabel(snapshot.selectedOnHand)}</p>
                </div>
                <div className={cn(inventorySurfaceClass, "p-5")}>
                    <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Active Lots</p>
                    <p className="mt-2 font-brand text-2xl font-bold text-orange-500">{snapshot.lots.filter((lot) => lot.status === "active").length}</p>
                </div>
            </section>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ActionLink href="/inventory/stock/lots" icon="local_offer" label="Stock Lots" description="Inspect batch balances, expiry dates, and costs." />
                <ActionLink href="/inventory/stock/movements" icon="history" label="Movement Ledger" description="Audit immutable stock movement records." />
                <ActionLink href="/inventory/stock/receipts/new" icon="add" label="New Receipt" description="Receive stock into a branch by Product Unit." />
                <ActionLink href="/inventory/stock/issues/new" icon="remove_circle" label="New Issue" description="Issue stock out of a branch by Product Unit." />
                <ActionLink href="/inventory/stock/adjustments/new" icon="sync_alt" label="New Adjustment" description="Correct counts with signed stock adjustments." />
                <ActionLink href="/inventory/stock/transfers/new" icon="swap_horiz" label="New Transfer" description="Move Product Unit stock between branches." />
            </section>
        </div>
    )
}

export function StockLotsView() {
    const { requestOptions, branches, productUnits, defaultBranchId, defaultProductUnitId } = useStockOptions()
    const [branchId, setBranchId] = useState<number | null>(null)
    const [productUnitId, setProductUnitId] = useState<number | null>(null)
    const [lots, setLots] = useState<StockLot[]>([])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return
            if (branchId === null && defaultBranchId !== null) setBranchId(defaultBranchId)
            if (productUnitId === null && defaultProductUnitId !== null) setProductUnitId(defaultProductUnitId)
        })
        return () => {
            active = false
        }
    }, [branchId, defaultBranchId, defaultProductUnitId, productUnitId])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(async () => {
            if (!active || !requestOptions) return
            const loaded = await loadStockLots(requestOptions, { branch_id: branchId, product_unit_id: productUnitId })
            if (active) setLots(loaded)
        })
        return () => {
            active = false
        }
    }, [branchId, productUnitId, requestOptions])

    return (
        <div className="grid gap-6">
            <PageHeader title="Stock Lots" description="Track open batches, remaining quantities, and Product Unit cost context." isCompanyScoped={Boolean(requestOptions)} />
            <section className={cn(inventorySurfaceClass, "p-5")}>
                <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            </section>
            <section className="grid gap-3">
                {lots.map((lot) => (
                    <article key={lot.id} className={cn(inventorySurfaceClass, "p-4")}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="font-bold text-navy-950">{lot.lot_number ?? `Lot #${lot.id}`}</p>
                                <p className="mt-1 text-sm font-semibold text-teal-700">{lot.product_unit?.sku ?? lot.product_unit_id}</p>
                            </div>
                            <div className="text-sm text-navy-600 sm:text-right">
                                <p>{numberLabel(lot.remaining_quantity)} remaining</p>
                                <p>{moneyLabel(lot.unit_cost)}</p>
                            </div>
                        </div>
                    </article>
                ))}
                {lots.length === 0 && <p className={cn(inventorySurfaceClass, "p-6 text-center text-sm font-semibold text-navy-400")}>No lots registered for this context.</p>}
            </section>
        </div>
    )
}

export function StockMovementsView() {
    const { requestOptions, branches, productUnits, defaultBranchId, defaultProductUnitId } = useStockOptions()
    const [branchId, setBranchId] = useState<number | null>(null)
    const [productUnitId, setProductUnitId] = useState<number | null>(null)
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [total, setTotal] = useState(0)

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return
            if (branchId === null && defaultBranchId !== null) setBranchId(defaultBranchId)
            if (productUnitId === null && defaultProductUnitId !== null) setProductUnitId(defaultProductUnitId)
        })
        return () => {
            active = false
        }
    }, [branchId, defaultBranchId, defaultProductUnitId, productUnitId])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(async () => {
            if (!active || !requestOptions) return
            const loaded = await loadStockMovements(requestOptions, { branch_id: branchId, product_unit_id: productUnitId, per_page: 50 })
            if (active) {
                setMovements(loaded.movements)
                setTotal(loaded.total)
            }
        })
        return () => {
            active = false
        }
    }, [branchId, productUnitId, requestOptions])

    return (
        <div className="grid gap-6">
            <PageHeader title="Movement Ledger" description="Read-only stock movement audit trail for receipts, issues, adjustments, and transfers." isCompanyScoped={Boolean(requestOptions)} status={`${movements.length} of ${total}`} />
            <section className={cn(inventorySurfaceClass, "p-5")}>
                <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            </section>
            <div className={cn("overflow-x-auto", inventorySurfaceClass)}>
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-navy-50/40 text-xs font-bold uppercase tracking-wider text-navy-500">
                        <tr>
                            <th className="px-4 py-3">Movement</th>
                            <th className="px-4 py-3">Product Unit</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Qty</th>
                            <th className="px-4 py-3">Occurred At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movements.map((movement) => (
                            <tr key={movement.id} className="border-t border-navy-100">
                                <td className="px-4 py-3 font-bold text-teal-700">
                                    <Link href={`/inventory/stock/movements/${movement.id}`}>Movement #{movement.id}</Link>
                                </td>
                                <td className="px-4 py-3 font-semibold text-navy-900">{movement.product_unit?.sku ?? movement.product_unit_id}</td>
                                <td className="px-4 py-3 text-navy-700">{movement.type.replaceAll("_", " ").toUpperCase()}</td>
                                <td className="px-4 py-3 text-navy-700">{numberLabel(movement.quantity)}</td>
                                <td className="px-4 py-3 text-navy-600">{compactDateTime(movement.occurred_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export function StockMovementDetailView({ movementId }: { movementId: number }) {
    const { requestOptions } = useStockOptions()
    const [movement, setMovement] = useState<StockMovement | null>(null)

    useEffect(() => {
        let active = true
        void Promise.resolve().then(async () => {
            if (!active || !requestOptions) return
            const response = await getStockMovement(requestOptions, movementId)
            if (active) setMovement(response.data.movement)
        })
        return () => {
            active = false
        }
    }, [movementId, requestOptions])

    return (
        <div className="grid gap-6">
            <PageHeader title={`Movement #${movementId}`} description="Immutable movement audit details. Stock movements cannot be edited or deleted from the UI." isCompanyScoped={Boolean(requestOptions)} />
            {movement ? (
                <section className={cn("grid gap-4 p-5 md:grid-cols-2", inventorySurfaceClass)}>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Product Unit</p>
                        <p className="mt-1 font-bold text-navy-950">{movement.product_unit?.sku ?? movement.product_unit_id}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Type</p>
                        <p className="mt-1 font-bold text-navy-950">{movement.type.replaceAll("_", " ").toUpperCase()}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Quantity</p>
                        <p className="mt-1 font-bold text-navy-950">{numberLabel(movement.quantity)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Unit Cost</p>
                        <p className="mt-1 font-bold text-navy-950">{moneyLabel(movement.unit_cost)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Occurred At</p>
                        <p className="mt-1 font-bold text-navy-950">{compactDateTime(movement.occurred_at)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Notes</p>
                        <p className="mt-1 font-bold text-navy-950">{movement.notes ?? "No notes"}</p>
                    </div>
                </section>
            ) : (
                <p className={cn(inventorySurfaceClass, "p-6 text-sm font-semibold text-navy-400")}>Loading movement detail...</p>
            )}
        </div>
    )
}

function StockFormShell({
    title,
    description,
    isCompanyScoped,
    onSubmit,
    children,
}: {
    title: string
    description: string
    isCompanyScoped: boolean
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    children: React.ReactNode
}) {
    return (
        <div className="grid gap-6">
            <PageHeader title={title} description={description} isCompanyScoped={isCompanyScoped} />
            <form className={cn("grid gap-4 p-5", inventorySurfaceClass)} onSubmit={onSubmit}>{children}</form>
        </div>
    )
}

function useFormDefaults() {
    const options = useStockOptions()
    const [branchId, setBranchId] = useState<number | null>(null)
    const [productUnitId, setProductUnitId] = useState<number | null>(null)

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return
            if (branchId === null && options.defaultBranchId !== null) setBranchId(options.defaultBranchId)
            if (productUnitId === null && options.defaultProductUnitId !== null) setProductUnitId(options.defaultProductUnitId)
        })
        return () => {
            active = false
        }
    }, [branchId, options.defaultBranchId, options.defaultProductUnitId, productUnitId])

    return {
        ...options,
        branchId: branchId ?? options.defaultBranchId,
        productUnitId: productUnitId ?? options.defaultProductUnitId,
        setBranchId,
        setProductUnitId,
    }
}

export function StockReceiptView() {
    const { requestOptions, branches, productUnits, branchId, productUnitId, setBranchId, setProductUnitId } = useFormDefaults()
    const { isSubmitting, submitStockAction } = useStockActionSubmit()
    const [quantity, setQuantity] = useState("")
    const [unitCost, setUnitCost] = useState("")
    const [lotNumber, setLotNumber] = useState("")
    const [receivedAt, setReceivedAt] = useState(today())

    const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await submitStockAction({
            contextError: !requestOptions || !branchId || !productUnitId ? MISSING_CONTEXT_MESSAGE : null,
            successMessage: "Stock receipt recorded successfully.",
            failureMessage: "Failed to record stock receipt.",
            action: () => recordReceipt(requestOptions as RequestOptions, {
                branch_id: branchId as number,
                product_unit_id: productUnitId as number,
                quantity: Number(quantity),
                unit_cost: Number(unitCost),
                lot_number: lotNumber || undefined,
                received_at: receivedAt,
            }),
        })
    }, [branchId, lotNumber, productUnitId, quantity, receivedAt, requestOptions, submitStockAction, unitCost])

    return (
        <div className="grid gap-6">
            <PageHeader title="New Receipt" description="Receive stock into a branch using a Product Unit sellable SKU." isCompanyScoped={Boolean(requestOptions)} />
            <form className={cn("grid gap-4 p-5", inventorySurfaceClass)} onSubmit={submit}>
                <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Quantity" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
                    <Field label="Unit Cost (IDR)" type="number" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} required />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Lot Number" value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} />
                    <InputDate label="Received At" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} required />
                </div>
                <Button type="submit" size="xl" disabled={isSubmitting}>Record Receipt</Button>
            </form>
        </div>
    )
}

export function StockIssueView() {
    const { requestOptions, branches, productUnits, branchId, productUnitId, setBranchId, setProductUnitId } = useFormDefaults()
    const { isSubmitting, submitStockAction } = useStockActionSubmit()
    const [quantity, setQuantity] = useState("")
    const [notes, setNotes] = useState("")

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await submitStockAction({
            contextError: !requestOptions || !branchId || !productUnitId ? MISSING_CONTEXT_MESSAGE : null,
            successMessage: "Stock issue recorded successfully.",
            failureMessage: "Failed to record stock issue.",
            action: () => recordIssue(requestOptions as RequestOptions, {
                branch_id: branchId as number,
                product_unit_id: productUnitId as number,
                quantity: Number(quantity),
                notes: notes || null,
            }),
        })
    }

    return (
        <StockFormShell title="New Issue" description="Issue Product Unit stock out of a branch." isCompanyScoped={Boolean(requestOptions)} onSubmit={(event) => void submit(event)}>
            <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            <Field label="Issue quantity" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            <Field label="Issue notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button type="submit" size="xl" disabled={isSubmitting}>Record Issue</Button>
        </StockFormShell>
    )
}

export function StockAdjustmentView() {
    const { requestOptions, branches, productUnits, branchId, productUnitId, setBranchId, setProductUnitId } = useFormDefaults()
    const { isSubmitting, submitStockAction } = useStockActionSubmit()
    const [quantity, setQuantity] = useState("")
    const [unitCost, setUnitCost] = useState("")
    const [notes, setNotes] = useState("")

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await submitStockAction({
            contextError: !requestOptions || !branchId || !productUnitId ? MISSING_CONTEXT_MESSAGE : null,
            successMessage: "Stock adjustment recorded successfully.",
            failureMessage: "Failed to record stock adjustment.",
            action: () => recordAdjustment(requestOptions as RequestOptions, {
                branch_id: branchId as number,
                product_unit_id: productUnitId as number,
                quantity: Number(quantity),
                unit_cost: unitCost ? Number(unitCost) : undefined,
                notes: notes || null,
            }),
        })
    }

    return (
        <StockFormShell title="New Adjustment" description="Correct Product Unit stock with a signed quantity." isCompanyScoped={Boolean(requestOptions)} onSubmit={(event) => void submit(event)}>
            <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            <div className="grid gap-3 md:grid-cols-2">
                <Field label="Adjustment quantity" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
                <Field label="Adjustment cost" type="number" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
            </div>
            <Field label="Adjustment notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button type="submit" size="xl" disabled={isSubmitting}>Record Adjustment</Button>
        </StockFormShell>
    )
}

export function StockTransferView() {
    const { requestOptions, branches, productUnits, branchId, productUnitId, setBranchId, setProductUnitId } = useFormDefaults()
    const { isSubmitting, submitStockAction } = useStockActionSubmit()
    const [toBranchId, setToBranchId] = useState<number | null>(null)
    const [quantity, setQuantity] = useState("")
    const [notes, setNotes] = useState("")

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return
            if (branches.length < 2) return
            if (toBranchId !== null && toBranchId !== branchId) return
            setToBranchId(branches.find((branch) => branch.id !== branchId)?.id ?? null)
        })
        return () => {
            active = false
        }
    }, [branchId, branches, toBranchId])

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await submitStockAction({
            contextError: !requestOptions || !branchId || !productUnitId
                ? MISSING_CONTEXT_MESSAGE
                : !toBranchId
                    ? "Select a destination branch before recording stock."
                    : null,
            successMessage: "Stock transfer recorded successfully.",
            failureMessage: "Failed to record stock transfer.",
            action: () => recordTransfer(requestOptions as RequestOptions, {
                from_branch_id: branchId as number,
                to_branch_id: toBranchId as number,
                items: [{ product_unit_id: productUnitId as number, quantity: Number(quantity) }],
                notes: notes || null,
            }),
        })
    }

    return (
        <StockFormShell title="New Transfer" description="Move Product Unit stock between branches." isCompanyScoped={Boolean(requestOptions)} onSubmit={(event) => void submit(event)}>
            <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            <SelectField label="Destination branch" value={toBranchId ?? ""} onChange={(event) => setToBranchId(Number(event.target.value))}>
                {branches.filter((branch) => branch.id !== branchId).map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
            </SelectField>
            <Field label="Transfer quantity" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            <Field label="Transfer notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button type="submit" size="xl" disabled={isSubmitting || !toBranchId}>Record Transfer</Button>
        </StockFormShell>
    )
}

export function StockView() {
    return <StockOverviewView />
}
