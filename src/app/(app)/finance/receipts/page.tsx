"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { TableStateRow } from "@/features/finance/components/table-state-row"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { SelectDescription } from "@/components/ui/select-description"
import { useSession } from "@/features/auth/session-provider"
import { usePayments, type PaymentFilters } from "@/features/finance/api-payments"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function ReceiptsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<PaymentFilters>({ payment_type: "inbound" })
    const { data: receipts = [], isLoading, isError, error, refetch } = usePayments(activeCompanyId, filters)
    const hasFilters = Boolean(filters.status || filters.start_date || filters.end_date)

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
                <div className="flex w-full flex-wrap items-end gap-3">
                    <SelectDescription
                        label="Status"
                        value={filters.status ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            status: event.target.value as PaymentFilters["status"],
                        }))}
                        options={[
                            { value: "", label: "All Statuses", description: "Show receipts in every posting state." },
                            { value: "draft", label: "Draft", description: "Receipts that are still being prepared." },
                            { value: "posted", label: "Posted", description: "Receipts posted to the ledger." },
                            { value: "void", label: "Void", description: "Receipts canceled after creation." },
                        ]}
                    />
                    <InputDate
                        label="Receipt Date From"
                        aria-label="Receipt date from"
                        value={filters.start_date ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            start_date: event.target.value,
                        }))}
                    />
                    <InputDate
                        label="Receipt Date To"
                        aria-label="Receipt date to"
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
                            onClick={() => setFilters({ payment_type: "inbound" })}
                        >
                            Clear
                        </Button>
                    ) : null}
                </div>
            </FilterBar>

            <DataTable columns={["Receipt No.", "Customer", "Date", "Bank/Cash", "Amount", "Status"]}>
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={receipts.length}
                    columns={6}
                    emptyMessage="No incoming receipts found. Create one to get started."
                    loadingMessage="Loading receipts..."
                    onRetry={() => refetch()}
                />
                {receipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4">
                            <Link href={`/finance/payments/${receipt.id}`} className="font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                                {receipt.payment_number}
                            </Link>
                        </td>
                        <td className="px-6 py-4 text-navy-900">{receipt.partner?.name || `Customer #${receipt.partner_id}`}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(receipt.payment_date)}</td>
                        <td className="px-6 py-4 text-navy-700">{`Account #${receipt.cash_account_id}`}</td>
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
