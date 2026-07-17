"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog"
import { DataTable } from "@/components/ui/data-table"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { TablePagination } from "@/components/ui/table-pagination"
import { TableStateRow } from "@/components/ui/table-state-row"
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
    const t = useTranslations("pos.sales")
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
    const [importOpen, setImportOpen] = useState(false)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const loadErrorFallback = t("loadError")
    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
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
            toast.error(caught instanceof Error ? caught.message : loadErrorFallback)
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions, filters, page, loadErrorFallback])

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
        try {
            const updated = await callback()
            setSales((current) => current.map((sale) => (sale.id === updated.id ? updated : sale)))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("updateError"))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-6">
            <PosPageHeader
                title={t("title")}
                subtitle={t("subtitle")}
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                actions={requestOptions ? (
                    <Button type="button" variant="outline" size="xl" onClick={() => setImportOpen(true)}>
                        <Icon name="description" size={18} />
                        {t("import")}
                    </Button>
                ) : null}
            />

            {requestOptions ? (
                <SpreadsheetImportDialog
                    open={importOpen}
                    onClose={() => setImportOpen(false)}
                    title={t("importTitle")}
                    description={t("importDescription")}
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

            <PosFilterBar
                filters={filters}
                branches={organizationContext?.branches ?? []}
                onChange={(next) => {
                    setFilters((current) => ({ ...current, ...next }))
                    setPage(1)
                }}
            />

            <DataTable
                columns={[
                    t("columns.sale"),
                    t("columns.type"),
                    t("columns.customer"),
                    t("columns.date"),
                    { label: t("columns.total"), align: "end" },
                    t("columns.status"),
                    { label: t("columns.actions"), align: "end" },
                ]}
                minWidth={760}
                footer={
                    pagination && pagination.last_page > 1 ? (
                        <TablePagination
                            page={pagination.current_page}
                            pageSize={pagination.per_page}
                            total={pagination.total}
                            onPageChange={(next) => {
                                if (!isLoading) setPage(next)
                            }}
                            label={(info) => t("pageInfo", info)}
                        />
                    ) : null
                }
            >
                {sales.map((sale) => (
                    <tr key={sale.id} className="cursor-pointer">
                        <td
                            onClick={() => router.push(`/pos/sales/${sale.id}`)}
                            className="px-6 py-4 font-bold text-ink"
                        >
                            {sale.sale_number ?? `#${sale.id}`}
                        </td>
                        <td className="capitalize">{sale.type}</td>
                        <td>
                            {sale.customer_name ??
                                (sale.partner_id ? t("partnerRef", { id: sale.partner_id }) : t("walkIn"))}
                        </td>
                        <td>{sale.order_date ? formatDateID(sale.order_date) : "-"}</td>
                        <td className="px-6 py-4 text-end font-bold text-ink tabular-nums">
                            {formatCurrency(sale.total)}
                        </td>
                        <td>
                            <StatusPill tone={saleStatusTone(sale.status)}>{sale.status}</StatusPill>
                        </td>
                        <td className="text-end">
                            <SaleLifecycleActions
                                sale={sale}
                                isLoading={isLoading}
                                onCancel={() => void runLifecycle(() => cancelSale(requestOptions!, sale.id))}
                                onVoid={() => void runLifecycle(() => voidSale(requestOptions!, sale.id))}
                            />
                        </td>
                    </tr>
                ))}
                <TableStateRow
                    isLoading={isLoading && sales.length === 0}
                    count={sales.length}
                    columns={7}
                    emptyMessage={t("empty")}
                />
            </DataTable>
        </div>
    )
}
