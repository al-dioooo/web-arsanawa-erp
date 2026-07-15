"use client"

import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, usePeriods, type COAAccount } from "@/features/finance/api"
import { useTrialBalance } from "@/features/finance/api-journals"
import { formatIDR } from "@/lib/format"
import { Icon } from "@/components/ui/icon"
import Link from "next/link"

export default function CashBankPage() {
    const { activeCompanyId } = useSession()

    // Fetch COA
    const { data: accounts = [], isLoading: isLoadingCOA } = useCOA(activeCompanyId)

    // The trial-balance report requires an accounting period. Use the open
    // period (falling back to the most recent) exactly like the finance dashboard.
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const activePeriod = periods.find(period => period.status === "open") ?? periods[0] ?? null

    const {
        data: tbLines = [],
        isLoading: isLoadingTB,
        isError,
    } = useTrialBalance(activeCompanyId, activePeriod?.id ?? null)

    const isLoading = isLoadingCOA || (!!activePeriod && isLoadingTB)

    // Filter to get Kas & Bank accounts (Assets starting with '1' and postable)
    const flattenAccounts = (nodes: COAAccount[]): COAAccount[] => {
        const flat: COAAccount[] = []
        function traverse(nodeList: COAAccount[]) {
            for (const node of nodeList) {
                if (node.is_postable) flat.push(node)
                if (node.children) traverse(node.children)
            }
        }
        traverse(nodes)
        return flat
    }

    const cashBankAccounts = flattenAccounts(accounts).filter(a => String(a.code).startsWith('1') || a.type === 'asset')

    return (
        <div className="w-full">
            <PageHeader
                title="Kas & Bank"
                subtitle={activePeriod ? `Balances as of period ${activePeriod.name}` : undefined}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && (
                    <div className="col-span-full py-12 text-center text-navy-500">
                        Loading bank accounts...
                    </div>
                )}
                {!isLoading && isError && (
                    <div className="col-span-full py-12 text-center text-rose-600 bg-rose-50 rounded-2xl">
                        Unable to load balances. Please try again.
                    </div>
                )}
                {!isLoading && !isError && !activePeriod && (
                    <div className="col-span-full py-12 text-center text-navy-500 bg-navy-50 rounded-2xl">
                        No accounting period found. Create a period to see balances.
                    </div>
                )}
                {!isLoading && !isError && activePeriod && cashBankAccounts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-navy-500 bg-navy-50 rounded-2xl">
                        No Kas & Bank accounts configured in Chart of Accounts.
                    </div>
                )}
                {!isError && activePeriod && cashBankAccounts.map(account => {
                    // Find balance in the trial balance (a flat array of account rows).
                    const tbLine = tbLines.find(line => line.account_id === account.id)
                    const balance = tbLine ? tbLine.debit - tbLine.credit : 0

                    return (
                        <Link
                            key={account.id}
                            href={`/finance/journals/account/${account.id}`} // Links to Account Ledger (Stage 6)
                            className="bg-white rounded-2xl border border-navy-100 p-6 shadow-sm hover:shadow-md hover:border-teal-500/50 transition-all group flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <Icon name="account_balance" className="text-3xl" />
                                </div>
                                <div className="text-xs font-bold text-navy-400 bg-navy-50 px-2 py-1 rounded-md tracking-wider">
                                    {account.code}
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-navy-900 font-semibold mb-1 group-hover:text-teal-600 transition-colors">
                                    {account.name}
                                </h3>
                                <div className="text-sm text-navy-500 mb-6">Kas & Bank</div>

                                <div className="mt-auto">
                                    <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Current Balance</div>
                                    <div className={`text-2xl font-bold ${balance < 0 ? 'text-rose-600' : 'text-navy-900'}`}>
                                        {formatIDR(balance)}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
