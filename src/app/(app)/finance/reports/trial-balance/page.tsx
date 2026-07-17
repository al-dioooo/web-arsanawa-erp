"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { TableStateRow } from "@/features/finance/components/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { useTrialBalance } from "@/features/finance/api-journals"
import { usePeriods } from "@/features/finance/api"
import { formatIDR, formatDateID } from "@/lib/format"
import { Icon } from "@/components/ui/icon"
import { SelectDescription } from "@/components/ui/select-description"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function TrialBalancePage() {
    const t = useTranslations("finance.trialBalance")
    const { activeCompanyId } = useSession()
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const [periodIdState, setPeriodIdState] = useState<number | null>(null)
    const selectedPeriodId = periodIdState ?? periods[0]?.id ?? null

    const { data: trialBalance = [], isLoading, isError, error, refetch } = useTrialBalance(
        activeCompanyId,
        selectedPeriodId
    )

    // Calculate grand totals
    const grandDebit = trialBalance.reduce((sum, item) => sum + (Number(item.debit) || 0), 0)
    const grandCredit = trialBalance.reduce((sum, item) => sum + (Number(item.credit) || 0), 0)
    const isBalanced = grandDebit === grandCredit
    const difference = Math.abs(grandDebit - grandCredit)

    return (
        <div className="w-full">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
            />

            <FilterBar>
                <SelectDescription
                    label={t("period.label")}
                    value={selectedPeriodId || ""}
                    onChange={(e) => setPeriodIdState(Number(e.target.value) || null)}
                    options={[
                        { value: "", label: t("period.placeholder"), description: t("period.placeholderDesc") },
                        ...periods.map((p) => ({
                            value: p.id,
                            label: p.name,
                            description: `${formatDateID(p.start_date)} - ${formatDateID(p.end_date)}`,
                        })),
                    ]}
                />
            </FilterBar>

            {/* Verification Banner */}
            <div
                className={cn(
                    "mb-6 flex items-center justify-between gap-4 rounded-lg p-4 transition-colors",
                    isBalanced
                        ? "bg-success-soft text-success-strong"
                        : "bg-error-soft text-error-strong",
                )}
            >
                <div className="flex items-center gap-3">
                    <Icon name={isBalanced ? "check_circle" : "error"} size={24} className="shrink-0" />
                    <div>
                        <p className="text-sm font-bold">
                            {isBalanced ? t("balanced") : t("unbalanced")}
                        </p>
                        <p className="text-xs opacity-90">
                            {isBalanced
                                ? t("balancedHint")
                                : t("unbalancedHint", { difference: formatIDR(difference) })
                            }
                        </p>
                    </div>
                </div>
                <div className="text-end text-sm font-bold tabular-nums">
                    {formatIDR(grandDebit)} / {formatIDR(grandCredit)}
                </div>
            </div>

            <DataTable
                columns={[
                    t("columns.code"),
                    t("columns.name"),
                    t("columns.type"),
                    t("columns.normal"),
                    { label: t("columns.debit"), align: "end" },
                    { label: t("columns.credit"), align: "end" },
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={trialBalance.length}
                    columns={6}
                    emptyMessage={t("empty")}
                    onRetry={() => refetch()}
                />
                {trialBalance.map((item) => (
                    <tr key={item.account_id}>
                        <td className="font-semibold">
                            <Link href={`/finance/journals/account/${item.account_id}`} className="text-brand-ink hover:underline">
                                {item.code}
                            </Link>
                        </td>
                        <td>
                            <Link href={`/finance/journals/account/${item.account_id}`} className="font-medium text-ink transition-colors hover:text-brand-ink">
                                {item.name}
                            </Link>
                        </td>
                        <td className="text-ink-muted capitalize">{item.type}</td>
                        <td className="text-ink-muted capitalize">{item.normal_balance}</td>
                        <td className="text-end font-medium text-ink tabular-nums">
                            {Number(item.debit) > 0 ? formatIDR(Number(item.debit)) : "-"}
                        </td>
                        <td className="text-end font-medium text-ink tabular-nums">
                            {Number(item.credit) > 0 ? formatIDR(Number(item.credit)) : "-"}
                        </td>
                    </tr>
                ))}
                {trialBalance.length > 0 && (
                    <tr className="border-t border-line-strong bg-surface-muted/60 font-bold text-ink">
                        <td colSpan={4}>{t("grandTotal")}</td>
                        <td className="text-end tabular-nums">{formatIDR(grandDebit)}</td>
                        <td className="text-end tabular-nums">{formatIDR(grandCredit)}</td>
                    </tr>
                )}
            </DataTable>
        </div>
    )
}
