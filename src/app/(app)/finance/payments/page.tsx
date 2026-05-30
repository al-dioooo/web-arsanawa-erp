"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { SelectDescription } from "@/components/ui/select-description"
import { useSession } from "@/features/auth/session-provider"
import { usePayments } from "@/features/finance/api-payments"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function PaymentsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    // Fetch only outgoing payments for the Pembayaran screen
    const { data: payments = [], isLoading } = usePayments(activeCompanyId, 'outgoing')

    return (
        <div className="w-full">
            <PageHeader
                title="Payments (Pembayaran Vendor)"
                primaryAction={{
                    label: "+ New Payment",
                    onClick: () => router.push('/finance/payments/new')
                }}
            />

            <FilterBar>
                <div className="flex gap-2">
                    <SelectDescription
                        label="Status"
                        defaultValue=""
                        options={[
                            { value: "", label: "All Statuses", description: "Show payments in every posting state." },
                            { value: "draft", label: "Draft", description: "Payments that are still being prepared." },
                            { value: "posted", label: "Posted", description: "Payments posted to the ledger." },
                            { value: "void", label: "Void", description: "Payments canceled after creation." },
                        ]}
                    />
                </div>
            </FilterBar>

            <DataTable columns={["Payment No.", "Vendor", "Date", "Bank/Cash", "Amount", "Status"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            Loading payments...
                        </td>
                    </tr>
                )}
                {!isLoading && payments.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            No outgoing payments found. Create one to get started.
                        </td>
                    </tr>
                )}
                {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4">
                            <Link href={`/finance/payments/${payment.id}`} className="font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                                {payment.payment_number}
                            </Link>
                        </td>
                        <td className="px-6 py-4 text-navy-900">{payment.partner?.name || `Vendor #${payment.partner_id}`}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(payment.payment_date)}</td>
                        <td className="px-6 py-4 text-navy-700">{payment.account?.name || `Account #${payment.account_id}`}</td>
                        <td className="px-6 py-4 font-medium text-rose-600 text-right">{formatIDR(parseFloat(payment.amount))}</td>
                        <td className="px-6 py-4">
                            <StatusBadge status={payment.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
