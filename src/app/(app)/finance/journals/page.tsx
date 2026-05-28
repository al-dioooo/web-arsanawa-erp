"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { useJournalEntries } from "@/features/finance/api-journals"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function JournalsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const [statusFilter, setStatusFilter] = useState<string>("")
    
    const { data: journalEntries = [], isLoading } = useJournalEntries(activeCompanyId, {
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
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm border border-navy-200 rounded-lg px-3 py-1.5 bg-white text-navy-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="posted">Posted</option>
                        <option value="void">Void</option>
                    </select>
                </div>
            </FilterBar>

            <DataTable columns={["Journal Number", "Date", "Period", "Description", "Total Debit", "Status"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            Loading journal entries...
                        </td>
                    </tr>
                )}
                {!isLoading && journalEntries.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            No journal entries found.
                        </td>
                    </tr>
                )}
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
