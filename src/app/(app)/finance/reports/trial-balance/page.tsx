"use client"

import { useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { useSession } from "@/features/auth/session-provider"
import { useTrialBalance } from "@/features/finance/api-journals"
import { usePeriods } from "@/features/finance/api"
import { formatIDR, formatDateID } from "@/lib/format"
import { Icon } from "@/components/ui/icon"
import Link from "next/link"

export default function TrialBalancePage() {
    const { activeCompanyId } = useSession()
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const [periodIdState, setPeriodIdState] = useState<number | null>(null)
    const selectedPeriodId = periodIdState ?? periods[0]?.id ?? null

    const { data: trialBalance = [], isLoading } = useTrialBalance(
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
                title="Neraca Saldo (Trial Balance)"
                subtitle="Daftar saldo akhir untuk seluruh akun buku besar pada periode akuntansi tertentu."
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

            {/* Verification Banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 mb-6 transition-colors ${
                isBalanced 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isBalanced ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        <Icon name={isBalanced ? "check_circle" : "error"} className="text-lg" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">
                            {isBalanced ? "Trial Balance Balanced" : "Trial Balance Unbalanced"}
                        </p>
                        <p className="text-xs opacity-90">
                            {isBalanced 
                                ? "Great! The total debits match the total credits."
                                : `Attention: Total debits do not match total credits. Difference is ${formatIDR(difference)}.`
                            }
                        </p>
                    </div>
                </div>
                <div className="text-right font-mono font-bold text-sm">
                    {formatIDR(grandDebit)} / {formatIDR(grandCredit)}
                </div>
            </div>

            <DataTable columns={["Account Code", "Account Name", "Type", "Normal", "Debit", "Credit"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            Generating trial balance report...
                        </td>
                    </tr>
                )}
                {!isLoading && trialBalance.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-400 italic">
                            No accounts or balances recorded for the selected period.
                        </td>
                    </tr>
                )}
                {trialBalance.map((item) => (
                    <tr key={item.account_id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-navy-900">
                            <Link href={`/finance/journals/account/${item.account_id}`} className="text-teal-600 hover:text-teal-700 hover:underline">
                                {item.code}
                            </Link>
                        </td>
                        <td className="px-6 py-4">
                            <Link href={`/finance/journals/account/${item.account_id}`} className="text-navy-900 font-medium hover:text-teal-600">
                                {item.name}
                            </Link>
                        </td>
                        <td className="px-6 py-4 text-navy-500 capitalize">{item.type}</td>
                        <td className="px-6 py-4 text-navy-500 capitalize">{item.normal_balance}</td>
                        <td className="px-6 py-4 text-navy-900 text-right font-medium">
                            {Number(item.debit) > 0 ? formatIDR(Number(item.debit)) : "-"}
                        </td>
                        <td className="px-6 py-4 text-navy-900 text-right font-medium">
                            {Number(item.credit) > 0 ? formatIDR(Number(item.credit)) : "-"}
                        </td>
                    </tr>
                ))}
                {trialBalance.length > 0 && (
                    <tr className="bg-navy-50/30 border-t border-navy-200 font-bold text-navy-900">
                        <td colSpan={4} className="px-6 py-4">Grand Total</td>
                        <td className="px-6 py-4 text-right">{formatIDR(grandDebit)}</td>
                        <td className="px-6 py-4 text-right">{formatIDR(grandCredit)}</td>
                    </tr>
                )}
            </DataTable>
        </div>
    )
}
