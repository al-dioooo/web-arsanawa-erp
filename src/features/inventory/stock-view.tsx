"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardLabel, CardValue } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Field, SelectField } from "@/components/ui/field"
import { InputDate } from "@/components/ui/input-date"
import { MotionLinkItem } from "@/components/ui/motion-link"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { TablePagination } from "@/components/ui/table-pagination"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { InventoryPageHeader } from "@/features/inventory/inventory-layout"
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

type RequestOptions = { token: string; companyId: number }
type Branch = { id: number; name: string }
const STOCK_OVERVIEW_PATH = "/inventory/stock"
const LOTS_PER_PAGE = 50

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

function productUnitLabel(unit: ProductUnit): string {
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
    const t = useTranslations("inventory.stock")
    const { token, activeCompanyId, organizationContext } = useSession()
    const [productUnits, setProductUnits] = useState<ProductUnit[]>([])
    const [error, setError] = useState<string | null>(null)

    const requestOptions = useMemo<RequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const branches = useMemo<Branch[]>(() => organizationContext?.branches ?? [], [organizationContext?.branches])

    const optionsError = t("optionsError")

    useEffect(() => {
        let active = true
        void Promise.resolve().then(async () => {
            if (!active || !requestOptions) return
            try {
                const response = await listProductUnits(requestOptions, { per_page: 100 })
                if (active) setProductUnits(response.data.product_units)
            } catch (caught) {
                if (active) {
                    const message = readableError(caught, optionsError)
                    setError(message)
                    toast.error(message)
                }
            }
        })

        return () => {
            active = false
        }
    }, [optionsError, requestOptions])

    return {
        requestOptions,
        branches,
        productUnits,
        defaultBranchId: branches[0]?.id ?? null,
        defaultProductUnitId: productUnits[0]?.id ?? null,
        error,
    }
}

function StockPageHeader({
    title,
    description,
    isCompanyScoped,
    status,
}: {
    title: string
    description: string
    isCompanyScoped?: boolean
    status?: ReactNode
}) {
    const t = useTranslations("inventory.stock")

    return (
        <InventoryPageHeader
            eyebrow={t("eyebrow")}
            title={title}
            description={description}
            isCompanyScoped={isCompanyScoped}
            status={status}
        />
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
    const t = useTranslations("inventory.stock")

    return (
        <div className="grid gap-3 md:grid-cols-2">
            <SelectField label={t("selectors.branch")} value={branchId ?? ""} onChange={(event) => onBranchChange(Number(event.target.value))}>
                {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
            </SelectField>
            <SearchableSelect
                label={t("selectors.productUnit")}
                value={productUnitId ?? ""}
                onChange={(value) => onProductUnitChange(Number(value))}
                options={productUnits.map((unit) => ({ value: unit.id, label: productUnitLabel(unit) }))}
                placeholder={t("selectors.productUnitPlaceholder")}
            />
        </div>
    )
}

export function StockOverviewView() {
    const t = useTranslations("inventory.stock")
    const navT = useTranslations("inventory.nav")
    const { requestOptions, branches, productUnits, defaultBranchId, defaultProductUnitId } = useStockOptions()
    const [branchId, setBranchId] = useState<number | null>(null)
    const [productUnitId, setProductUnitId] = useState<number | null>(null)
    const [snapshot, setSnapshot] = useState({ totalValue: "0.0000", selectedOnHand: "0.0000", lotTotal: 0, movements: [] as StockMovement[], movementTotal: 0 })

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

    const overviewError = t("overview.error")

    useEffect(() => {
        let active = true
        void Promise.resolve().then(async () => {
            if (!active || !requestOptions) return
            try {
                const loaded = await loadStockSnapshot(requestOptions, branchId, productUnitId)
                if (active) setSnapshot(loaded)
            } catch (caught) {
                if (active) toast.error(readableError(caught, overviewError))
            }
        })
        return () => {
            active = false
        }
    }, [branchId, overviewError, productUnitId, requestOptions])

    return (
        <div className="grid gap-6">
            <StockPageHeader title={t("overview.title")} description={t("overview.subtitle")} isCompanyScoped={Boolean(requestOptions)} />
            <Card as="section" padding="md">
                <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            </Card>
            <section className="grid gap-4 md:grid-cols-3">
                <Card padding="md">
                    <CardLabel>{t("overview.contextValue")}</CardLabel>
                    <CardValue className="mt-2">{moneyLabel(snapshot.totalValue)}</CardValue>
                </Card>
                <Card padding="md">
                    <CardLabel>{t("overview.selectedOnHand")}</CardLabel>
                    <CardValue className="mt-2 text-brand-ink">{numberLabel(snapshot.selectedOnHand)}</CardValue>
                </Card>
                <Card padding="md">
                    <CardLabel>{t("overview.activeLots")}</CardLabel>
                    <CardValue className="mt-2">{snapshot.lotTotal}</CardValue>
                </Card>
            </section>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MotionLinkItem href="/inventory/stock/lots" icon="local_offer" label={navT("stockLots")}>
                    {t("overview.links.lots")}
                </MotionLinkItem>
                <MotionLinkItem href="/inventory/stock/movements" icon="history" label={navT("movements")}>
                    {t("overview.links.movements")}
                </MotionLinkItem>
                <MotionLinkItem href="/inventory/stock/receipts/new" icon="add" label={navT("newReceipt")}>
                    {t("overview.links.receipt")}
                </MotionLinkItem>
                <MotionLinkItem href="/inventory/stock/issues/new" icon="remove_circle" label={navT("newIssue")}>
                    {t("overview.links.issue")}
                </MotionLinkItem>
                <MotionLinkItem href="/inventory/stock/adjustments/new" icon="sync_alt" label={navT("newAdjustment")}>
                    {t("overview.links.adjustment")}
                </MotionLinkItem>
                <MotionLinkItem href="/inventory/stock/transfers/new" icon="swap_horiz" label={navT("newTransfer")}>
                    {t("overview.links.transfer")}
                </MotionLinkItem>
            </section>
        </div>
    )
}

export function StockLotsView() {
    const t = useTranslations("inventory.stock")
    const { requestOptions, branches, productUnits, defaultBranchId, defaultProductUnitId } = useStockOptions()
    const [branchId, setBranchId] = useState<number | null>(null)
    const [productUnitId, setProductUnitId] = useState<number | null>(null)
    const [lots, setLots] = useState<StockLot[]>([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

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

    const lotsError = t("lots.error")

    const loadLots = useCallback(async () => {
        if (!requestOptions) {
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            const loaded = await loadStockLots(requestOptions, {
                branch_id: branchId,
                product_unit_id: productUnitId,
                page,
                per_page: LOTS_PER_PAGE,
            })
            setLots(loaded.lots)
            setTotal(loaded.pagination.total)
            setLoadError(null)
        } catch (caught) {
            setLoadError(readableError(caught, lotsError))
        } finally {
            setIsLoading(false)
        }
    }, [branchId, lotsError, page, productUnitId, requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void loadLots()
        })
        return () => {
            active = false
        }
    }, [loadLots])

    const showSkeleton = isLoading && lots.length === 0

    return (
        <div className="grid gap-6">
            <StockPageHeader title={t("lots.title")} description={t("lots.subtitle")} isCompanyScoped={Boolean(requestOptions)} />
            <Card as="section" padding="md">
                <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            </Card>
            <DataTable
                minWidth={560}
                columns={[
                    t("lots.columns.lot"),
                    t("lots.columns.productUnit"),
                    { label: t("lots.columns.remaining"), align: "end" },
                    { label: t("lots.columns.unitCost"), align: "end" },
                ]}
                footer={total > LOTS_PER_PAGE ? (
                    <TablePagination
                        page={page}
                        pageSize={LOTS_PER_PAGE}
                        total={total}
                        onPageChange={setPage}
                        label={(range) => t("lots.pageInfo", range)}
                    />
                ) : undefined}
            >
                <TableStateRow
                    isLoading={showSkeleton}
                    isError={Boolean(loadError)}
                    error={loadError ? new Error(loadError) : undefined}
                    count={lots.length}
                    columns={4}
                    emptyMessage={t("lots.empty")}
                    onRetry={() => void loadLots()}
                />
                {!loadError && !showSkeleton && lots.map((lot) => (
                    <tr key={lot.id}>
                        <td className="font-semibold text-ink">{lot.lot_number ?? t("lots.lotNumber", { id: lot.id })}</td>
                        <td className="font-medium text-brand-ink">{lot.product_unit?.sku ?? lot.product_unit_id}</td>
                        <td className="text-end tabular-nums">{numberLabel(lot.remaining_quantity)}</td>
                        <td className="text-end tabular-nums">{moneyLabel(lot.unit_cost)}</td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}

export function StockMovementsView() {
    const t = useTranslations("inventory.stock")
    const { requestOptions, branches, productUnits, defaultBranchId, defaultProductUnitId } = useStockOptions()
    const [branchId, setBranchId] = useState<number | null>(null)
    const [productUnitId, setProductUnitId] = useState<number | null>(null)
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [total, setTotal] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

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

    const movementsError = t("movements.error")

    const loadMovements = useCallback(async () => {
        if (!requestOptions) {
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            const loaded = await loadStockMovements(requestOptions, { branch_id: branchId, product_unit_id: productUnitId, per_page: 50 })
            setMovements(loaded.movements)
            setTotal(loaded.total)
            setLoadError(null)
        } catch (caught) {
            setLoadError(readableError(caught, movementsError))
        } finally {
            setIsLoading(false)
        }
    }, [branchId, movementsError, productUnitId, requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void loadMovements()
        })
        return () => {
            active = false
        }
    }, [loadMovements])

    const showSkeleton = isLoading && movements.length === 0

    return (
        <div className="grid gap-6">
            <StockPageHeader
                title={t("movements.title")}
                description={t("movements.subtitle")}
                isCompanyScoped={Boolean(requestOptions)}
                status={<StatusPill tone="neutral">{t("movements.count", { count: movements.length, total })}</StatusPill>}
            />
            <Card as="section" padding="md">
                <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            </Card>
            <DataTable
                minWidth={720}
                columns={[
                    t("movements.columns.movement"),
                    t("movements.columns.productUnit"),
                    t("movements.columns.type"),
                    { label: t("movements.columns.qty"), align: "end" },
                    t("movements.columns.occurredAt"),
                ]}
            >
                <TableStateRow
                    isLoading={showSkeleton}
                    isError={Boolean(loadError)}
                    error={loadError ? new Error(loadError) : undefined}
                    count={movements.length}
                    columns={5}
                    emptyMessage={t("movements.empty")}
                    onRetry={() => void loadMovements()}
                />
                {!loadError && !showSkeleton && movements.map((movement) => (
                    <tr key={movement.id}>
                        <td className="font-semibold">
                            <Link className="text-brand-ink transition-colors hover:underline" href={`/inventory/stock/movements/${movement.id}`}>
                                {t("movements.movementNumber", { id: movement.id })}
                            </Link>
                        </td>
                        <td className="font-medium text-ink">{movement.product_unit?.sku ?? movement.product_unit_id}</td>
                        <td>{movement.type.replaceAll("_", " ").toUpperCase()}</td>
                        <td className="text-end tabular-nums">{numberLabel(movement.quantity)}</td>
                        <td className="text-ink-muted">{compactDateTime(movement.occurred_at)}</td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}

export function StockMovementDetailView({ movementId }: { movementId: number }) {
    const t = useTranslations("inventory.stock")
    const rootT = useTranslations()
    const { requestOptions } = useStockOptions()
    const [movement, setMovement] = useState<StockMovement | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    const detailError = t("detail.error")

    const loadMovement = useCallback(async () => {
        if (!requestOptions) return
        try {
            const response = await getStockMovement(requestOptions, movementId)
            setMovement(response.data.movement)
            setLoadError(null)
        } catch (caught) {
            const message = readableError(caught, detailError)
            setLoadError(message)
            toast.error(message)
        }
    }, [detailError, movementId, requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void loadMovement()
        })
        return () => {
            active = false
        }
    }, [loadMovement])

    return (
        <div className="grid gap-6">
            <StockPageHeader
                title={t("movements.movementNumber", { id: movementId })}
                description={t("detail.subtitle")}
                isCompanyScoped={Boolean(requestOptions)}
            />
            {movement ? (
                <Card as="section" padding="md" className="grid gap-4 md:grid-cols-2">
                    <div>
                        <CardLabel>{t("detail.productUnit")}</CardLabel>
                        <p className="mt-1 font-bold text-ink">{movement.product_unit?.sku ?? movement.product_unit_id}</p>
                    </div>
                    <div>
                        <CardLabel>{t("detail.type")}</CardLabel>
                        <p className="mt-1 font-bold text-ink">{movement.type.replaceAll("_", " ").toUpperCase()}</p>
                    </div>
                    <div>
                        <CardLabel>{t("detail.quantity")}</CardLabel>
                        <p className="mt-1 font-bold text-ink tabular-nums">{numberLabel(movement.quantity)}</p>
                    </div>
                    <div>
                        <CardLabel>{t("detail.unitCost")}</CardLabel>
                        <p className="mt-1 font-bold text-ink tabular-nums">{moneyLabel(movement.unit_cost)}</p>
                    </div>
                    <div>
                        <CardLabel>{t("detail.occurredAt")}</CardLabel>
                        <p className="mt-1 font-bold text-ink">{compactDateTime(movement.occurred_at)}</p>
                    </div>
                    <div>
                        <CardLabel>{t("detail.notes")}</CardLabel>
                        <p className="mt-1 font-bold text-ink">{movement.notes ?? t("detail.noNotes")}</p>
                    </div>
                </Card>
            ) : loadError ? (
                <Card padding="lg" className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-error">{loadError}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadMovement()}>
                        {rootT("common.retry")}
                    </Button>
                </Card>
            ) : (
                <Card as="section" padding="md" className="grid gap-4 md:grid-cols-2" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index}>
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="mt-2 h-5 w-40" />
                        </div>
                    ))}
                </Card>
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
            <StockPageHeader title={title} description={description} isCompanyScoped={isCompanyScoped} />
            <Card as="form" padding="md" className="grid gap-4" onSubmit={onSubmit}>{children}</Card>
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
    const t = useTranslations("inventory.stock")
    const { requestOptions, branches, productUnits, branchId, productUnitId, setBranchId, setProductUnitId } = useFormDefaults()
    const { isSubmitting, submitStockAction } = useStockActionSubmit()
    const [quantity, setQuantity] = useState("")
    const [unitCost, setUnitCost] = useState("")
    const [lotNumber, setLotNumber] = useState("")
    const [receivedAt, setReceivedAt] = useState(today())

    const missingContext = t("missingContext")
    const successMessage = t("receipt.success")
    const failureMessage = t("receipt.failure")

    const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await submitStockAction({
            contextError: !requestOptions || !branchId || !productUnitId ? missingContext : null,
            successMessage,
            failureMessage,
            action: () => recordReceipt(requestOptions as RequestOptions, {
                branch_id: branchId as number,
                product_unit_id: productUnitId as number,
                quantity: Number(quantity),
                unit_cost: Number(unitCost),
                lot_number: lotNumber || undefined,
                received_at: receivedAt,
            }),
        })
    }, [branchId, failureMessage, lotNumber, missingContext, productUnitId, quantity, receivedAt, requestOptions, submitStockAction, successMessage, unitCost])

    return (
        <StockFormShell title={t("receipt.title")} description={t("receipt.subtitle")} isCompanyScoped={Boolean(requestOptions)} onSubmit={(event) => void submit(event)}>
            <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            <div className="grid gap-3 md:grid-cols-2">
                <Field label={t("receipt.quantity")} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
                <Field label={t("receipt.unitCost")} type="number" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} required />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <Field label={t("receipt.lotNumber")} value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} />
                <InputDate label={t("receipt.receivedAt")} value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} required />
            </div>
            <Button type="submit" size="xl" disabled={isSubmitting}>{t("receipt.submit")}</Button>
        </StockFormShell>
    )
}

export function StockIssueView() {
    const t = useTranslations("inventory.stock")
    const { requestOptions, branches, productUnits, branchId, productUnitId, setBranchId, setProductUnitId } = useFormDefaults()
    const { isSubmitting, submitStockAction } = useStockActionSubmit()
    const [quantity, setQuantity] = useState("")
    const [notes, setNotes] = useState("")

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await submitStockAction({
            contextError: !requestOptions || !branchId || !productUnitId ? t("missingContext") : null,
            successMessage: t("issue.success"),
            failureMessage: t("issue.failure"),
            action: () => recordIssue(requestOptions as RequestOptions, {
                branch_id: branchId as number,
                product_unit_id: productUnitId as number,
                quantity: Number(quantity),
                notes: notes || null,
            }),
        })
    }

    return (
        <StockFormShell title={t("issue.title")} description={t("issue.subtitle")} isCompanyScoped={Boolean(requestOptions)} onSubmit={(event) => void submit(event)}>
            <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            <Field label={t("issue.quantity")} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            <Field label={t("issue.notes")} value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button type="submit" size="xl" disabled={isSubmitting}>{t("issue.submit")}</Button>
        </StockFormShell>
    )
}

export function StockAdjustmentView() {
    const t = useTranslations("inventory.stock")
    const { requestOptions, branches, productUnits, branchId, productUnitId, setBranchId, setProductUnitId } = useFormDefaults()
    const { isSubmitting, submitStockAction } = useStockActionSubmit()
    const [quantity, setQuantity] = useState("")
    const [unitCost, setUnitCost] = useState("")
    const [notes, setNotes] = useState("")

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await submitStockAction({
            contextError: !requestOptions || !branchId || !productUnitId ? t("missingContext") : null,
            successMessage: t("adjustment.success"),
            failureMessage: t("adjustment.failure"),
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
        <StockFormShell title={t("adjustment.title")} description={t("adjustment.subtitle")} isCompanyScoped={Boolean(requestOptions)} onSubmit={(event) => void submit(event)}>
            <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            <div className="grid gap-3 md:grid-cols-2">
                <Field label={t("adjustment.quantity")} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
                <Field label={t("adjustment.cost")} type="number" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
            </div>
            <Field label={t("adjustment.notes")} value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button type="submit" size="xl" disabled={isSubmitting}>{t("adjustment.submit")}</Button>
        </StockFormShell>
    )
}

export function StockTransferView() {
    const t = useTranslations("inventory.stock")
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
                ? t("missingContext")
                : !toBranchId
                    ? t("transfer.missingDestination")
                    : null,
            successMessage: t("transfer.success"),
            failureMessage: t("transfer.failure"),
            action: () => recordTransfer(requestOptions as RequestOptions, {
                from_branch_id: branchId as number,
                to_branch_id: toBranchId as number,
                items: [{ product_unit_id: productUnitId as number, quantity: Number(quantity) }],
                notes: notes || null,
            }),
        })
    }

    return (
        <StockFormShell title={t("transfer.title")} description={t("transfer.subtitle")} isCompanyScoped={Boolean(requestOptions)} onSubmit={(event) => void submit(event)}>
            <StockSelectors branches={branches} productUnits={productUnits} branchId={branchId} productUnitId={productUnitId} onBranchChange={setBranchId} onProductUnitChange={setProductUnitId} />
            <SelectField label={t("transfer.destination")} value={toBranchId ?? ""} onChange={(event) => setToBranchId(Number(event.target.value))}>
                {branches.filter((branch) => branch.id !== branchId).map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
            </SelectField>
            <Field label={t("transfer.quantity")} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            <Field label={t("transfer.notes")} value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button type="submit" size="xl" disabled={isSubmitting || !toBranchId}>{t("transfer.submit")}</Button>
        </StockFormShell>
    )
}

export function StockView() {
    return <StockOverviewView />
}
