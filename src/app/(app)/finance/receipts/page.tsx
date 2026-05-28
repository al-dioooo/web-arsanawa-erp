"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { usePayments } from "@/features/finance/api-payments"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function ReceiptsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    // Fetch only incoming payments for the Penerimaan screen
    const { data: receipts = [], isLoading } = usePayments(activeCompanyId, 'incoming')

    return (
        <div className="w-full">
            <PageHeader
                title="Receipts (Penerimaan)"
                primaryAction={{
                    label: "+ New Receipt",
                    onClick: () => router.push('/finance/receipts/new')
                }}
            />

            <FilterBar>
                <div className="flex gap-2">
                    <select className="text-sm border-navy-200 rounded-lg px-3 py-1.5 bg-white text-navy-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow">
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="posted">Posted</option>
                        <option value="void">Void</option>
                    </select>
                </div>
            </FilterBar>

            <DataTable columns={["Receipt No.", "Customer", "Date", "Bank/Cash", "Amount", "Status"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            Loading receipts...
                        </td>
                    </tr>
                )}
                {!isLoading && receipts.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            No incoming receipts found. Create one to get started.
                        </td>
                    </tr>
                )}
                {receipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4">
                            <Link href={`/finance/payments/${receipt.id}`} className="font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                                {receipt.payment_number}
                            </Link>
                        </td>
                        <td className="px-6 py-4 text-navy-900">{receipt.partner?.name || `Customer #${receipt.partner_id}`}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(receipt.payment_date)}</td>
                        <td className="px-6 py-4 text-navy-700">{receipt.account?.name || `Account #${receipt.account_id}`}</td>
                        <td className="px-6 py-4 font-medium text-teal-600 text-right">{formatIDR(parseFloat(receipt.amount))}</td>
                        <td className="px-6 py-4">
                            <StatusBadge status={receipt.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
