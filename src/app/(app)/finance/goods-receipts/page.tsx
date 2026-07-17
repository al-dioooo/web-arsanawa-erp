"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { TableStateRow } from "@/features/finance/components/table-state-row"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { SelectDescription } from "@/components/ui/select-description"
import { useSession } from "@/features/auth/session-provider"
import { useGoodsReceipts, type GoodsReceipt, type GoodsReceiptFilters } from "@/features/finance/api-goods-receipt"
import { formatDateID, formatIDR } from "@/lib/format"

export default function GoodsReceiptsPage() {
    const router = useRouter()
    const t = useTranslations("finance.goodsReceipts")
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<GoodsReceiptFilters>({})

    // Goods receipts are modelled in the Inventory module (they create stock
    // receipt movements) and surfaced here under the Finance nav.
    const { data: receipts = [], isLoading, isError, error, refetch } = useGoodsReceipts(activeCompanyId, filters)

    return (
        <div className="w-full">
            <PageHeader
                title={t("title")}
                primaryAction={{
                    label: t("new"),
                    icon: "add",
                    // Routes to the Inventory module stock receipt capture flow.
                    onClick: () => router.push('/inventory/stock/receipts/new')
                }}
            />

            <FilterBar>
                <div className="flex gap-2">
                    <SelectDescription
                        label={t("filters.status.label")}
                        value={filters.status ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            status: event.target.value as GoodsReceiptFilters["status"],
                        }))}
                        options={[
                            { value: "", label: t("filters.status.all"), description: t("filters.status.allDesc") },
                            { value: "received", label: t("filters.status.received"), description: t("filters.status.receivedDesc") },
                            { value: "completed", label: t("filters.status.completed"), description: t("filters.status.completedDesc") },
                            { value: "void", label: t("filters.status.void"), description: t("filters.status.voidDesc") },
                        ]}
                    />
                </div>
            </FilterBar>

            <DataTable
                columns={[
                    t("columns.number"),
                    t("columns.date"),
                    t("columns.supplier"),
                    t("columns.deliveryNote"),
                    t("columns.itemCount"),
                    { label: t("columns.total"), align: "end" },
                    t("columns.status"),
                    t("columns.bill"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={receipts.length}
                    columns={8}
                    emptyMessage={t("empty")}
                    onRetry={() => refetch()}
                />
                {receipts.map((receipt: GoodsReceipt) => (
                    <tr key={receipt.id}>
                        <td className="font-semibold text-ink">{receipt.receipt_number}</td>
                        <td className="text-ink-secondary">{formatDateID(receipt.receipt_date)}</td>
                        <td className="text-ink">{receipt.partner?.name || t("supplierFallback", { id: receipt.partner_id })}</td>
                        <td className="text-ink-secondary">{receipt.delivery_note_number || '-'}</td>
                        <td className="text-center text-ink-secondary">{receipt.item_count ?? receipt.lines?.length ?? '-'}</td>
                        <td className="text-end font-medium text-ink tabular-nums">{formatIDR(parseFloat(receipt.total_cost))}</td>
                        <td>
                            <StatusBadge status={receipt.status} />
                        </td>
                        <td className="text-ink-faint italic">
                            {receipt.bill_id ? t("billRef", { id: receipt.bill_id }) : t("pendingApLink")}
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
