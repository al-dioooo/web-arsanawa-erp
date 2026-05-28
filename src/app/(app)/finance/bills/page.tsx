"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { useBills } from "@/features/finance/api-bills"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function BillsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const { data: bills = [], isLoading } = useBills(activeCompanyId)

    return (
        <div className="w-full">
            <PageHeader
                title="Bills (Tagihan Vendor)"
                primaryAction={{
                    label: "+ New Bill",
                    onClick: () => router.push('/finance/bills/new')
                }}
            />

            <FilterBar>
                <div className="flex gap-2">
                    <select className="text-sm border-navy-200 rounded-lg px-3 py-1.5 bg-white text-navy-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow">
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="posted">Posted</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
            </FilterBar>

            <DataTable columns={["Bill Number", "Vendor", "Date", "Due Date", "Total", "Status"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            Loading bills...
                        </td>
                    </tr>
                )}
                {!isLoading && bills.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            No bills found. Create one to get started.
                        </td>
                    </tr>
                )}
                {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4">
                            <Link href={`/finance/bills/${bill.id}`} className="font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                                {bill.bill_number}
                            </Link>
                        </td>
                        <td className="px-6 py-4 text-navy-900">{bill.partner?.name || `Vendor #${bill.partner_id}`}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(bill.bill_date)}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(bill.due_date)}</td>
                        <td className="px-6 py-4 font-medium text-navy-900 text-right">{formatIDR(parseFloat(bill.total))}</td>
                        <td className="px-6 py-4">
                            <StatusBadge status={bill.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
