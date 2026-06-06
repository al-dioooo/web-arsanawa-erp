"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { SelectDescription } from "@/components/ui/select-description"
import { useSession } from "@/features/auth/session-provider"
import { usePayments, type PaymentFilters } from "@/features/finance/api-payments"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function PaymentsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<PaymentFilters>({ payment_type: "outbound" })
    const { data: payments = [], isLoading } = usePayments(activeCompanyId, filters)
    const hasFilters = Boolean(filters.status || filters.start_date || filters.end_date)

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
                <div className="flex w-full flex-wrap items-end gap-3">
                    <SelectDescription
                        label="Status"
                        value={filters.status ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            status: event.target.value as PaymentFilters["status"],
                        }))}
                        options={[
                            { value: "", label: "All Statuses", description: "Show payments in every posting state." },
                            { value: "draft", label: "Draft", description: "Payments that are still being prepared." },
                            { value: "posted", label: "Posted", description: "Payments posted to the ledger." },
                            { value: "void", label: "Void", description: "Payments canceled after creation." },
                        ]}
                    />
                    <InputDate
                        label="Payment Date From"
                        aria-label="Payment date from"
                        value={filters.start_date ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            start_date: event.target.value,
                        }))}
                    />
                    <InputDate
                        label="Payment Date To"
                        aria-label="Payment date to"
                        value={filters.end_date ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            end_date: event.target.value,
                        }))}
                    />
                    {hasFilters ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFilters({ payment_type: "outbound" })}
                        >
                            Clear
                        </Button>
                    ) : null}
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
                        <td className="px-6 py-4 text-navy-700">{`Account #${payment.cash_account_id}`}</td>
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
