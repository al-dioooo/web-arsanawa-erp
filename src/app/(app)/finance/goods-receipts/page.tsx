"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { useSession } from "@/features/auth/session-provider"
import { useGoodsReceipts, type StockReceipt } from "@/features/finance/api-goods-receipt"
import { formatDateID } from "@/lib/format"

export default function GoodsReceiptsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    
    // Fetch goods receipts (bridged from Inventory module)
    const { data: receipts = [], isLoading } = useGoodsReceipts(activeCompanyId)

    return (
        <div className="w-full">
            <PageHeader
                title="Penerimaan Bahan Baku (STB)"
                primaryAction={{
                    label: "+ STB Baru",
                    // Routes to Inventory module stock receipt for now
                    onClick: () => router.push('/inventory/stock/receipts/new')
                }}
            />

            <FilterBar>
                <div className="flex gap-2">
                    <select className="text-sm border-navy-200 rounded-lg px-3 py-1.5 bg-white text-navy-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow">
                        <option value="">All Statuses</option>
                        <option value="received">Received</option>
                        <option value="processed">Processed</option>
                    </select>
                </div>
            </FilterBar>

            <DataTable columns={["No. STB", "Tanggal", "Supplier", "No. SJ", "Item Count", "Status", "No. Invoice"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-navy-500">
                            Loading goods receipts from inventory...
                        </td>
                    </tr>
                )}
                {!isLoading && receipts.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-navy-500">
                            No goods receipts found. Create one in the Inventory module.
                        </td>
                    </tr>
                )}
                {receipts.map((receipt: StockReceipt) => (
                    <tr key={receipt.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-navy-900">{receipt.reference_number || `STB-${receipt.id}`}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(receipt.received_at || receipt.created_at || new Date().toISOString())}</td>
                        <td className="px-6 py-4 text-navy-900">{receipt.partner?.name || '-'}</td>
                        <td className="px-6 py-4 text-navy-700">{receipt.lot_number || '-'}</td>
                        <td className="px-6 py-4 text-navy-700 text-center">{receipt.item_count || '-'}</td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 capitalize">
                                {receipt.status || 'received'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-navy-400 italic">
                            Pending AP Link
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
