"use client"

import { useState, useMemo } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { useSession } from "@/features/auth/session-provider"
import { usePeriods } from "@/features/finance/api"
import { useTrialBalance, type TrialBalanceItem } from "@/features/finance/api-journals"
import { Icon } from "@/components/ui/icon"
import { SelectDescription } from "@/components/ui/select-description"
import { formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Account classification by code prefix and type
function classifyAccount(item: TrialBalanceItem): 'revenue' | 'cogs' | 'operating_expense' | 'other' | null {
    const code = String(item.code)
    const type = item.type?.toLowerCase() || ''

    if (type === 'revenue' || code.startsWith('4')) return 'revenue'
    if (code.startsWith('50') || code.startsWith('51') || type === 'cogs') return 'cogs'
    if (
        code.startsWith('5') || code.startsWith('6') || code.startsWith('7') || code.startsWith('8') ||
        type === 'expense'
    ) return 'operating_expense'
    return null // Assets, liabilities, equity — excluded from P&L
}

// Compute an account's net contribution to P&L
function netAmount(item: TrialBalanceItem): number {
    // Revenue: credit-normal → credit > debit means positive revenue
    // Expense: debit-normal → debit > credit means positive expense
    if (item.normal_balance === 'credit') {
        return item.credit - item.debit
    }
    return item.debit - item.credit
}

type PLSection = {
    label: string
    items: TrialBalanceItem[]
    total: number
    color: string
    sign: 1 | -1 // +1 adds to profit, -1 subtracts
}

export default function ProfitLossPage() {
    const { activeCompanyId } = useSession()
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null)

    const periodId = selectedPeriodId ?? periods[0]?.id ?? null
    const { data: trialBalance = [], isLoading } = useTrialBalance(activeCompanyId, periodId)

    const selectedPeriod = periods.find(p => p.id === periodId)

    const { sections, grossProfit, operatingProfit } = useMemo(() => {
        const revenue = trialBalance.filter(i => classifyAccount(i) === 'revenue')
        const cogs = trialBalance.filter(i => classifyAccount(i) === 'cogs')
        const opex = trialBalance.filter(i => classifyAccount(i) === 'operating_expense')

        const totalRevenue = revenue.reduce((s, i) => s + netAmount(i), 0)
        const totalCOGS = cogs.reduce((s, i) => s + netAmount(i), 0)
        const totalOpex = opex.reduce((s, i) => s + netAmount(i), 0)

        const gross = totalRevenue - totalCOGS
        const operating = gross - totalOpex

        const sections: PLSection[] = [
            { label: 'Revenue', items: revenue, total: totalRevenue, color: 'text-teal-700', sign: 1 },
            { label: 'Cost of Sales', items: cogs, total: totalCOGS, color: 'text-rose-600', sign: -1 },
            { label: 'Operating Expenses', items: opex, total: totalOpex, color: 'text-orange-600', sign: -1 },
        ]

        return { sections, grossProfit: gross, operatingProfit: operating }
    }, [trialBalance])

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                title="Income Statement"
                subtitle="Laporan Laba Rugi"
            />

            <FilterBar>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Icon name="calendar_month" className="text-navy-400 text-base" />
                        <label className="text-sm font-semibold text-navy-600">Accounting Period:</label>
                    </div>
                    <SelectDescription
                        label="Accounting Period"
                        value={periodId ?? ''}
                        onChange={e => setSelectedPeriodId(Number(e.target.value) || null)}
                        options={[
                            { value: "", label: "Select a period", description: "Choose the accounting period for this report." },
                            ...periods.map(p => ({
                                value: p.id,
                                label: p.name,
                                description: `Status: ${p.status}`,
                            })),
                        ]}
                    />
                    {selectedPeriod && (
                        <span className="text-sm text-navy-400">
                            {selectedPeriod.start_date} – {selectedPeriod.end_date}
                        </span>
                    )}
                </div>
            </FilterBar>

            {!periodId ? (
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-12 text-center">
                    <Icon name="bar_chart" className="text-5xl text-navy-200 mb-3" />
                    <p className="font-semibold text-navy-700 text-lg">Select an accounting period</p>
                    <p className="text-sm text-navy-400 mt-2">The Income Statement will be calculated from all posted journal entries in the selected period.</p>
                </div>
            ) : isLoading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                            <div className="h-5 w-32 bg-navy-100 animate-pulse rounded mb-4" />
                            {[...Array(3)].map((__, j) => (
                                <div key={j} className="flex justify-between py-2">
                                    <div className="h-4 w-48 bg-navy-50 animate-pulse rounded" />
                                    <div className="h-4 w-24 bg-navy-50 animate-pulse rounded" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Revenue Section */}
                    <PLSectionCard section={sections[0]} />

                    {/* Cost of Sales Section */}
                    <PLSectionCard section={sections[1]} />

                    {/* Gross Profit Subtotal */}
                    <SubtotalCard
                        label="Gross Profit"
                        labelID="Laba Kotor"
                        value={grossProfit}
                        highlight
                    />

                    {/* Operating Expenses Section */}
                    <PLSectionCard section={sections[2]} />

                    {/* Net Operating Profit */}
                    <SubtotalCard
                        label="Net Operating Profit"
                        labelID="Laba Usaha"
                        value={operatingProfit}
                        highlight
                        large
                    />

                    {trialBalance.length === 0 && (
                        <div className="bg-navy-50 rounded-2xl p-8 text-center">
                            <Icon name="info" className="text-3xl text-navy-300 mb-2" />
                            <p className="font-semibold text-navy-600">No posted data found for this period.</p>
                            <p className="text-sm text-navy-400 mt-1">Post journal entries or invoices/bills to see the Income Statement.</p>
                        </div>
                    )}

                    {/* Footer note */}
                    <div className="text-xs text-navy-400 text-center pt-2 flex items-center justify-center gap-1.5">
                        <Icon name="info" className="text-base" />
                        Figures computed from Trial Balance for period: <span className="font-semibold">{selectedPeriod?.name}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

function PLSectionCard({ section }: { section: PLSection }) {
    const [expanded, setExpanded] = useState(true)

    return (
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 border-b border-navy-50 hover:bg-navy-50/30 transition-colors cursor-pointer"
            >
                <span className={cn("font-bold text-base", section.color)}>{section.label}</span>
                <div className="flex items-center gap-4">
                    <span className={cn("font-bold text-lg", section.color)}>
                        {section.sign === -1 && section.total > 0 && '('}
                        {formatIDR(section.total)}
                        {section.sign === -1 && section.total > 0 && ')'}
                    </span>
                    <Icon
                        name={expanded ? "expand_less" : "expand_more"}
                        className="text-navy-400 text-base"
                    />
                </div>
            </button>

            {expanded && (
                <div>
                    {section.items.length === 0 ? (
                        <div className="px-6 py-4 text-sm text-navy-400 italic">No accounts in this category for the selected period.</div>
                    ) : (
                        section.items.map(item => {
                            const amount = netAmount(item)
                            return (
                                <div
                                    key={item.account_id}
                                    className="flex items-center justify-between px-6 py-3 border-b border-navy-50 last:border-0 hover:bg-navy-50/20 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-xs font-mono text-navy-400 flex-shrink-0 w-14">{item.code}</span>
                                        <Link
                                            href={`/finance/journals/account/${item.account_id}`}
                                            className="text-sm text-navy-700 hover:text-teal-600 font-medium truncate transition-colors hover:underline decoration-dotted"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {item.name}
                                        </Link>
                                    </div>
                                    <span className={cn(
                                        "text-sm font-semibold flex-shrink-0 ml-4",
                                        amount === 0 ? "text-navy-400" : section.color
                                    )}>
                                        {formatIDR(amount)}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}

function SubtotalCard({
    label,
    labelID,
    value,
    highlight = false,
    large = false,
}: {
    label: string
    labelID: string
    value: number
    highlight?: boolean
    large?: boolean
}) {
    const isPositive = value >= 0

    return (
        <div className={cn(
            "rounded-2xl border p-5 flex items-center justify-between",
            highlight && isPositive ? "bg-teal-50 border-teal-200" : "",
            highlight && !isPositive ? "bg-rose-50 border-rose-200" : "",
            !highlight ? "bg-navy-50 border-navy-100" : "",
        )}>
            <div>
                <div className={cn("font-bold", large ? "text-lg" : "text-base", isPositive ? "text-navy-900" : "text-rose-700")}>
                    {label}
                </div>
                <div className="text-xs text-navy-400 mt-0.5">{labelID}</div>
            </div>
            <div className={cn(
                "font-bold",
                large ? "text-3xl" : "text-xl",
                isPositive ? (highlight ? "text-teal-700" : "text-navy-900") : "text-rose-700"
            )}>
                {!isPositive && "("}
                {formatIDR(Math.abs(value))}
                {!isPositive && ")"}
            </div>
        </div>
    )
}
