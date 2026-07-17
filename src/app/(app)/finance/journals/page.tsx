"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { TableStateRow } from "@/features/finance/components/table-state-row"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { SelectDescription } from "@/components/ui/select-description"
import { useSession } from "@/features/auth/session-provider"
import { useJournalEntries } from "@/features/finance/api-journals"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function JournalsPage() {
    const router = useRouter()
    const t = useTranslations("finance.journals")
    const { activeCompanyId } = useSession()
    const [statusFilter, setStatusFilter] = useState<string>("")

    const { data: journalEntries = [], isLoading, isError, error, refetch } = useJournalEntries(activeCompanyId, {
        status: statusFilter || undefined
    })

    const calculateTotal = (lines: { debit: number }[] = []) => {
        return lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    }

    return (
        <div className="w-full">
            <PageHeader
                title={t("title")}
                primaryAction={{
                    label: t("new"),
                    icon: "add",
                    onClick: () => router.push('/finance/journals/new')
                }}
            />

            <FilterBar>
                <div className="flex gap-2">
                    <SelectDescription
                        label={t("filters.status.label")}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[
                            { value: "", label: t("filters.status.all"), description: t("filters.status.allDesc") },
                            { value: "draft", label: t("filters.status.draft"), description: t("filters.status.draftDesc") },
                            { value: "posted", label: t("filters.status.posted"), description: t("filters.status.postedDesc") },
                            { value: "void", label: t("filters.status.void"), description: t("filters.status.voidDesc") },
                        ]}
                    />
                </div>
            </FilterBar>

            <DataTable
                columns={[
                    t("columns.number"),
                    t("columns.date"),
                    t("columns.period"),
                    t("columns.description"),
                    { label: t("columns.totalDebit"), align: "end" },
                    t("columns.status"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={journalEntries.length}
                    columns={6}
                    emptyMessage={t("empty")}
                    onRetry={() => refetch()}
                />
                {journalEntries.map((entry) => (
                    <tr key={entry.id}>
                        <td>
                            <Link href={`/finance/journals/${entry.id}`} className="font-semibold text-brand-ink hover:underline">
                                {entry.entry_number || `JE-${entry.id}`}
                            </Link>
                        </td>
                        <td className="text-ink-secondary">{formatDateID(entry.entry_date)}</td>
                        <td className="text-ink-secondary">{entry.period?.name || t("periodFallback", { id: entry.accounting_period_id })}</td>
                        <td className="max-w-xs truncate text-ink">{entry.description || "-"}</td>
                        <td className="text-end font-medium text-ink tabular-nums">{formatIDR(calculateTotal(entry.lines))}</td>
                        <td>
                            <StatusBadge status={entry.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
