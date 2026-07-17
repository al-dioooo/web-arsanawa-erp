"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { IncomeExpenseChart } from "@/components/charts/income-expense-chart"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { StaggerGroup, StaggerItem } from "@/components/ui/stagger"
import { StatusPill } from "@/components/ui/status-pill"
import { canManageEntitlements } from "@/features/auth/access"
import { useSession } from "@/features/auth/session-provider"
import { useFinanceDashboardSummary } from "@/features/finance/api"
import { useInventoryDashboardSummary, usePosDashboardSummary } from "@/features/home/home-api"
import { LauncherGrid } from "@/features/home/components/launcher-grid"
import { NeedsAttentionCard, type AttentionRow } from "@/features/home/components/needs-attention-card"
import { RecentActivityCard } from "@/features/home/components/recent-activity-card"
import { StatCard } from "@/features/home/components/stat-card"
import { CHART_EXPENSE, CHART_INCOME } from "@/lib/chart-theme"
import { cn } from "@/lib/utils"
import { toNumber } from "@/lib/money"

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

export function HomeDashboardView() {
    const { user, profile, modules, activeCompanyId, companies, organizationContext } = useSession()
    const t = useTranslations("home")
    const rootT = useTranslations()
    const format = useFormatter()

    const activeCompany = companies.find((c) => c.company.id === activeCompanyId)?.company
    const hasCompany = Boolean(activeCompany)

    const enabledSet = new Set(modules?.enabled ?? [])
    const financeOn = hasCompany && enabledSet.has("finance")
    const inventoryOn = hasCompany && enabledSet.has("inventory")
    const posOn = hasCompany && enabledSet.has("pos")

    const monthRange = useMemo(() => currentMonthRange(), [])
    // Finance reuses its own hook directly; passing null keeps it idle when
    // the module is off (the hook is enabled-gated on companyId).
    const finance = useFinanceDashboardSummary(financeOn ? activeCompanyId : null, monthRange)
    const inventory = useInventoryDashboardSummary(inventoryOn)
    const pos = usePosDashboardSummary(posOn)

    const today = useMemo(() => new Date(), [])
    const dateLine = format.dateTime(today, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    })

    const displayName = profile?.profile?.display_name ?? user?.name ?? ""
    const firstName = displayName.trim().split(/\s+/)[0] ?? ""

    const canManageModules = hasCompany && canManageEntitlements(organizationContext?.membership, user)

    const series = finance.data?.income_expense_series ?? []
    const incomeSpark = series.slice(-SPARK_DAYS).map((point) => point.income)
    const expenseSpark = series.slice(-SPARK_DAYS).map((point) => point.expense)

    const attentionRows: AttentionRow[] = []
    if (financeOn && finance.data) {
        const counters = finance.data.counters
        if (counters.pending_approvals > 0) {
            attentionRows.push({
                key: "pending-approvals",
                icon: "fact_check",
                label: t("needsAttention.pendingApprovals"),
                count: counters.pending_approvals,
                href: "/finance/approval-requests",
            })
        }
        if (counters.draft_invoices > 0) {
            attentionRows.push({
                key: "draft-invoices",
                icon: "request_quote",
                label: t("needsAttention.draftInvoices"),
                count: counters.draft_invoices,
                href: "/finance/invoices",
            })
        }
        if (counters.draft_bills > 0) {
            attentionRows.push({
                key: "draft-bills",
                icon: "receipt",
                label: t("needsAttention.draftBills"),
                count: counters.draft_bills,
                href: "/finance/bills",
            })
        }
    }
    if (inventoryOn && inventory.data) {
        const counters = inventory.data.counters
        if (counters.stock_movements.unsettled > 0) {
            attentionRows.push({
                key: "unsettled-movements",
                icon: "inventory_movements",
                label: t("needsAttention.unsettledMovements"),
                count: counters.stock_movements.unsettled,
                href: "/inventory/stock/movements",
            })
        }
        if (counters.stock_lots.expiring_soon > 0) {
            attentionRows.push({
                key: "expiring-lots",
                icon: "inventory_stock_lots",
                label: t("needsAttention.expiringLots"),
                count: counters.stock_lots.expiring_soon,
                href: "/inventory/stock/lots",
            })
        }
    }
    if (posOn && pos.data) {
        const counters = pos.data.counters
        if (counters.shifts.open > 0) {
            attentionRows.push({
                key: "open-shifts",
                icon: "shifts",
                label: t("needsAttention.openShifts"),
                count: counters.shifts.open,
                href: "/pos/shifts",
            })
        }
    }

    const anyModuleOn = financeOn || inventoryOn || posOn
    const attentionLoading =
        (financeOn && finance.isLoading) ||
        (inventoryOn && inventory.isLoading) ||
        (posOn && pos.isLoading)

    return (
        <div className="@container grid gap-6">
            <PageHeader
                variant="greeting"
                eyebrow={dateLine}
                title={t("greeting", { name: firstName })}
                subtitle={
                    activeCompany
                        ? rootT("console.managing", { company: activeCompany.name })
                        : rootT("console.selectOrganization")
                }
                actions={
                    canManageModules ? (
                        <Link
                            href="/organization/modules"
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                            {t("manageModules")}
                        </Link>
                    ) : undefined
                }
                className="mb-0"
            />

            {anyModuleOn ? (
                <StaggerGroup
                    as="section"
                    className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4"
                >
                    {financeOn ? (
                        <StaggerItem>
                            <StatCard
                                label={t("statCards.arOutstanding")}
                                href="/finance/ar"
                                value={toNumber(finance.data?.counters.ar_outstanding)}
                                formatValue={formatIdrValue}
                                isLoading={finance.isLoading}
                                isError={finance.isError}
                                errorLabel={t("widgetError")}
                                spark={incomeSpark}
                                sparkColor={CHART_INCOME}
                            />
                        </StaggerItem>
                    ) : null}
                    {financeOn ? (
                        <StaggerItem>
                            <StatCard
                                label={t("statCards.apOutstanding")}
                                href="/finance/ap"
                                value={toNumber(finance.data?.counters.ap_outstanding)}
                                formatValue={formatIdrValue}
                                isLoading={finance.isLoading}
                                isError={finance.isError}
                                errorLabel={t("widgetError")}
                                spark={expenseSpark}
                                sparkColor={CHART_EXPENSE}
                            />
                        </StaggerItem>
                    ) : null}
                    {posOn ? (
                        <StaggerItem>
                            <StatCard
                                label={t("statCards.todaySales")}
                                href="/pos/sales"
                                value={toNumber(pos.data?.counters.sales.today_total)}
                                formatValue={formatIdrValue}
                                isLoading={pos.isLoading}
                                isError={pos.isError}
                                errorLabel={t("widgetError")}
                                badge={
                                    <StatusPill tone="teal">
                                        {t("transactionsCount", {
                                            count: pos.data?.counters.sales.today_count ?? 0,
                                        })}
                                    </StatusPill>
                                }
                            />
                        </StaggerItem>
                    ) : null}
                    {inventoryOn ? (
                        <StaggerItem>
                            <StatCard
                                label={t("statCards.stockValue")}
                                href="/inventory/stock"
                                value={toNumber(inventory.data?.counters.stock_value)}
                                formatValue={formatIdrValue}
                                isLoading={inventory.isLoading}
                                isError={inventory.isError}
                                errorLabel={t("widgetError")}
                            />
                        </StaggerItem>
                    ) : null}
                </StaggerGroup>
            ) : null}

            {anyModuleOn ? (
                <section className="grid gap-4 @3xl:grid-cols-3">
                    {financeOn ? (
                        <Card padding="lg" className="@3xl:col-span-2">
                            <h2 className="type-section">{t("chart.title")}</h2>
                            <p className="mt-0.5 text-xs text-ink-faint">{t("chart.subtitle")}</p>
                            {finance.isLoading ? (
                                <Skeleton className="mt-4 h-60 w-full" />
                            ) : finance.isError ? (
                                <EmptyState compact icon="error_outline" title={t("widgetError")} />
                            ) : (
                                <IncomeExpenseChart
                                    className="mt-4"
                                    data={series}
                                    incomeLabel={t("chart.income")}
                                    expenseLabel={t("chart.expense")}
                                    averageLabel={t("chart.average")}
                                    height={240}
                                />
                            )}
                        </Card>
                    ) : null}
                    <NeedsAttentionCard
                        title={t("needsAttention.title")}
                        rows={attentionRows}
                        isLoading={attentionLoading}
                        allClearTitle={t("needsAttention.allClear")}
                        allClearHint={t("needsAttention.allClearHint")}
                        className={cn(!financeOn && "@3xl:col-span-3")}
                    />
                </section>
            ) : null}

            {financeOn ? (
                <RecentActivityCard
                    title={t("recentActivity.title")}
                    items={finance.data?.recent_activity ?? []}
                    isLoading={finance.isLoading}
                    isError={finance.isError}
                    errorLabel={t("widgetError")}
                    emptyTitle={t("recentActivity.empty")}
                    emptyHint={t("recentActivity.emptyHint")}
                    viewAllLabel={t("viewAll")}
                    viewAllHref="/finance/activity"
                />
            ) : null}

            <LauncherGrid />
        </div>
    )
}
