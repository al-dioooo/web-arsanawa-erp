"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { ExportButtons } from "@/features/finance/components/export-buttons"
import { useSession } from "@/features/auth/session-provider"
import { usePeriods } from "@/features/finance/api"
import { useTrialBalance, type TrialBalanceItem } from "@/features/finance/api-journals"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { SelectDescription } from "@/components/ui/select-description"
import { Skeleton } from "@/components/ui/skeleton"
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
    const t = useTranslations("finance.profitLoss")
    const { activeCompanyId } = useSession()
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null)

    const periodId = selectedPeriodId ?? periods[0]?.id ?? null
    const { data: trialBalance = [], isLoading } = useTrialBalance(activeCompanyId, periodId)

    const selectedPeriod = periods.find(p => p.id === periodId)

    const revenueLabel = t("sections.revenue")
    const cogsLabel = t("sections.cogs")
    const opexLabel = t("sections.opex")

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
            { label: revenueLabel, items: revenue, total: totalRevenue, color: 'text-brand-ink', sign: 1 },
            { label: cogsLabel, items: cogs, total: totalCOGS, color: 'text-error-strong', sign: -1 },
            // Raw orange is the sanctioned brand accent shade.
            { label: opexLabel, items: opex, total: totalOpex, color: 'text-orange-700', sign: -1 },
        ]

        return { sections, grossProfit: gross, operatingProfit: operating }
    }, [trialBalance, revenueLabel, cogsLabel, opexLabel])

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
            />

            <FilterBar>
                <div className="flex flex-wrap items-center gap-4">
                    <SelectDescription
                        label={t("period.label")}
                        value={periodId ?? ''}
                        onChange={e => setSelectedPeriodId(Number(e.target.value) || null)}
                        options={[
                            { value: "", label: t("period.placeholder"), description: t("period.placeholderDesc") },
                            ...periods.map(p => ({
                                value: p.id,
                                label: p.name,
                                description: t("period.statusDesc", { status: p.status }),
                            })),
                        ]}
                    />
                    {selectedPeriod && (
                        <span className="text-sm text-ink-muted">
                            {selectedPeriod.start_date} &ndash; {selectedPeriod.end_date}
                        </span>
                    )}
                    <div className="w-full sm:ml-auto sm:w-auto">
                        <ExportButtons
                            range={{
                                from: selectedPeriod?.start_date ?? null,
                                to: selectedPeriod?.end_date ?? null,
                            }}
                        />
                    </div>
                </div>
            </FilterBar>

            {!periodId ? (
                <Card padding="lg">
                    <EmptyState
                        icon="bar_chart"
                        title={t("selectPeriodTitle")}
                        description={t("selectPeriodHint")}
                    />
                </Card>
            ) : isLoading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} padding="lg" aria-hidden="true">
                            <Skeleton className="mb-4 h-5 w-32" />
                            {[...Array(3)].map((__, j) => (
                                <div key={j} className="flex justify-between py-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Revenue Section */}
                    <PLSectionCard section={sections[0]} emptyLabel={t("sectionEmpty")} />

                    {/* Cost of Sales Section */}
                    <PLSectionCard section={sections[1]} emptyLabel={t("sectionEmpty")} />

                    {/* Gross Profit Subtotal */}
                    <SubtotalCard
                        label={t("grossProfit")}
                        sublabel={t("grossProfitAlt")}
                        value={grossProfit}
                        highlight
                    />

                    {/* Operating Expenses Section */}
                    <PLSectionCard section={sections[2]} emptyLabel={t("sectionEmpty")} />

                    {/* Net Operating Profit */}
                    <SubtotalCard
                        label={t("netOperatingProfit")}
                        sublabel={t("netOperatingProfitAlt")}
                        value={operatingProfit}
                        highlight
                        large
                    />

                    {trialBalance.length === 0 && (
                        <Card padding="lg" inset>
                            <EmptyState
                                compact
                                icon="info"
                                title={t("noData")}
                                description={t("noDataHint")}
                            />
                        </Card>
                    )}

                    {/* Footer note */}
                    <div className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-ink-muted">
                        <Icon name="info" size={16} />
                        {t("footnote", { period: selectedPeriod?.name ?? "" })}
                    </div>
                </div>
            )}
        </div>
    )
}

function PLSectionCard({ section, emptyLabel }: { section: PLSection; emptyLabel: string }) {
    const [expanded, setExpanded] = useState(true)

    return (
        <Card padding="none" className="overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="flex w-full cursor-pointer items-center justify-between border-b border-line px-6 py-4 transition-colors hover:bg-surface-muted/60"
            >
                <span className={cn("text-base font-bold", section.color)}>{section.label}</span>
                <div className="flex items-center gap-4">
                    <span className={cn("text-lg font-bold tabular-nums", section.color)}>
                        {section.sign === -1 && section.total > 0 && '('}
                        {formatIDR(section.total)}
                        {section.sign === -1 && section.total > 0 && ')'}
                    </span>
                    <Icon
                        name={expanded ? "expand_less" : "expand_more"}
                        size={16}
                        className="text-ink-faint"
                    />
                </div>
            </button>

            {expanded && (
                <div>
                    {section.items.length === 0 ? (
                        <div className="px-6 py-4 text-sm text-ink-faint italic">{emptyLabel}</div>
                    ) : (
                        section.items.map(item => {
                            const amount = netAmount(item)
                            return (
                                <div
                                    key={item.account_id}
                                    className="flex items-center justify-between border-b border-line px-6 py-3 transition-colors last:border-0 hover:bg-surface-muted/40"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="w-14 flex-shrink-0 font-mono text-xs text-ink-faint">{item.code}</span>
                                        <Link
                                            href={`/finance/journals/account/${item.account_id}`}
                                            className="truncate text-sm font-medium text-ink-secondary transition-colors hover:text-brand-ink hover:underline decoration-dotted"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {item.name}
                                        </Link>
                                    </div>
                                    <span className={cn(
                                        "ml-4 flex-shrink-0 text-sm font-semibold tabular-nums",
                                        amount === 0 ? "text-ink-faint" : section.color
                                    )}>
                                        {formatIDR(amount)}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </Card>
    )
}

function SubtotalCard({
    label,
    sublabel,
    value,
    highlight = false,
    large = false,
}: {
    label: string
    sublabel: string
    value: number
    highlight?: boolean
    large?: boolean
}) {
    const isPositive = value >= 0

    return (
        <div className={cn(
            "flex items-center justify-between rounded-lg p-5",
            highlight && isPositive && "bg-brand-soft",
            highlight && !isPositive && "bg-error-soft",
            !highlight && "bg-surface-muted",
        )}>
            <div>
                <div className={cn("font-bold", large ? "text-lg" : "text-base", isPositive ? "text-ink" : "text-error-strong")}>
                    {label}
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">{sublabel}</div>
            </div>
            <div className={cn(
                "font-bold tabular-nums",
                large ? "text-3xl" : "text-xl",
                isPositive ? (highlight ? "text-brand-ink" : "text-ink") : "text-error-strong"
            )}>
                {!isPositive && "("}
                {formatIDR(Math.abs(value))}
                {!isPositive && ")"}
            </div>
        </div>
    )
}
