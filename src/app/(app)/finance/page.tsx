"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/ui/status-pill"
import { StatusBadge } from '@/features/finance/components/status-badge'
import { Icon } from '@/components/ui/icon'
import Link from 'next/link'
import { useSession } from '@/features/auth/session-provider'
import { useCOA, usePeriods } from '@/features/finance/api'
import { useInvoices } from '@/features/finance/api-invoices'
import { useBills } from '@/features/finance/api-bills'
import { useTrialBalance } from '@/features/finance/api-journals'
import { useApprovalRequests } from '@/features/finance/api-approvals'
import { formatIDR, formatDateID } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

function flattenAccounts(nodes: { id: number; code: string; type: string; is_postable: boolean; children?: typeof nodes }[]): typeof nodes {
    const flat: typeof nodes = []
    function traverse(list: typeof nodes) {
        for (const n of list) {
            if (n.is_postable) flat.push(n)
            if (n.children) traverse(n.children)
        }
    }
    traverse(nodes)
    return flat
}

export default function FinanceDashboard() {
    const router = useRouter()
    const { activeCompanyId } = useSession()

    const { data: accounts = [] } = useCOA(activeCompanyId)
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const openPeriod = periods.find(p => p.status === 'open') ?? periods[0] ?? null
    const { data: trialBalanceLines = [] } = useTrialBalance(activeCompanyId, openPeriod?.id ?? null)
    const { data: invoices = [], isLoading: loadingInvoices } = useInvoices(activeCompanyId)
    const { data: bills = [], isLoading: loadingBills } = useBills(activeCompanyId)
    const { data: approvalData } = useApprovalRequests(activeCompanyId, { status: 'pending', per_page: 100 })

    const isLoading = loadingInvoices || loadingBills

    const cashPosition = useMemo(() => {
        const assetIds = new Set(
            flattenAccounts(accounts).filter(a => String(a.code).startsWith('1') || a.type === 'asset').map(a => a.id)
        )
        return trialBalanceLines
            .filter(l => assetIds.has(l.account_id))
            .reduce((sum, l) => sum + (l.debit - l.credit), 0)
    }, [accounts, trialBalanceLines])

    const arOutstanding = useMemo(() => {
        return invoices
            .filter(inv => ['posted', 'partially_paid', 'overdue'].includes(inv.status))
            .reduce((sum, inv) => sum + (parseFloat(inv.total) - parseFloat(inv.amount_paid)), 0)
    }, [invoices])

    const apOutstanding = useMemo(() => {
        return bills
            .filter(b => ['posted', 'partially_paid'].includes(b.status))
            .reduce((sum, b) => sum + (parseFloat(b.total) - parseFloat(b.amount_paid)), 0)
    }, [bills])

    const pendingApprovalsCount = approvalData?.approval_requests?.length ?? 0

    const recentActivity = useMemo(() => {
        type ActivityItem = { id: number; type: 'invoice' | 'bill'; number: string; date: string; total: string; status: string; href: string }
        const items: ActivityItem[] = [
            ...invoices.slice(0, 10).map(inv => ({
                id: inv.id, type: 'invoice' as const,
                number: inv.invoice_number, date: inv.invoice_date,
                total: inv.total, status: inv.status,
                href: `/finance/invoices/${inv.id}`
            })),
            ...bills.slice(0, 10).map(b => ({
                id: b.id, type: 'bill' as const,
                number: b.bill_number, date: b.bill_date,
                total: b.total, status: b.status,
                href: `/finance/bills/${b.id}`
            })),
        ]
        return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
    }, [invoices, bills])

    const kpis = [
        {
            label: "Cash Position",
            value: cashPosition,
            icon: "account_balance",
            color: "text-teal-700",
            bg: "bg-teal-50",
            loading: false,
            href: "/finance/cash-bank",
        },
        {
            label: "AR Outstanding",
            value: arOutstanding,
            icon: "attach_money",
            color: "text-amber-600",
            bg: "bg-amber-50",
            loading: loadingInvoices,
            href: "/finance/ar",
        },
        {
            label: "AP Outstanding",
            value: apOutstanding,
            icon: "money_off",
            color: "text-rose-600",
            bg: "bg-rose-50",
            loading: loadingBills,
            href: "/finance/ap",
        },
        {
            label: "Pending Approvals",
            value: pendingApprovalsCount,
            icon: "fact_check",
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            loading: false,
            href: "/finance/approval-requests",
            isCount: true,
        },
    ]

    return (
        <div className="grid gap-6">
            {/* Page header — matches design system pattern */}
            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                            Finance
                        </p>
                        <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">
                            Finance Dashboard
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500 font-body">
                            Overview of your company&apos;s financial position — cash, receivables, payables, and pending approvals.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                        <StatusPill tone={activeCompanyId ? "green" : "amber"}>
                            {activeCompanyId ? "Company scoped" : "No company"}
                        </StatusPill>
                        <Button
                            onClick={() => router.push('/finance/invoices/new')}
                            size="xl"
                            className="bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
                        >
                            New Invoice
                        </Button>
                    </div>
                </div>
            </section>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <Link
                        key={kpi.label}
                        href={kpi.href}
                        className="bg-white rounded-2xl p-5 border border-navy-100 hover:border-teal-300 hover:shadow-md transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">
                                {kpi.label}
                            </span>
                            <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", kpi.bg)}>
                                <Icon name={kpi.icon} className={cn("text-xl", kpi.color)} />
                            </div>
                        </div>
                        {kpi.loading ? (
                            <div className="h-8 w-32 bg-navy-100 animate-pulse rounded-lg" />
                        ) : kpi.isCount ? (
                            <div className="flex items-end gap-2">
                                <span className={cn("text-3xl font-bold", kpi.color)}>{kpi.value}</span>
                                <span className="text-sm text-navy-400 mb-1 font-medium">items</span>
                            </div>
                        ) : (
                            <span className={cn("text-2xl font-bold font-display", kpi.value < 0 ? "text-rose-600" : "text-navy-900")}>
                                {formatIDR(kpi.value as number)}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-navy-100 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
                        <h2 className="text-base font-bold text-navy-900 font-display flex items-center gap-2">
                            <Icon name="history" className="text-navy-400" />
                            Recent Activity
                        </h2>
                        <Link href="/finance/activity" className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                            View all →
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="px-6 py-12 flex flex-col gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-3 items-center">
                                    <div className="h-4 w-20 bg-navy-100 animate-pulse rounded" />
                                    <div className="h-4 flex-1 bg-navy-100 animate-pulse rounded" />
                                    <div className="h-4 w-24 bg-navy-100 animate-pulse rounded" />
                                </div>
                            ))}
                        </div>
                    ) : recentActivity.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <div className="p-4 bg-navy-50 rounded-2xl mb-3">
                                <Icon name="history" className="text-4xl text-navy-300" />
                            </div>
                            <p className="font-semibold text-navy-700">No recent activity</p>
                            <p className="text-sm text-navy-400 mt-1">Transactions will appear here once recorded.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-navy-50">
                            {recentActivity.map((item) => (
                                <Link
                                    key={`${item.type}-${item.id}`}
                                    href={item.href}
                                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-navy-50/50 transition-colors"
                                >
                                    <div className={cn(
                                        "p-2 rounded-lg flex-shrink-0",
                                        item.type === 'invoice' ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-600"
                                    )}>
                                        <Icon name={item.type === 'invoice' ? "request_quote" : "receipt"} className="text-base" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-navy-900 text-sm truncate">{item.number}</div>
                                        <div className="text-xs text-navy-400 font-medium">{formatDateID(item.date)}</div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="font-semibold text-navy-900 text-sm">{formatIDR(parseFloat(item.total))}</span>
                                        <StatusBadge status={item.status} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-4">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl border border-navy-100 p-6">
                        <h2 className="text-base font-bold text-navy-900 font-display mb-4 flex items-center gap-2">
                            <Icon name="bolt" className="text-navy-400" />
                            Quick Actions
                        </h2>
                        <div className="flex flex-col gap-1.5">
                            {[
                                { href: '/finance/invoices/new', label: 'New Invoice', icon: 'request_quote', color: 'bg-teal-50 text-teal-700' },
                                { href: '/finance/bills/new', label: 'New Bill', icon: 'receipt', color: 'bg-amber-50 text-amber-600' },
                                { href: '/finance/payments/new', label: 'Record Payment', icon: 'account_balance_wallet', color: 'bg-indigo-50 text-indigo-600' },
                                { href: '/finance/receipts/new', label: 'Record Receipt', icon: 'savings', color: 'bg-emerald-50 text-emerald-700' },
                                { href: '/finance/journals/new', label: 'Journal Entry', icon: 'menu_book', color: 'bg-purple-50 text-purple-600' },
                            ].map(action => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-navy-50 transition-colors border border-transparent hover:border-navy-100 group"
                                >
                                    <div className={cn("p-2 rounded-lg group-hover:scale-105 transition-transform", action.color)}>
                                        <Icon name={action.icon} className="text-lg" />
                                    </div>
                                    <span className="font-semibold text-navy-700 text-sm">{action.label}</span>
                                    <Icon name="chevron_right" className="ml-auto text-navy-300 text-base" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Reports shortcuts */}
                    <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
                        <h3 className="font-bold text-base font-display mb-3 flex items-center gap-2">
                            <Icon name="bar_chart" className="text-teal-200" />
                            Reports
                        </h3>
                        <div className="flex flex-col gap-2">
                            {[
                                { href: '/finance/reports/trial-balance', label: 'Trial Balance', icon: 'balance' },
                                { href: '/finance/reports/profit-loss', label: 'Income Statement', icon: 'trending_up' },
                                { href: '/finance/tax-returns', label: 'Tax Returns (SPT)', icon: 'description' },
                            ].map(r => (
                                <Link
                                    key={r.href}
                                    href={r.href}
                                    className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold"
                                >
                                    <Icon name={r.icon} className="text-base text-teal-100" />
                                    {r.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
