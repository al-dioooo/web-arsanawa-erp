"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Icon } from "@/components/ui/icon"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useSession } from "@/features/auth/session-provider"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"
import {
    getSalesReport,
    getShiftReport,
    listShifts,
    type PosRequestOptions,
} from "@/features/pos/pos-api"
import type { SalesReport, Shift, ShiftReport } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"
import { formatDateID } from "@/lib/format"

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

export function ReportsView() {
    const { token, activeCompanyId, organizationContext } = useSession()
    const [from, setFrom] = useState(today())
    const [to, setTo] = useState(today())
    const [branchId, setBranchId] = useState("")
    const [salesReport, setSalesReport] = useState<SalesReport | null>(null)

    const [shifts, setShifts] = useState<Shift[]>([])
    const [selectedShift, setSelectedShift] = useState("")
    const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null)

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
        setIsLoading(true)
        setError(null)
        try {
            setSalesReport(await getSalesReport(requestOptions, {
                from,
                to,
                branch_id: branchId ? Number(branchId) : null,
            }))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load sales report.")
        } finally {
            setIsLoading(false)
        }
    }

    async function runShiftReport(shiftId: string) {
        setSelectedShift(shiftId)
        if (!requestOptions || !shiftId) {
            setShiftReport(null)
            return
        }
        setIsLoading(true)
        setError(null)
        try {
            setShiftReport(await getShiftReport(requestOptions, Number(shiftId)))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load shift report.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-6">
            <PosPageHeader
                title="Reports"
                subtitle="Review sales over a date range and inspect cashier shift settlements."
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                error={error}
            />

            {/* Sales report */}
            <div className="rounded-2xl border border-navy-100 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 border-b border-navy-50 pb-3 text-lg font-bold text-navy-900 font-display">
                    <Icon name="insights" className="text-teal-700" />
                    <span>Sales report</span>
                </h2>
                <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <DatePicker label="From" value={from} onChange={setFrom} />
                    <DatePicker label="To" value={to} onChange={setTo} />
                    <SearchableSelect
                        label="Branch"
                        value={branchId}
                        onChange={(value) => setBranchId(String(value))}
                        options={[
                            { value: "", label: "All branches" },
                            ...(organizationContext?.branches ?? []).map((branch) => ({
                                value: branch.id,
                                label: branch.name,
                            })),
                        ]}
                        placeholder="All branches"
                    />
                    <Button
                        type="button"
                        size="xl"
                        disabled={isLoading || !from || !to}
                        onClick={runSalesReport}
                        className="bg-teal-700 hover:bg-teal-800 text-white"
                    >
                        Run report
                    </Button>
                </div>

                {salesReport && (
                    <div className="mt-6 grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <SummaryCard label="Total sales" value={formatCurrency(salesReport.total_sales)} />
                            <SummaryCard label="Sale count" value={String(salesReport.sale_count)} />
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <BreakdownTable title="By type" rows={salesReport.by_type} />
                            <BreakdownTable title="By payment method" rows={salesReport.by_payment_method} />
                        </div>
                    </div>
                )}
                {!salesReport && (
                    <p className="mt-6 rounded-xl border border-navy-100 bg-navy-50/20 p-4 text-sm font-medium text-navy-400">
                        Select a date range and run the report.
                    </p>
                )}
            </div>

            {/* Shift report */}
            <div className="rounded-2xl border border-navy-100 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 border-b border-navy-50 pb-3 text-lg font-bold text-navy-900 font-display">
                    <Icon name="history" className="text-teal-700" />
                    <span>Shift settlement</span>
                </h2>
                <div className="max-w-md">
                    <SearchableSelect
                        label="Shift"
                        value={selectedShift}
                        onChange={(val) => void runShiftReport(String(val))}
                        options={shifts.map((shift) => ({
                            value: shift.id,
                            label: `Shift #${shift.id} · ${shift.status}${shift.opened_at ? ` · ${formatDateID(shift.opened_at)}` : ""}`,
                        }))}
                        placeholder="Select shift"
                    />
                </div>

                {shifts.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-navy-100 bg-navy-50/20 p-4 text-sm font-medium text-navy-400">
                        No shifts are available for settlement reporting yet.
                    </p>
                ) : null}

                {shiftReport && (
                    <div className="mt-6 grid gap-1.5 rounded-xl border border-navy-100 bg-navy-50/30 p-5 text-sm">
                        <SettlementRow label="Opening float" value={formatCurrency(shiftReport.opening_float)} />
                        <SettlementRow label="Cash sales" value={formatCurrency(shiftReport.cash_sales)} />
                        <SettlementRow label="Non-cash sales" value={formatCurrency(shiftReport.non_cash_sales)} />
                        <SettlementRow label="Expected cash" value={formatCurrency(shiftReport.expected_cash)} />
                        <SettlementRow label="Counted cash" value={formatCurrency(shiftReport.counted_cash)} />
                        <div className="mt-1 flex justify-between border-t border-navy-100 pt-2 font-bold">
                            <span>Variance</span>
                            <span
                                className={
                                    toNumber(shiftReport.cash_variance) === 0
                                        ? "text-navy-900"
                                        : toNumber(shiftReport.cash_variance) > 0
                                          ? "text-emerald-700"
                                          : "text-rose-700"
                                }
                            >
                                {toNumber(shiftReport.cash_variance) > 0 ? "+" : ""}
                                {formatCurrency(shiftReport.cash_variance)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-navy-100 bg-navy-50/30 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">{label}</p>
            <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
        </div>
    )
}

function BreakdownTable({ title, rows }: { title: string; rows: Record<string, string> }) {
    const entries = Object.entries(rows)
    return (
        <div className="rounded-xl border border-navy-100 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-500 font-display">{title}</p>
            {entries.length === 0 ? (
                <p className="text-sm text-navy-400">No data.</p>
            ) : (
                <div className="grid gap-1.5 text-sm">
                    {entries.map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                            <span className="capitalize text-navy-600">{key}</span>
                            <span className="font-semibold text-navy-900">{formatCurrency(value)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function SettlementRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-navy-500">{label}</span>
            <span className="font-medium text-navy-700">{value}</span>
        </div>
    )
}
