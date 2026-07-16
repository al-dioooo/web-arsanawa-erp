"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
                title="Buku Jurnal (Journal Entries)"
                primaryAction={{
                    label: "+ New Journal Entry",
                    onClick: () => router.push('/finance/journals/new')
                }}
            />

            <FilterBar>
                <div className="flex gap-2">
                    <SelectDescription
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[
                            { value: "", label: "All Statuses", description: "Show journals in every posting state." },
                            { value: "draft", label: "Draft", description: "Entries still open for editing." },
                            { value: "posted", label: "Posted", description: "Entries locked into the ledger." },
                            { value: "void", label: "Void", description: "Entries canceled after creation." },
                        ]}
                    />
                </div>
            </FilterBar>

            <DataTable columns={["Journal Number", "Date", "Period", "Description", "Total Debit", "Status"]}>
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={journalEntries.length}
                    columns={6}
                    emptyMessage="No journal entries found."
                    onRetry={() => refetch()}
                />
                {journalEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4">
                            <Link href={`/finance/journals/${entry.id}`} className="font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                                {entry.entry_number || `JE-${entry.id}`}
                            </Link>
                        </td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(entry.entry_date)}</td>
                        <td className="px-6 py-4 text-navy-700">{entry.period?.name || `Period #${entry.accounting_period_id}`}</td>
                        <td className="px-6 py-4 text-navy-900 truncate max-w-xs">{entry.description || "-"}</td>
                        <td className="px-6 py-4 font-medium text-navy-900 text-right">{formatIDR(calculateTotal(entry.lines))}</td>
                        <td className="px-6 py-4">
                            <StatusBadge status={entry.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
