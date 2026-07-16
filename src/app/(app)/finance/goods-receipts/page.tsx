"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<GoodsReceiptFilters>({})

    // Goods receipts are modelled in the Inventory module (they create stock
    // receipt movements) and surfaced here under the Finance nav.
    const { data: receipts = [], isLoading, isError, error, refetch } = useGoodsReceipts(activeCompanyId, filters)

    return (
        <div className="w-full">
            <PageHeader
                title="Penerimaan Bahan Baku (STB)"
                primaryAction={{
                    label: "+ STB Baru",
                    // Routes to the Inventory module stock receipt capture flow.
                    onClick: () => router.push('/inventory/stock/receipts/new')
                }}
            />

            <FilterBar>
                <div className="flex gap-2">
                    <SelectDescription
                        label="Status"
                        value={filters.status ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            status: event.target.value as GoodsReceiptFilters["status"],
                        }))}
                        options={[
                            { value: "", label: "All Statuses", description: "Show receipts regardless of processing state." },
                            { value: "received", label: "Received", description: "Goods have been received into stock." },
                            { value: "completed", label: "Completed", description: "Receipt is fully processed downstream." },
                            { value: "void", label: "Void", description: "Receipt was cancelled after creation." },
                        ]}
                    />
                </div>
            </FilterBar>

            <DataTable columns={["No. STB", "Tanggal", "Supplier", "No. SJ", "Item Count", "Total", "Status", "No. Invoice"]}>
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={receipts.length}
                    columns={8}
                    emptyMessage="No goods receipts found. Create one to get started."
                    onRetry={() => refetch()}
                />
                {receipts.map((receipt: GoodsReceipt) => (
                    <tr key={receipt.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-navy-900">{receipt.receipt_number}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(receipt.receipt_date)}</td>
                        <td className="px-6 py-4 text-navy-900">{receipt.partner?.name || `Supplier #${receipt.partner_id}`}</td>
                        <td className="px-6 py-4 text-navy-700">{receipt.delivery_note_number || '-'}</td>
                        <td className="px-6 py-4 text-navy-700 text-center">{receipt.item_count ?? receipt.lines?.length ?? '-'}</td>
                        <td className="px-6 py-4 font-medium text-navy-900 text-right">{formatIDR(parseFloat(receipt.total_cost))}</td>
                        <td className="px-6 py-4">
                            <StatusBadge status={receipt.status} />
                        </td>
                        <td className="px-6 py-4 text-navy-400 italic">
                            {receipt.bill_id ? `Bill #${receipt.bill_id}` : 'Pending AP Link'}
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
