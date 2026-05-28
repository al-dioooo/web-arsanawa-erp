"use client"

import { use, useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { useSession } from "@/features/auth/session-provider"
import { useAccountLedger } from "@/features/finance/api-journals"
import { usePeriods } from "@/features/finance/api"
import { formatIDR, formatDateID } from "@/lib/format"
import Link from "next/link"

export default function AccountLedgerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { activeCompanyId } = useSession()
    
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const [periodIdState, setPeriodIdState] = useState<number | null>(null)
    const selectedPeriodId = periodIdState ?? periods[0]?.id ?? null

    const accountId = parseInt(id)
    const { data: report, isLoading } = useAccountLedger(
        activeCompanyId,
        accountId || null,
        selectedPeriodId
    )

    const ledgerLines = report?.ledger || []
    const account = report?.account

    const totalDebit = ledgerLines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = ledgerLines.reduce((sum, line) => sum + (line.credit || 0), 0)
    const endingBalance = ledgerLines.length > 0 ? ledgerLines[ledgerLines.length - 1].balance : 0

    return (
        <div className="w-full">
            <PageHeader
                title={`Buku Besar: ${account ? `${account.code} - ${account.name}` : `Account #${id}`}`}
                subtitle={account ? `Normal Balance: ${account.normal_balance.toUpperCase()} · Type: ${account.type.toUpperCase()}` : ""}
            />

            <FilterBar>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-navy-500">Accounting Period:</span>
                    <select
                        value={selectedPeriodId || ""}
                        onChange={(e) => setPeriodIdState(Number(e.target.value) || null)}
                        className="text-sm border border-navy-200 rounded-lg px-3 py-1.5 bg-white text-navy-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow"
                    >
                        {periods.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({formatDateID(p.start_date)} - {formatDateID(p.end_date)})
                            </option>
                        ))}
                    </select>
                </div>
            </FilterBar>

            {/* Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-navy-100">
                    <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider block mb-1">Normal Balance</span>
                    <span className="text-lg font-bold text-navy-800 capitalize">
                        {account?.normal_balance || "-"}
                    </span>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-navy-100">
                    <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider block mb-1">Total Debit</span>
                    <span className="text-lg font-bold text-teal-600">
                        {formatIDR(totalDebit)}
                    </span>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-navy-100">
                    <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider block mb-1">Total Credit</span>
                    <span className="text-lg font-bold text-rose-600">
                        {formatIDR(totalCredit)}
                    </span>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-navy-100 bg-teal-50/20 border-teal-100">
                    <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider block mb-1">Ending Balance</span>
                    <span className="text-lg font-bold text-teal-750">
                        {formatIDR(endingBalance)}
                    </span>
                </div>
            </div>

            <DataTable columns={["Date", "Journal Reference", "Description", "Debit", "Credit", "Running Balance"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            Loading ledger lines...
                        </td>
                    </tr>
                )}
                {!isLoading && ledgerLines.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-400 italic">
                            No ledger lines found for this period.
                        </td>
                    </tr>
                )}
                {ledgerLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 text-navy-700">{formatDateID(line.entry_date)}</td>
                        <td className="px-6 py-4">
                            <Link href={`/finance/journals/${line.journal_entry_id}`} className="font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                                {line.entry_number}
                            </Link>
                        </td>
                        <td className="px-6 py-4 text-navy-950">{line.description}</td>
                        <td className="px-6 py-4 text-navy-900 text-right">
                            {line.debit > 0 ? formatIDR(line.debit) : "-"}
                        </td>
                        <td className="px-6 py-4 text-navy-900 text-right">
                            {line.credit > 0 ? formatIDR(line.credit) : "-"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-navy-900 text-right bg-navy-50/10">
                            {formatIDR(line.balance)}
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
