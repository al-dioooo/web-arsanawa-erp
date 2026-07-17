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
import { usePayments, type PaymentFilters } from "@/features/finance/api-payments"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function PaymentsPage() {
    const router = useRouter()
    const t = useTranslations("finance.payments")
    const rootT = useTranslations()
    const { activeCompanyId } = useSession()
    const [filters, setFilters] = useState<PaymentFilters>({ payment_type: "outbound" })
    const { data: payments = [], isLoading, isError, error, refetch } = usePayments(activeCompanyId, filters)
    const hasFilters = Boolean(filters.status || filters.start_date || filters.end_date)

    return (
        <div className="w-full">
            <PageHeader
                title={t("title")}
                primaryAction={{
                    label: t("new"),
                    icon: "add",
                    onClick: () => router.push('/finance/payments/new')
                }}
            />

            <FilterBar>
                <div className="flex w-full flex-wrap items-end gap-3">
                    <SelectDescription
                        label={t("filters.status.label")}
                        value={filters.status ?? ""}
                        onChange={(event) => setFilters((current) => ({
                            ...current,
                            status: event.target.value as PaymentFilters["status"],
                        }))}
                        options={[
                            { value: "", label: t("filters.status.all"), description: t("filters.status.allDesc") },
                            { value: "draft", label: t("filters.status.draft"), description: t("filters.status.draftDesc") },
                            { value: "posted", label: t("filters.status.posted"), description: t("filters.status.postedDesc") },
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
                            onClick={() => setFilters({ payment_type: "outbound" })}
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
                    t("columns.account"),
                    { label: t("columns.amount"), align: "end" },
                    t("columns.status"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={payments.length}
                    columns={6}
                    emptyMessage={t("empty")}
                    onRetry={() => refetch()}
                />
                {payments.map((payment) => (
                    <tr key={payment.id}>
                        <td>
                            <Link href={`/finance/payments/${payment.id}`} className="font-semibold text-brand-ink hover:underline">
                                {payment.payment_number}
                            </Link>
                        </td>
                        <td className="text-ink">{payment.partner?.name || t("vendorFallback", { id: payment.partner_id })}</td>
                        <td className="text-ink-secondary">{formatDateID(payment.payment_date)}</td>
                        <td className="text-ink-secondary">{t("accountFallback", { id: payment.cash_account_id })}</td>
                        <td className="text-end font-medium text-error-strong tabular-nums">{formatIDR(parseFloat(payment.amount))}</td>
                        <td>
                            <StatusBadge status={payment.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
