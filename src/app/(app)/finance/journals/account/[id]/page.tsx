"use client"

import Link from "next/link"
import { use, useState } from "react"
import { useTranslations } from "next-intl"

import { Card, CardLabel } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { FilterBar } from "@/components/ui/filter-bar"
import { PageHeader } from "@/components/ui/page-header"
import { SelectDescription } from "@/components/ui/select-description"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { usePeriods } from "@/features/finance/api"
import { useAccountLedger } from "@/features/finance/api-journals"
import { formatIDR, formatDateID } from "@/lib/format"

export default function AccountLedgerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { activeCompanyId } = useSession()
    const t = useTranslations("finance.journals.ledger")
    const tCommon = useTranslations("common")

    const { data: periods = [] } = usePeriods(activeCompanyId)
    const [periodIdState, setPeriodIdState] = useState<number | null>(null)
    const selectedPeriodId = periodIdState ?? periods[0]?.id ?? null

    const accountId = parseInt(id)
    const { data: report, isLoading } = useAccountLedger(
        activeCompanyId,
        accountId || null,
        selectedPeriodId,
    )

    const ledgerLines = report?.ledger || []
    const account = report?.account

    const totalDebit = ledgerLines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = ledgerLines.reduce((sum, line) => sum + (line.credit || 0), 0)
    const endingBalance = ledgerLines.length > 0 ? ledgerLines[ledgerLines.length - 1].balance : 0

    return (
        <div className="w-full">
            <PageHeader
                backHref="/finance/journals"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title", {
                    account: account
                        ? `${account.code} - ${account.name}`
                        : t("accountFallback", { id }),
                })}
                subtitle={
                    account
                        ? t("subtitle", {
                              balance: account.normal_balance.toUpperCase(),
                              type: account.type.toUpperCase(),
                          })
                        : ""
                }
            />

            <FilterBar>
                <SelectDescription
                    label={t("periodLabel")}
                    value={selectedPeriodId || ""}
                    onChange={(e) => setPeriodIdState(Number(e.target.value) || null)}
                    options={[
                        {
                            value: "",
                            label: t("periodPlaceholder"),
                            description: t("periodPlaceholderDescription"),
                        },
                        ...periods.map((p) => ({
                            value: p.id,
                            label: p.name,
                            description: `${formatDateID(p.start_date)} - ${formatDateID(p.end_date)}`,
                        })),
                    ]}
                />
            </FilterBar>

            {/* Summaries */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card padding="sm">
                    <CardLabel className="mb-1">{t("normalBalance")}</CardLabel>
                    <div className="text-lg font-bold text-ink capitalize">
                        {account?.normal_balance || "-"}
                    </div>
                </Card>
                <Card padding="sm">
                    <CardLabel className="mb-1">{t("totalDebit")}</CardLabel>
                    <div className="text-lg font-bold text-brand-ink tabular-nums">
                        {formatIDR(totalDebit)}
                    </div>
                </Card>
                <Card padding="sm">
                    <CardLabel className="mb-1">{t("totalCredit")}</CardLabel>
                    <div className="text-lg font-bold text-error-strong tabular-nums">
                        {formatIDR(totalCredit)}
                    </div>
                </Card>
                <Card padding="sm">
                    <CardLabel className="mb-1 text-brand-ink">{t("endingBalance")}</CardLabel>
                    <div className="text-lg font-bold text-brand-ink tabular-nums">
                        {formatIDR(endingBalance)}
                    </div>
                </Card>
            </div>

            <DataTable
                columns={[
                    t("columns.date"),
                    t("columns.reference"),
                    t("columns.description"),
                    { label: t("columns.debit"), align: "end" },
                    { label: t("columns.credit"), align: "end" },
                    { label: t("columns.balance"), align: "end" },
                ]}
                loading={isLoading}
            >
                <TableStateRow
                    isLoading={isLoading}
                    count={ledgerLines.length}
                    columns={6}
                    emptyMessage={t("empty")}
                />
                {ledgerLines.map((line, idx) => (
                    <tr key={idx}>
                        <td>{formatDateID(line.entry_date)}</td>
                        <td>
                            <Link
                                href={`/finance/journals/${line.journal_entry_id}`}
                                className="font-semibold text-brand-ink hover:underline"
                            >
                                {line.entry_number}
                            </Link>
                        </td>
                        <td className="text-ink">{line.description}</td>
                        <td className="text-end tabular-nums">
                            {line.debit > 0 ? formatIDR(line.debit) : "-"}
                        </td>
                        <td className="text-end tabular-nums">
                            {line.credit > 0 ? formatIDR(line.credit) : "-"}
                        </td>
                        <td className="text-end font-semibold text-ink tabular-nums">
                            {formatIDR(line.balance)}
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
