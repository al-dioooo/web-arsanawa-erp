"use client"

import { useTranslations } from "next-intl"
import { PageHeader } from "@/features/finance/components/page-header"
import { DataTable } from "@/components/ui/data-table"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { useARAging } from "@/features/finance/api-invoices"
import { formatIDR } from "@/lib/format"
import { Card } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"

export default function ARAgingPage() {
    const t = useTranslations("finance.ar")
    const { activeCompanyId } = useSession()
    const { data: agingData = [], isLoading, isError, error, refetch } = useARAging(activeCompanyId)

    // Calculate totals for the footer
    const totals = agingData.reduce((acc, row) => {
        acc.current += parseFloat(row.current)
        acc.days_1_30 += parseFloat(row.days_1_30)
        acc.days_31_60 += parseFloat(row.days_31_60)
        acc.days_61_90 += parseFloat(row.days_61_90)
        acc.over_90 += parseFloat(row.over_90)
        acc.total += parseFloat(row.total)
        return acc
    }, { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0 })

    const overdueTotal = totals.days_1_30 + totals.days_31_60 + totals.days_61_90 + totals.over_90

    return (
        <div className="w-full">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
            />

            <Card padding="lg" className="mb-6 flex items-start gap-4">
                <div className="rounded-md bg-brand-soft p-3 text-brand-ink">
                    <Icon name="insights" size={28} />
                </div>
                <div>
                    <h2 className="type-section mb-1">{t("totalOutstanding")}</h2>
                    <p className="type-card-value text-brand-ink tabular-nums">{formatIDR(totals.total)}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                        <span className="font-semibold text-error-strong">{formatIDR(overdueTotal)}</span> {t("overdueSuffix")}
                    </p>
                </div>
            </Card>

            <DataTable
                columns={[
                    t("columns.customer"),
                    { label: t("columns.current"), align: "end" },
                    { label: t("columns.d1_30"), align: "end" },
                    { label: t("columns.d31_60"), align: "end" },
                    { label: t("columns.d61_90"), align: "end" },
                    { label: t("columns.over90"), align: "end" },
                    { label: t("columns.total"), align: "end" },
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={agingData.length}
                    columns={7}
                    emptyMessage={t("empty")}
                    onRetry={() => refetch()}
                />
                {agingData.map((row, idx) => (
                    <tr key={idx}>
                        <td className="font-semibold text-ink">{row.partner_name}</td>
                        <td className="text-end font-medium text-ink tabular-nums">{formatIDR(parseFloat(row.current))}</td>
                        <td className="text-end font-medium text-warning-strong tabular-nums">{formatIDR(parseFloat(row.days_1_30))}</td>
                        <td className="text-end font-medium text-error-strong tabular-nums">{formatIDR(parseFloat(row.days_31_60))}</td>
                        <td className="text-end font-medium text-error-strong tabular-nums">{formatIDR(parseFloat(row.days_61_90))}</td>
                        <td className="text-end font-bold text-error-strong tabular-nums">{formatIDR(parseFloat(row.over_90))}</td>
                        <td className="bg-surface-muted/50 text-end font-bold text-ink tabular-nums">{formatIDR(parseFloat(row.total))}</td>
                    </tr>
                ))}
                {!isLoading && agingData.length > 0 && (
                    <tr className="border-t-2 border-line-strong bg-surface-muted">
                        <td className="type-card-label text-end uppercase tracking-wider">{t("grandTotal")}</td>
                        <td className="text-end font-bold text-ink tabular-nums">{formatIDR(totals.current)}</td>
                        <td className="text-end font-bold text-warning-strong tabular-nums">{formatIDR(totals.days_1_30)}</td>
                        <td className="text-end font-bold text-error-strong tabular-nums">{formatIDR(totals.days_31_60)}</td>
                        <td className="text-end font-bold text-error-strong tabular-nums">{formatIDR(totals.days_61_90)}</td>
                        <td className="text-end font-bold text-error-strong tabular-nums">{formatIDR(totals.over_90)}</td>
                        <td className="text-end font-bold text-ink tabular-nums">{formatIDR(totals.total)}</td>
                    </tr>
                )}
            </DataTable>
        </div>
    )
}
