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
import { useBills, type BillFilters } from "@/features/finance/api-bills"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function BillsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<BillFilters>({})
    const { data: bills = [], isLoading } = useBills(activeCompanyId, filters)
    const hasFilters = Boolean(filters.status || filters.start_date || filters.end_date)

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
                <div className="flex w-full flex-wrap items-end gap-3">
                    <SelectDescription
                        label="Status"
                        value={filters.status ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            status: event.target.value as BillFilters["status"],
                        }))}
                        options={[
                            { value: "", label: "All Statuses", description: "Show bills in every posting state." },
                            { value: "draft", label: "Draft", description: "Bills that are still being prepared." },
                            { value: "posted", label: "Posted", description: "Bills posted and waiting for settlement." },
                            { value: "partially_paid", label: "Partially Paid", description: "Bills with remaining outstanding balances." },
                            { value: "paid", label: "Paid", description: "Bills fully settled by outgoing payments." },
                            { value: "void", label: "Void", description: "Bills canceled after creation." },
                        ]}
                    />
                    <InputDate
                        label="Bill Date From"
                        aria-label="Bill date from"
                        value={filters.start_date ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            start_date: event.target.value,
                        }))}
                    />
                    <InputDate
                        label="Bill Date To"
                        aria-label="Bill date to"
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
