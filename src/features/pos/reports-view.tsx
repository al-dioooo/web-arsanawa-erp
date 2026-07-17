"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { CategoryBarChart, type CategoryDatum } from "@/components/charts/category-bar-chart"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"
import { StaggerGroup, StaggerItem } from "@/components/ui/stagger"
import { StatCard } from "@/components/ui/stat-card"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import {
    getSalesReport,
    getShiftReport,
    listShifts,
    type PosRequestOptions,
} from "@/features/pos/pos-api"
import type { SalesReport, Shift, ShiftReport } from "@/features/pos/pos-types"
import { CHART_SERIES } from "@/lib/chart-theme"
import { formatDateID } from "@/lib/format"
import { formatCurrency, toNumber } from "@/lib/money"

// Module-level Intl-bound formatters: referentially stable across renders,
// as useCountUp requires.
const idrFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
})
const formatIdrValue = idrFormatter.format.bind(idrFormatter)

const countFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })
const formatCountValue = countFormatter.format.bind(countFormatter)

/** Known enum keys with localized labels in pos.reports.saleTypes.*. */
const SALE_TYPE_KEYS: ReadonlySet<string> = new Set(["counter", "catering"])
/** Known enum keys with localized labels in pos.reports.paymentMethods.*. */
const PAYMENT_METHOD_KEYS: ReadonlySet<string> = new Set(["cash", "card", "qris", "transfer"])

/** Fallback label-casing for unknown breakdown keys: "bank_transfer" → "Bank transfer". */
export function labelCaseKey(key: string): string {
    const words = key.replace(/[_-]+/g, " ").trim()
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : key
}

/**
 * Maps an API breakdown record ({ key: "150000.0000" }) onto chart rows,
 * parsing the decimal strings and ranking largest-first.
 */
export function toBreakdownData(
    rows: Record<string, string>,
    labelFor: (key: string) => string = labelCaseKey,
): CategoryDatum[] {
    return Object.entries(rows)
        .map(([key, value]) => ({ label: labelFor(key), value: toNumber(value) }))
        .sort((a, b) => b.value - a.value)
}

/** Per-bar row height keeps short breakdowns from rendering one giant bar. */
function breakdownChartHeight(rowCount: number): number {
    return Math.max(140, rowCount * 52 + 36)
}

interface BreakdownCardProps {
    title: string
    rows: Record<string, string>
    /** Localizes known enum keys; unknown keys fall back to label-casing. */
    labelFor?: (key: string) => string
    emptyTitle: string
    /** Localized series name shown in the chart tooltip. */
    valueLabel: string
    color?: string
}

/** Card wrapping one categorical breakdown of the sales report. */
export function BreakdownCard({
    title,
    rows,
    labelFor,
    emptyTitle,
    valueLabel,
    color,
}: BreakdownCardProps) {
    const data = toBreakdownData(rows, labelFor)

    return (
        <Card padding="lg">
            <h3 className="type-section">{title}</h3>
            {data.length === 0 ? (
                <EmptyState compact icon="insights" title={emptyTitle} />
            ) : (
                <CategoryBarChart
                    className="mt-4"
                    data={data}
                    valueLabel={valueLabel}
                    valueFormatter={formatIdrValue}
                    color={color}
                    height={breakdownChartHeight(data.length)}
                    labelWidth={130}
                />
            )}
        </Card>
    )
}

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

export function ReportsView() {
    const t = useTranslations("pos.reports")
    const rootT = useTranslations()
    const { token, activeCompanyId, organizationContext } = useSession()
    const [from, setFrom] = useState(today())
    const [to, setTo] = useState(today())
    const [branchId, setBranchId] = useState("")
    const [salesReport, setSalesReport] = useState<SalesReport | null>(null)

    const [shifts, setShifts] = useState<Shift[]>([])
    const [selectedShift, setSelectedShift] = useState("")
    const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null)

    const [isSalesLoading, setIsSalesLoading] = useState(false)
    const [isShiftLoading, setIsShiftLoading] = useState(false)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const loadShifts = useCallback(async () => {
        if (!requestOptions) return
        try {
            setShifts(await listShifts(requestOptions))
        } catch {
            // Non-fatal: shift report lookup just stays empty.
        }
    }, [requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void loadShifts()
        })
        return () => {
            active = false
        }
    }, [loadShifts])

    async function runSalesReport() {
        if (!requestOptions) return
        setIsSalesLoading(true)
        try {
            setSalesReport(await getSalesReport(requestOptions, {
                from,
                to,
                branch_id: branchId ? Number(branchId) : null,
            }))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("sales.error"))
        } finally {
            setIsSalesLoading(false)
        }
    }

    async function runShiftReport(shiftId: string) {
        setSelectedShift(shiftId)
        if (!requestOptions || !shiftId) {
            setShiftReport(null)
            return
        }
        setIsShiftLoading(true)
        try {
            setShiftReport(await getShiftReport(requestOptions, Number(shiftId)))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("shift.error"))
        } finally {
            setIsShiftLoading(false)
        }
    }

    const saleTypeLabel = (key: string) =>
        SALE_TYPE_KEYS.has(key) ? t(`saleTypes.${key}`) : labelCaseKey(key)
    const paymentMethodLabel = (key: string) =>
        PAYMENT_METHOD_KEYS.has(key) ? t(`paymentMethods.${key}`) : labelCaseKey(key)

    const variance = toNumber(shiftReport?.cash_variance)

    return (
        <div className="grid gap-6">
            <PageHeader
                eyebrow={rootT("modules.pos")}
                title={t("title")}
                subtitle={t("subtitle")}
                status={
                    <StatusPill tone={activeCompanyId ? "green" : "amber"}>
                        {activeCompanyId ? rootT("common.companyScoped") : rootT("common.noCompany")}
                    </StatusPill>
                }
                className="mb-0"
            />

            {/* Sales report controls */}
            <Card padding="lg">
                <h2 className="type-section">{t("sales.title")}</h2>
                <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <DatePicker label={t("sales.from")} value={from} onChange={setFrom} />
                    <DatePicker label={t("sales.to")} value={to} onChange={setTo} />
                    <SearchableSelect
                        label={t("sales.branch")}
                        value={branchId}
                        onChange={(value) => setBranchId(String(value))}
                        options={[
                            { value: "", label: t("sales.allBranches") },
                            ...(organizationContext?.branches ?? []).map((branch) => ({
                                value: branch.id,
                                label: branch.name,
                            })),
                        ]}
                        placeholder={t("sales.allBranches")}
                    />
                    <Button
                        type="button"
                        size="xl"
                        disabled={isSalesLoading || !from || !to}
                        onClick={runSalesReport}
                    >
                        {t("sales.run")}
                    </Button>
                </div>
                {!salesReport && !isSalesLoading ? (
                    <EmptyState
                        compact
                        icon="insights"
                        title={t("sales.empty")}
                        description={t("sales.emptyHint")}
                    />
                ) : null}
            </Card>

            {/* Sales report results */}
            {isSalesLoading && !salesReport ? (
                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <SkeletonCard className="min-h-28" />
                        <SkeletonCard className="min-h-28" />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Skeleton className="h-56 w-full rounded-lg" />
                        <Skeleton className="h-56 w-full rounded-lg" />
                    </div>
                </div>
            ) : null}
            {salesReport ? (
                <>
                    <StaggerGroup as="section" className="grid gap-4 sm:grid-cols-2">
                        <StaggerItem>
                            <StatCard
                                label={t("sales.totalSales")}
                                value={toNumber(salesReport.total_sales)}
                                formatValue={formatIdrValue}
                            />
                        </StaggerItem>
                        <StaggerItem>
                            <StatCard
                                label={t("sales.saleCount")}
                                value={salesReport.sale_count}
                                formatValue={formatCountValue}
                            />
                        </StaggerItem>
                    </StaggerGroup>
                    <section className="grid gap-4 lg:grid-cols-2">
                        <BreakdownCard
                            title={t("sales.byType")}
                            rows={salesReport.by_type}
                            labelFor={saleTypeLabel}
                            emptyTitle={t("sales.breakdownEmpty")}
                            valueLabel={t("sales.amount")}
                        />
                        <BreakdownCard
                            title={t("sales.byPaymentMethod")}
                            rows={salesReport.by_payment_method}
                            labelFor={paymentMethodLabel}
                            emptyTitle={t("sales.breakdownEmpty")}
                            valueLabel={t("sales.amount")}
                            color={CHART_SERIES[1]}
                        />
                    </section>
                </>
            ) : null}

            {/* Shift settlement */}
            <Card padding="lg">
                <h2 className="type-section">{t("shift.title")}</h2>
                <p className="mt-0.5 text-xs text-ink-faint">{t("shift.subtitle")}</p>
                <div className="mt-4 max-w-md">
                    <SearchableSelect
                        label={t("shift.select")}
                        value={selectedShift}
                        onChange={(val) => void runShiftReport(String(val))}
                        options={shifts.map((shift) => ({
                            value: shift.id,
                            label: [
                                t("shift.optionLabel", { id: shift.id }),
                                t(`shift.status.${shift.status}`),
                                shift.opened_at ? formatDateID(shift.opened_at) : null,
                            ]
                                .filter(Boolean)
                                .join(" · "),
                        }))}
                        placeholder={t("shift.selectPlaceholder")}
                    />
                </div>

                {shifts.length === 0 ? (
                    <EmptyState
                        compact
                        icon="history"
                        title={t("shift.empty")}
                        description={t("shift.emptyHint")}
                    />
                ) : null}

                {isShiftLoading && !shiftReport ? (
                    <Card inset className="mt-5">
                        <Skeleton className="h-40 w-full" />
                    </Card>
                ) : null}
                {shiftReport ? (
                    <Card inset className="mt-5 grid gap-1.5 text-sm">
                        <SettlementRow
                            label={t("shift.openingFloat")}
                            value={formatCurrency(shiftReport.opening_float)}
                        />
                        <SettlementRow
                            label={t("shift.cashSales")}
                            value={formatCurrency(shiftReport.cash_sales)}
                        />
                        <SettlementRow
                            label={t("shift.nonCashSales")}
                            value={formatCurrency(shiftReport.non_cash_sales)}
                        />
                        <SettlementRow
                            label={t("shift.expectedCash")}
                            value={formatCurrency(shiftReport.expected_cash)}
                        />
                        <SettlementRow
                            label={t("shift.countedCash")}
                            value={formatCurrency(shiftReport.counted_cash)}
                        />
                        <div className="mt-1 flex justify-between border-t border-line pt-2 font-bold text-ink">
                            <span>{t("shift.variance")}</span>
                            <span
                                className={
                                    variance === 0
                                        ? "text-ink"
                                        : variance > 0
                                          ? "text-success-strong"
                                          : "text-error-strong"
                                }
                            >
                                {variance > 0 ? "+" : ""}
                                {formatCurrency(shiftReport.cash_variance)}
                            </span>
                        </div>
                    </Card>
                ) : null}
            </Card>
        </div>
    )
}

function SettlementRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-ink-muted">{label}</span>
            <span className="font-medium text-ink-secondary tabular-nums">{value}</span>
        </div>
    )
}
