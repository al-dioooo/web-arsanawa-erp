"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { IncomeExpenseChart } from "@/components/charts/income-expense-chart"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { StaggerGroup, StaggerItem } from "@/components/ui/stagger"
import { StatCard } from "@/components/ui/stat-card"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, useFinanceDashboardSummary, usePeriods, type COAAccount } from "@/features/finance/api"
import { useTrialBalance } from "@/features/finance/api-journals"
import { RecentActivityCard } from "@/features/finance/components/recent-activity-card"
import { CHART_EXPENSE, CHART_INCOME } from "@/lib/chart-theme"
import { formatIDR } from "@/lib/format"
import { toNumber } from "@/lib/money"
import { cn } from "@/lib/utils"

/** How many trailing days feed the stat-card sparklines. */
const SPARK_DAYS = 14

// Module-level Intl-bound formatters: referentially stable across renders,
// as useCountUp requires.
const idrFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
})
const formatIdrValue = idrFormatter.format.bind(idrFormatter)

const countFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })
const formatCountValue = countFormatter.format.bind(countFormatter)

/**
 * Postable asset accounts (code 1xxx or explicit asset type) across the COA
 * tree — the accounts whose trial-balance movement makes up the cash position.
 */
function collectAssetAccountIds(nodes: COAAccount[]): Set<number> {
    const ids = new Set<number>()

    function walk(list: COAAccount[]) {
        for (const node of list) {
            if (node.is_postable && (String(node.code).startsWith("1") || node.type === "asset")) {
                ids.add(node.id)
            }
            if (node.children) walk(node.children)
        }
    }

    walk(nodes)
    return ids
}

function formatDateInput(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

function currentMonthRange(): { start_date: string; end_date: string } {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return {
        start_date: formatDateInput(start),
        end_date: formatDateInput(end),
    }
}

const QUICK_ACTIONS = [
    { href: "/finance/invoices/new", key: "newInvoice", icon: "request_quote" },
    { href: "/finance/bills/new", key: "newBill", icon: "receipt" },
    { href: "/finance/payments/new", key: "recordPayment", icon: "account_balance_wallet" },
    { href: "/finance/receipts/new", key: "recordReceipt", icon: "savings" },
    { href: "/finance/journals/new", key: "journalEntry", icon: "menu_book" },
] as const

const REPORT_SHORTCUTS = [
    { href: "/finance/reports/trial-balance", key: "trialBalance", icon: "balance" },
    { href: "/finance/reports/profit-loss", key: "incomeStatement", icon: "trending_up" },
    { href: "/finance/tax-returns", key: "taxReturns", icon: "description" },
] as const

export function FinanceDashboardView() {
    const { activeCompanyId } = useSession()
    const t = useTranslations("finance.dashboard")
    const rootT = useTranslations()
    const [dashboardRange, setDashboardRange] = useState(currentMonthRange)

    const coa = useCOA(activeCompanyId)
    const periodsQuery = usePeriods(activeCompanyId)
    const periods = periodsQuery.data ?? []
    const openPeriod = periods.find((p) => p.status === "open") ?? periods[0] ?? null
    const trialBalance = useTrialBalance(activeCompanyId, openPeriod?.id ?? null)
    const summary = useFinanceDashboardSummary(activeCompanyId, dashboardRange)

    const cashPosition = useMemo(() => {
        const assetIds = collectAssetAccountIds(coa.data ?? [])
        return (trialBalance.data ?? [])
            .filter((line) => assetIds.has(line.account_id))
            .reduce((sum, line) => sum + (line.debit - line.credit), 0)
    }, [coa.data, trialBalance.data])

    const cashLoading = coa.isLoading || periodsQuery.isLoading || trialBalance.isLoading
    const cashError = coa.isError || periodsQuery.isError || trialBalance.isError

    const chartData = summary.data?.income_expense_series ?? []
    const incomeTotal = chartData.reduce((sum, point) => sum + toNumber(point.income), 0)
    const expenseTotal = chartData.reduce((sum, point) => sum + toNumber(point.expense), 0)
    const netTotal = incomeTotal - expenseTotal
    const incomeSpark = chartData.slice(-SPARK_DAYS).map((point) => point.income)
    const expenseSpark = chartData.slice(-SPARK_DAYS).map((point) => point.expense)

    return (
        <div className="@container grid gap-6">
            <PageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                subtitle={t("subtitle")}
                status={
                    <StatusPill tone={activeCompanyId ? "green" : "amber"}>
                        {activeCompanyId ? rootT("common.companyScoped") : rootT("common.noCompany")}
                    </StatusPill>
                }
                actions={
                    <Link href="/finance/invoices/new" className={buttonVariants({ size: "lg" })}>
                        {t("newInvoice")}
                    </Link>
                }
                className="mb-0"
            />

            <StaggerGroup
                as="section"
                className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4"
            >
                <StaggerItem>
                    <StatCard
                        label={t("kpis.cashPosition")}
                        href="/finance/cash-bank"
                        value={cashPosition}
                        formatValue={formatIdrValue}
                        isLoading={cashLoading}
                        isError={cashError}
                        errorLabel={t("widgetError")}
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCard
                        label={t("kpis.arOutstanding")}
                        href="/finance/ar"
                        value={toNumber(summary.data?.counters.ar_outstanding)}
                        formatValue={formatIdrValue}
                        isLoading={summary.isLoading}
                        isError={summary.isError}
                        errorLabel={t("widgetError")}
                        spark={incomeSpark}
                        sparkColor={CHART_INCOME}
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCard
                        label={t("kpis.apOutstanding")}
                        href="/finance/ap"
                        value={toNumber(summary.data?.counters.ap_outstanding)}
                        formatValue={formatIdrValue}
                        isLoading={summary.isLoading}
                        isError={summary.isError}
                        errorLabel={t("widgetError")}
                        spark={expenseSpark}
                        sparkColor={CHART_EXPENSE}
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCard
                        label={t("kpis.pendingApprovals")}
                        href="/finance/approval-requests"
                        value={summary.data?.counters.pending_approvals ?? 0}
                        formatValue={formatCountValue}
                        isLoading={summary.isLoading}
                        isError={summary.isError}
                        errorLabel={t("widgetError")}
                    />
                </StaggerItem>
            </StaggerGroup>

            <Card as="section" padding="lg" aria-label={t("chart.title")}>
                <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
                    <div>
                        <h2 className="type-section">{t("chart.title")}</h2>
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                            <div>
                                <span className="type-card-label block">{t("chart.income")}</span>
                                <span className="text-sm font-bold text-brand-ink tabular-nums">
                                    {formatIDR(incomeTotal)}
                                </span>
                            </div>
                            <div>
                                <span className="type-card-label block">{t("chart.expense")}</span>
                                <span className="text-sm font-bold text-warning-strong tabular-nums">
                                    {formatIDR(expenseTotal)}
                                </span>
                            </div>
                            <div>
                                <span className="type-card-label block">{t("chart.net")}</span>
                                <span
                                    className={cn(
                                        "text-sm font-bold tabular-nums",
                                        netTotal < 0 ? "text-error-strong" : "text-ink",
                                    )}
                                >
                                    {formatIDR(netTotal)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InputDate
                            label={t("chart.from")}
                            value={dashboardRange.start_date}
                            onChange={(event) =>
                                setDashboardRange((range) => ({
                                    ...range,
                                    start_date: event.target.value,
                                }))
                            }
                        />
                        <InputDate
                            label={t("chart.to")}
                            value={dashboardRange.end_date}
                            onChange={(event) =>
                                setDashboardRange((range) => ({
                                    ...range,
                                    end_date: event.target.value,
                                }))
                            }
                        />
                    </div>
                </div>

                {summary.isLoading ? (
                    <Skeleton className="mt-6 h-60 w-full" />
                ) : summary.isError ? (
                    <EmptyState compact icon="error_outline" title={t("widgetError")} />
                ) : chartData.length === 0 ? (
                    <EmptyState
                        compact
                        icon="bar_chart"
                        title={t("chart.empty")}
                        description={t("chart.emptyHint")}
                    />
                ) : (
                    <IncomeExpenseChart
                        className="mt-4"
                        data={chartData}
                        incomeLabel={t("chart.income")}
                        expenseLabel={t("chart.expense")}
                        averageLabel={t("chart.average")}
                        height={260}
                    />
                )}
            </Card>

            <section className="grid items-start gap-6 @3xl:grid-cols-3">
                <RecentActivityCard
                    className="@3xl:col-span-2"
                    title={t("recentActivity.title")}
                    items={summary.data?.recent_activity ?? []}
                    isLoading={summary.isLoading}
                    isError={summary.isError}
                    errorLabel={t("widgetError")}
                    emptyTitle={t("recentActivity.empty")}
                    emptyHint={t("recentActivity.emptyHint")}
                    viewAllLabel={t("recentActivity.viewAll")}
                    viewAllHref="/finance/activity"
                />

                <div className="flex flex-col gap-6">
                    <Card padding="lg">
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name="bolt" size={18} className="text-ink-faint" />
                            {t("quickActions.title")}
                        </h2>
                        <ul className="mt-3 grid gap-1">
                            {QUICK_ACTIONS.map((action) => (
                                <li key={action.href}>
                                    <Link
                                        href={action.href}
                                        className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface-muted"
                                    >
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand-ink">
                                            <Icon name={action.icon} size={18} />
                                        </span>
                                        <span className="text-sm font-semibold text-ink">
                                            {t(`quickActions.${action.key}`)}
                                        </span>
                                        <Icon
                                            name="chevron_right"
                                            size={16}
                                            className="ml-auto text-ink-faint transition-transform group-hover:translate-x-0.5"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    {/* Deliberate brand moment: theme-stable teal gradient (see globals.css
                        raw-ramp note) instead of the standard surface card. */}
                    <Card
                        padding="md"
                        className="bg-gradient-to-br from-brand to-teal-900 text-white"
                    >
                        {/* Not type-section: that utility pins color to var(--ink),
                            which must stay white on the gradient. */}
                        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-white">
                            <Icon name="bar_chart" size={18} className="text-teal-100" />
                            {t("reports.title")}
                        </h2>
                        <ul className="mt-3 grid gap-2">
                            {REPORT_SHORTCUTS.map((report) => (
                                <li key={report.href}>
                                    <Link
                                        href={report.href}
                                        className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/20"
                                    >
                                        <Icon name={report.icon} size={16} className="text-teal-100" />
                                        {t(`reports.${report.key}`)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </section>
        </div>
    )
}
