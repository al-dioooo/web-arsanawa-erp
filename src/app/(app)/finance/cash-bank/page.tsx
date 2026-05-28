"use client"

import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, type COAAccount } from "@/features/finance/api"
import { apiRequest } from "@/lib/api-client"
import { formatIDR } from "@/lib/format"
import { Icon } from "@/components/ui/icon"
import Link from "next/link"

export default function CashBankPage() {
    const { activeCompanyId } = useSession()
    
    // Fetch COA
    const { data: accounts = [], isLoading: isLoadingCOA } = useCOA(activeCompanyId)
    
    // Fetch Trial Balance to get the current balances
    const { data: trialBalance, isLoading: isLoadingTB } = useQuery({
        queryKey: ['finance', 'trial-balance', activeCompanyId],
        queryFn: () => apiRequest<{ trial_balance: { lines: { account_id: number; debit: string; credit: string }[] } }>('/api/v1/finance/reports/trial-balance').then(res => res.data?.trial_balance || null),
        enabled: !!activeCompanyId,
    })

    const isLoading = isLoadingCOA || isLoadingTB

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
    
    // Extract balances from TB
    const tbLines = trialBalance?.lines || []
    
    return (
        <div className="w-full">
            <PageHeader title="Kas & Bank" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && (
                    <div className="col-span-full py-12 text-center text-navy-500">
                        Loading bank accounts...
                    </div>
                )}
                {!isLoading && cashBankAccounts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-navy-500 bg-navy-50 rounded-2xl">
                        No Kas & Bank accounts configured in Chart of Accounts.
                    </div>
                )}
                {cashBankAccounts.map(account => {
                    // Find balance in TB
                    const tbLine = tbLines.find((line: { account_id: number }) => line.account_id === account.id)
                    const balance = tbLine ? (parseFloat(tbLine.debit) - parseFloat(tbLine.credit)) : 0

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
