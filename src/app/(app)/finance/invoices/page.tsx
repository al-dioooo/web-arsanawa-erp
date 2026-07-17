"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { TableStateRow } from "@/components/ui/table-state-row"
import { StatusBadge } from "@/components/ui/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { useInvoices, type InvoiceFilters } from "@/features/finance/api-invoices"
import { formatIDR, formatDateID } from "@/lib/format"
import { Icon } from "@/components/ui/icon"

export default function InvoicesPage() {
    const router = useRouter()
    const t = useTranslations("finance.invoices")
    const rootT = useTranslations()
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<InvoiceFilters>({})
    const { data: invoices = [], isLoading, isError, error, refetch } = useInvoices(activeCompanyId, filters)
    const hasFilters = Boolean(filters.start_date || filters.end_date)

    return (
        <div className="w-full">
            <PageHeader
                title={t("title")}
                primaryAction={{
                    label: t("new"),
                    icon: "add",
                    onClick: () => router.push("/finance/invoices/new")
                }}
            />

            <FilterBar>
                <div className="flex w-full flex-wrap items-end gap-3">
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
                    t("columns.customer"),
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
                    count={invoices.length}
                    columns={6}
                    emptyMessage={t("empty")}
                    onRetry={() => refetch()}
                />
                {invoices.map((invoice) => (
                    <tr key={invoice.id} className="group">
                        <td>
                            <Link href={`/finance/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-ink hover:underline">
                                {invoice.invoice_number}
                                <Icon name="open_in_new" size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                            </Link>
                        </td>
                        <td className="font-semibold text-ink">
                            {invoice.partner?.name || t("customerFallback", { id: invoice.partner_id })}
                        </td>
                        <td className="text-ink-secondary">{formatDateID(invoice.invoice_date)}</td>
                        <td className="text-ink-secondary">{formatDateID(invoice.due_date)}</td>
                        <td className="text-end font-bold text-ink tabular-nums">{formatIDR(parseFloat(invoice.total))}</td>
                        <td>
                            <StatusBadge status={invoice.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
