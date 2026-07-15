"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { TableStateRow } from "@/features/finance/components/table-state-row"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { useInvoices, type InvoiceFilters } from "@/features/finance/api-invoices"
import { formatIDR, formatDateID } from "@/lib/format"
import { Icon } from "@/components/ui/icon"

export default function InvoicesPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<InvoiceFilters>({})
    const { data: invoices = [], isLoading, isError, error, refetch } = useInvoices(activeCompanyId, filters)
    const hasFilters = Boolean(filters.start_date || filters.end_date)

    return (
        <div className="w-full">
            <PageHeader
                title="Sales Invoices"
                primaryAction={{
                    label: "+ New Invoice",
                    onClick: () => router.push("/finance/invoices/new")
                }}
            />

            <FilterBar>
                <div className="flex w-full flex-wrap items-end gap-3">
                    <InputDate
                        label="Invoice Date From"
                        aria-label="Invoice date from"
                        value={filters.start_date ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            start_date: event.target.value,
                        }))}
                    />
                    <InputDate
                        label="Invoice Date To"
                        aria-label="Invoice date to"
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
                            onClick={() => setFilters({})}
                        >
                            Clear
                        </Button>
                    ) : null}
                </div>
            </FilterBar>

            <DataTable columns={["Invoice Number", "Customer", "Date", "Due Date", "Total", "Status"]}>
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={invoices.length}
                    columns={6}
                    emptyMessage="No invoices found. Create one to get started."
                    loadingMessage="Loading invoices..."
                    onRetry={() => refetch()}
                />
                {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-navy-50/50 transition-colors group">
                        <td className="px-6 py-4">
                            <Link href={`/finance/invoices/${invoice.id}`} className="font-semibold text-teal-700 hover:underline inline-flex items-center gap-1.5">
                                {invoice.invoice_number}
                                <Icon name="open_in_new" className="text-[12px] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        </td>
                        <td className="px-6 py-4 font-semibold text-navy-900">
                            {invoice.partner?.name || `Customer #${invoice.partner_id}`}
                        </td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(invoice.invoice_date)}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(invoice.due_date)}</td>
                        <td className="px-6 py-4 text-navy-900 font-bold">{formatIDR(parseFloat(invoice.total))}</td>
                        <td className="px-6 py-4">
                            <StatusBadge status={invoice.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
