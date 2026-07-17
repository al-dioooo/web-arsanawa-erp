"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { TableStateRow } from "@/features/finance/components/table-state-row"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { SelectDescription } from "@/components/ui/select-description"
import { useSession } from "@/features/auth/session-provider"
import { useBills, type BillFilters } from "@/features/finance/api-bills"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function BillsPage() {
    const router = useRouter()
    const t = useTranslations("finance.bills")
    const rootT = useTranslations()
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<BillFilters>({})
    const { data: bills = [], isLoading, isError, error, refetch } = useBills(activeCompanyId, filters)
    const hasFilters = Boolean(filters.status || filters.start_date || filters.end_date)

    return (
        <div className="w-full">
            <PageHeader
                title={t("title")}
                primaryAction={{
                    label: t("new"),
                    icon: "add",
                    onClick: () => router.push('/finance/bills/new')
                }}
            />

            <FilterBar>
                <div className="flex w-full flex-wrap items-end gap-3">
                    <SelectDescription
                        label={t("filters.status.label")}
                        value={filters.status ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            status: event.target.value as BillFilters["status"],
                        }))}
                        options={[
                            { value: "", label: t("filters.status.all"), description: t("filters.status.allDesc") },
                            { value: "draft", label: t("filters.status.draft"), description: t("filters.status.draftDesc") },
                            { value: "posted", label: t("filters.status.posted"), description: t("filters.status.postedDesc") },
                            { value: "partially_paid", label: t("filters.status.partiallyPaid"), description: t("filters.status.partiallyPaidDesc") },
                            { value: "paid", label: t("filters.status.paid"), description: t("filters.status.paidDesc") },
                            { value: "void", label: t("filters.status.void"), description: t("filters.status.voidDesc") },
                        ]}
                    />
                    <InputDate
                        label={t("filters.from")}
                        value={filters.start_date ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            start_date: event.target.value,
                        }))}
                    />
                    <InputDate
                        label={t("filters.to")}
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
                            {rootT("common.clear")}
                        </Button>
                    ) : null}
                </div>
            </FilterBar>

            <DataTable
                columns={[
                    t("columns.number"),
                    t("columns.vendor"),
                    t("columns.date"),
                    t("columns.dueDate"),
                    { label: t("columns.total"), align: "end" },
                    t("columns.status"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={bills.length}
                    columns={6}
                    emptyMessage={t("empty")}
                    onRetry={() => refetch()}
                />
                {bills.map((bill) => (
                    <tr key={bill.id}>
                        <td>
                            <Link href={`/finance/bills/${bill.id}`} className="font-semibold text-brand-ink hover:underline">
                                {bill.bill_number}
                            </Link>
                        </td>
                        <td className="text-ink">{bill.partner?.name || t("vendorFallback", { id: bill.partner_id })}</td>
                        <td className="text-ink-secondary">{formatDateID(bill.bill_date)}</td>
                        <td className="text-ink-secondary">{formatDateID(bill.due_date)}</td>
                        <td className="text-end font-medium text-ink tabular-nums">{formatIDR(parseFloat(bill.total))}</td>
                        <td>
                            <StatusBadge status={bill.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
