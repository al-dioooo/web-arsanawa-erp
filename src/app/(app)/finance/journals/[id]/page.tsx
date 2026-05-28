"use client"

import { use } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { useJournalEntry, usePostJournalEntry, useVoidJournalEntry } from "@/features/finance/api-journals"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { formatIDR, formatDateID } from "@/lib/format"
import { toast } from "sonner"
import Link from "next/link"

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    
    const { data: journal, isLoading, refetch } = useJournalEntry(id)
    const postJournal = usePostJournalEntry()
    const voidJournal = useVoidJournalEntry()

    if (isLoading) {
        return <div className="p-8 text-center text-navy-500">Loading journal entry...</div>
    }

    if (!journal) {
        return <div className="p-8 text-center text-rose-500">Journal entry not found.</div>
    }

    const handlePost = () => {
        if (confirm("Are you sure you want to post this journal entry to the ledger? Once posted, this entry will impact reports like the Trial Balance and General Ledger.")) {
            postJournal.mutate(journal.id, {
                onSuccess: () => {
                    toast.success("Journal entry posted successfully")
                    refetch()
                },
                onError: (err: Error) => toast.error(err?.message || "Failed to post journal entry")
            })
        }
    }

    const handleVoid = () => {
        if (confirm("Are you sure you want to void this journal entry? Voiding will create a reversal entry in the ledger and cancel its balances.")) {
            voidJournal.mutate(journal.id, {
                onSuccess: () => {
                    toast.success("Journal entry voided successfully")
                    refetch()
                },
                onError: (err: Error) => toast.error(err?.message || "Failed to void journal entry")
            })
        }
    }

    const totalDebit = journal.lines?.reduce((sum, l) => sum + (l.debit || 0), 0) || 0
    const totalCredit = journal.lines?.reduce((sum, l) => sum + (l.credit || 0), 0) || 0

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                title={`Journal Entry ${journal.entry_number || `JE-${journal.id}`}`}
                primaryAction={journal.status === 'draft' ? {
                    label: postJournal.isPending ? "Posting..." : "Post Entry",
                    onClick: handlePost,
                    disabled: postJournal.isPending || voidJournal.isPending
                } : undefined}
                secondaryAction={journal.status === 'posted' ? {
                    label: voidJournal.isPending ? "Voiding..." : "Void Entry",
                    onClick: handleVoid,
                    disabled: postJournal.isPending || voidJournal.isPending
                } : undefined}
            />

            <div className="grid gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-navy-900 mb-1">
                            {journal.entry_number || `Draft JE #${journal.id}`}
                        </h2>
                        <div className="text-navy-500 text-sm">
                            Accounting Period: <span className="font-semibold text-navy-700">{journal.period?.name || `Period #${journal.accounting_period_id}`}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-right">
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Status</div>
                            <StatusBadge status={journal.status} />
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Entry Date</div>
                            <div className="text-navy-900 font-medium">{formatDateID(journal.entry_date)}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-navy-50/80 border-b border-navy-100 text-sm text-navy-500">
                                <th className="px-6 py-4 font-semibold">Account</th>
                                <th className="px-6 py-4 font-semibold">Description</th>
                                <th className="px-6 py-4 font-semibold text-right">Debit</th>
                                <th className="px-6 py-4 font-semibold text-right">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {journal.lines?.map((line, idx) => (
                                <tr key={idx} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-navy-900">
                                            {line.account ? (
                                                <Link 
                                                    href={`/finance/journals/account/${line.account.id}`}
                                                    className="text-teal-600 hover:text-teal-700 hover:underline"
                                                >
                                                    {line.account.code} - {line.account.name}
                                                </Link>
                                            ) : `Account #${line.account_id}`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-navy-700">{line.description || "-"}</td>
                                    <td className="px-6 py-4 text-navy-900 text-right font-medium">
                                        {line.debit > 0 ? formatIDR(line.debit) : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-navy-900 text-right font-medium">
                                        {line.credit > 0 ? formatIDR(line.credit) : "-"}
                                    </td>
                                </tr>
                            ))}
                            {(!journal.lines || journal.lines.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-navy-400 italic">No lines found in this journal entry.</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-navy-50/30 font-bold border-t border-navy-100">
                            <tr>
                                <td colSpan={2} className="px-6 py-4 text-navy-900">Total</td>
                                <td className="px-6 py-4 text-navy-900 text-right">{formatIDR(totalDebit)}</td>
                                <td className="px-6 py-4 text-navy-900 text-right">{formatIDR(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h3 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-2">Description / Notes</h3>
                    <p className="text-navy-700 whitespace-pre-wrap">{journal.description || "No description provided."}</p>
                </div>
            </div>
        </div>
    )
}
