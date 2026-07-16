"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import { PosFilterBar, type PosSalesFilters } from "@/features/pos/components/pos-filter-bar"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"
import { SaleLifecycleActions } from "@/features/pos/components/sale-lifecycle-actions"
import { saleStatusTone } from "@/features/pos/components/sale-status"
import {
    cancelSale,
    commitPosImport,
    downloadPosImportTemplate,
    inspectPosImport,
    listSales,
    previewConfiguredPosImport,
    previewPosImport,
    voidSale,
    type PosRequestOptions,
} from "@/features/pos/pos-api"
import type { Pagination, Sale } from "@/features/pos/pos-types"
import { formatCurrency } from "@/lib/money"
import { formatDateID } from "@/lib/format"

export function SalesView() {
    const router = useRouter()
    const { token, activeCompanyId, organizationContext } = useSession()
    const [sales, setSales] = useState<Sale[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState<PosSalesFilters>({
        status: "",
        type: "",
        branchId: "",
        fulfilmentFrom: "",
        fulfilmentTo: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [importOpen, setImportOpen] = useState(false)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        setError(null)
        try {
            const data = await listSales(requestOptions, {
                status: filters.status || undefined,
                type: filters.type || undefined,
                branch_id: filters.branchId ? Number(filters.branchId) : undefined,
                fulfilment_from: filters.fulfilmentFrom || undefined,
                fulfilment_to: filters.fulfilmentTo || undefined,
                page,
                per_page: 25,
            })
            setSales(data.sales)
            setPagination(data.pagination)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load sales.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions, filters, page])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void refreshData()
        })
        return () => {
            active = false
        }
    }, [refreshData])

    async function runLifecycle(callback: () => Promise<Sale>) {
        if (!requestOptions) return
        setIsLoading(true)
        setError(null)
        try {
            const updated = await callback()
            setSales((current) => current.map((sale) => (sale.id === updated.id ? updated : sale)))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to update sale.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-6">
            <PosPageHeader
                title="Sales"
                subtitle="Browse counter sales and catering orders. Open a sale to view its lines, payments, and promotions."
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                error={error}
                actions={requestOptions ? (
                    <Button type="button" variant="outline" size="xl" onClick={() => setImportOpen(true)}>
                        <Icon name="description" size={18} />
                        Import Orders
                    </Button>
                ) : null}
            />

            {requestOptions ? (
                <SpreadsheetImportDialog
                    open={importOpen}
                    onClose={() => setImportOpen(false)}
                    title="Import Catering Orders"
                    description="Preview the configured Google Form source or upload a catering order template, then queue confirmed orders."
                    operations={{
                        downloadTemplate: (format) => downloadPosImportTemplate(requestOptions, format),
                        inspect: (input) => inspectPosImport(requestOptions, input),
                        preview: (importId, sheetName) => previewPosImport(requestOptions, importId, sheetName),
                        previewConfigured: () => previewConfiguredPosImport(requestOptions),
                        commit: (importId) => commitPosImport(requestOptions, importId),
                    }}
                    configuredImportSettingsHref="/platform/settings"
                    onCommitted={() => void refreshData()}
                />
            ) : null}

            <div className="rounded-2xl border border-navy-100 bg-white p-6">
                <PosFilterBar
                    filters={filters}
                    branches={organizationContext?.branches ?? []}
                    onChange={(next) => {
                        setFilters((current) => ({ ...current, ...next }))
                        setPage(1)
                    }}
                />

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                        <thead>
                            <tr className="bg-navy-50/30 text-xs font-bold uppercase tracking-wider text-navy-500">
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Sale</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Type</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Customer</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Date</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display text-right">Total</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Status</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((sale) => (
                                <tr
                                    key={sale.id}
                                    className="cursor-pointer transition-colors hover:bg-navy-50/20"
                                >
                                    <td
                                        onClick={() => router.push(`/pos/sales/${sale.id}`)}
                                        className="border-b border-navy-100/50 px-4 py-3 font-bold text-navy-900"
                                    >
                                        {sale.sale_number ?? `#${sale.id}`}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 capitalize text-navy-700 font-medium">
                                        {sale.type}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 text-navy-700 font-medium">
                                        {sale.customer_name ?? (sale.partner_id ? `Partner #${sale.partner_id}` : "Walk-in")}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 text-navy-600 font-medium">
                                        {sale.order_date ? formatDateID(sale.order_date) : "-"}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 text-right font-bold text-navy-900">
                                        {formatCurrency(sale.total)}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3">
                                        <StatusPill tone={saleStatusTone(sale.status)}>{sale.status}</StatusPill>
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 text-right">
                                        <SaleLifecycleActions
                                            sale={sale}
                                            isLoading={isLoading}
                                            onCancel={() => void runLifecycle(() => cancelSale(requestOptions!, sale.id))}
                                            onVoid={() => void runLifecycle(() => voidSale(requestOptions!, sale.id))}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {sales.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="bg-navy-50/10 py-8 text-center font-medium text-navy-400">
                                        {isLoading ? "Loading sales..." : "No sales found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.last_page > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-navy-50 pt-4 text-sm">
                        <span className="text-navy-500">
                            Page {pagination.current_page} of {pagination.last_page} · {pagination.total} sales
                        </span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page <= 1 || isLoading}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <Icon name="chevron_left" size={16} />
                                Prev
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.last_page || isLoading}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                                <Icon name="chevron_right" size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
