"use client"

import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { useSession } from "@/features/auth/session-provider"
import { useAPAging } from "@/features/finance/api-bills"
import { formatIDR } from "@/lib/format"
import { Icon } from "@/components/ui/icon"

export default function APAgingPage() {
    const { activeCompanyId } = useSession()
    const { data: agingData = [], isLoading } = useAPAging(activeCompanyId)

    // Calculate totals for the footer
    const totals = agingData.reduce((acc, row) => {
        acc.current += parseFloat(row.current)
        acc.days_1_30 += parseFloat(row.days_1_30)
        acc.days_31_60 += parseFloat(row.days_31_60)
        acc.days_61_90 += parseFloat(row.days_61_90)
        acc.over_90 += parseFloat(row.over_90)
        acc.total += parseFloat(row.total)
        return acc
    }, { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0 })

    return (
        <div className="w-full">
            <PageHeader
                title="Accounts Payable Aging"
            />

            <FilterBar>
                <div className="flex-1 text-sm text-navy-500">
                    Track outstanding vendor balances (Hutang Usaha) categorized by how long they have been overdue.
                </div>
            </FilterBar>

            <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 mb-6 flex items-start gap-4">
                <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                    <Icon name="account_balance_wallet" className="text-3xl" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-navy-900 mb-1">Total Outstanding Payable</h3>
                    <p className="text-3xl font-bold text-rose-600">{formatIDR(totals.total)}</p>
                    <p className="text-sm text-navy-500 mt-1">
                        <span className="font-semibold text-rose-500">{formatIDR(totals.days_1_30 + totals.days_31_60 + totals.days_61_90 + totals.over_90)}</span> is currently overdue.
                    </p>
                </div>
            </div>

            <DataTable columns={["Vendor", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "> 90 Days", "Total Balance"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-navy-500">
                            Loading aging report...
                        </td>
                    </tr>
                )}
                {!isLoading && agingData.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-navy-500">
                            No outstanding accounts payable found.
                        </td>
                    </tr>
                )}
                {agingData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-navy-900">{row.partner_name}</td>
                        <td className="px-6 py-4 text-navy-900 font-medium text-right">{formatIDR(parseFloat(row.current))}</td>
                        <td className="px-6 py-4 text-orange-600 font-medium text-right">{formatIDR(parseFloat(row.days_1_30))}</td>
                        <td className="px-6 py-4 text-rose-500 font-medium text-right">{formatIDR(parseFloat(row.days_31_60))}</td>
                        <td className="px-6 py-4 text-rose-600 font-medium text-right">{formatIDR(parseFloat(row.days_61_90))}</td>
                        <td className="px-6 py-4 text-rose-700 font-bold text-right">{formatIDR(parseFloat(row.over_90))}</td>
                        <td className="px-6 py-4 text-navy-900 font-bold text-right bg-navy-50/30">{formatIDR(parseFloat(row.total))}</td>
                    </tr>
                ))}
                {!isLoading && agingData.length > 0 && (
                    <tr className="bg-navy-50 border-t-2 border-navy-200">
                        <td className="px-6 py-4 font-bold text-navy-900 text-right uppercase text-xs tracking-wider">Grand Total</td>
                        <td className="px-6 py-4 font-bold text-navy-900 text-right">{formatIDR(totals.current)}</td>
                        <td className="px-6 py-4 font-bold text-orange-600 text-right">{formatIDR(totals.days_1_30)}</td>
                        <td className="px-6 py-4 font-bold text-rose-500 text-right">{formatIDR(totals.days_31_60)}</td>
                        <td className="px-6 py-4 font-bold text-rose-600 text-right">{formatIDR(totals.days_61_90)}</td>
                        <td className="px-6 py-4 font-bold text-rose-700 text-right">{formatIDR(totals.over_90)}</td>
                        <td className="px-6 py-4 font-bold text-navy-900 text-right">{formatIDR(totals.total)}</td>
                    </tr>
                )}
            </DataTable>
        </div>
    )
}
