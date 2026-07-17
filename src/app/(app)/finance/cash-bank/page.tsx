"use client"

import { useTranslations } from "next-intl"
import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, usePeriods, type COAAccount } from "@/features/finance/api"
import { useTrialBalance } from "@/features/finance/api-journals"
import { formatIDR } from "@/lib/format"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function CashBankPage() {
    const t = useTranslations("finance.cashBank")
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
                title={t("title")}
                subtitle={activePeriod ? t("subtitle", { period: activePeriod.name }) : undefined}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading && (
                    <>
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton key={index} className="h-52 w-full rounded-lg" />
                        ))}
                    </>
                )}
                {!isLoading && isError && (
                    <div className="col-span-full">
                        <EmptyState icon="error_outline" title={t("error")} />
                    </div>
                )}
                {!isLoading && !isError && !activePeriod && (
                    <div className="col-span-full">
                        <EmptyState icon="calendar_month" title={t("noPeriod")} />
                    </div>
                )}
                {!isLoading && !isError && activePeriod && cashBankAccounts.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState icon="account_balance" title={t("noAccounts")} />
                    </div>
                )}
                {!isError && activePeriod && cashBankAccounts.map(account => {
                    // Find balance in the trial balance (a flat array of account rows).
                    const tbLine = tbLines.find(line => line.account_id === account.id)
                    const balance = tbLine ? tbLine.debit - tbLine.credit : 0

                    return (
                        <Card
                            key={account.id}
                            as={Link}
                            href={`/finance/journals/account/${account.id}`} // Links to Account Ledger (Stage 6)
                            padding="lg"
                            hover
                            className="group flex flex-col"
                        >
                            <div className="mb-8 flex items-start justify-between">
                                <div className="rounded-md bg-brand-soft p-3 text-brand-ink transition-transform group-hover:scale-110">
                                    <Icon name="account_balance" size={28} />
                                </div>
                                <div className="rounded-md bg-surface-muted px-2 py-1 text-xs font-bold tracking-wider text-ink-faint">
                                    {account.code}
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="mb-1 font-semibold text-ink transition-colors group-hover:text-brand-ink">
                                    {account.name}
                                </h3>
                                <div className="mb-6 text-sm text-ink-muted">{t("categoryLabel")}</div>

                                <div className="mt-auto">
                                    <div className="type-card-label mb-1 uppercase tracking-wider">{t("currentBalance")}</div>
                                    <div className={cn("type-card-value tabular-nums", balance < 0 && "text-error-strong")}>
                                        {formatIDR(balance)}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
