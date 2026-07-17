"use client"

import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { useInvoices } from "@/features/finance/api-invoices"
import { useBills } from "@/features/finance/api-bills"
import { usePayments } from "@/features/finance/api-payments"
import { useJournalEntries } from "@/features/finance/api-journals"
import { PageHeader } from "@/features/finance/components/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatIDR, formatDateID } from "@/lib/format"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

type ActivityItem = {
    id: number
    type: "invoice" | "bill" | "payment" | "journal"
    title: string
    reference: string
    date: string
    description: string
    amount: number
    status: string
    link: string
    icon: string
    color: string
    bgColor: string
}

export default function ActivityFeedPage() {
    const t = useTranslations("finance.activity")
    const { activeCompanyId } = useSession()

    // Fetch all transaction streams
    const { data: invoices = [], isLoading: loadingInvoices } = useInvoices(activeCompanyId)
    const { data: bills = [], isLoading: loadingBills } = useBills(activeCompanyId)
    const { data: payments = [], isLoading: loadingPayments } = usePayments(activeCompanyId)
    const { data: journals = [], isLoading: loadingJournals } = useJournalEntries(activeCompanyId)

    const isLoading = loadingInvoices || loadingBills || loadingPayments || loadingJournals

    // Transform and aggregate into a unified stream
    const activities: ActivityItem[] = []

    invoices.forEach(inv => {
        activities.push({
            id: inv.id,
            type: "invoice",
            title: t("types.invoice"),
            reference: inv.invoice_number,
            date: inv.invoice_date,
            description: t("customerPrefix", { name: inv.partner?.name || t("partnerFallback", { id: inv.partner_id }) }),
            amount: parseFloat(inv.total),
            status: inv.status,
            link: `/finance/invoices/${inv.id}`,
            icon: "request_quote",
            color: "text-brand-ink",
            bgColor: "bg-brand-soft"
        })
    })

    bills.forEach(bill => {
        activities.push({
            id: bill.id,
            type: "bill",
            title: t("types.bill"),
            reference: bill.bill_number,
            date: bill.bill_date,
            description: t("supplierPrefix", { name: bill.partner?.name || t("partnerFallback", { id: bill.partner_id }) }),
            amount: parseFloat(bill.total),
            status: bill.status,
            link: `/finance/bills/${bill.id}`,
            icon: "receipt",
            // Raw orange is the sanctioned brand accent shade.
            color: "text-orange-700",
            bgColor: "bg-orange-100"
        })
    })

    payments.forEach(pay => {
        const isDisbursement = pay.payment_type === "outbound"
        const partnerName = pay.partner?.name || t("partnerFallback", { id: pay.partner_id })
        activities.push({
            id: pay.id,
            type: "payment",
            title: isDisbursement ? t("types.paymentOut") : t("types.paymentIn"),
            reference: pay.payment_number,
            date: pay.payment_date,
            description: isDisbursement ? t("toPrefix", { name: partnerName }) : t("fromPrefix", { name: partnerName }),
            amount: parseFloat(pay.amount),
            status: pay.status,
            link: `/finance/payments/${pay.id}`,
            icon: isDisbursement ? "account_balance_wallet" : "savings",
            color: isDisbursement ? "text-error-strong" : "text-success-strong",
            bgColor: isDisbursement ? "bg-error-soft" : "bg-success-soft"
        })
    })

    journals.forEach(entry => {
        const debitSum = entry.lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0
        activities.push({
            id: entry.id,
            type: "journal",
            title: t("types.journal"),
            reference: entry.entry_number || `JE-${entry.id}`,
            date: entry.entry_date,
            description: entry.description || t("manualAdjustment"),
            amount: debitSum,
            status: entry.status,
            link: `/finance/journals/${entry.id}`,
            icon: "menu_book",
            color: "text-warning-strong",
            bgColor: "bg-warning-soft"
        })
    })

    // Sort chronologically (newest first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="mx-auto w-full max-w-4xl">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
            />

            {isLoading && (
                <div className="flex flex-col gap-4" aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-28 w-full rounded-lg" />
                    ))}
                </div>
            )}

            {!isLoading && activities.length === 0 && (
                <Card padding="lg">
                    <EmptyState
                        icon="history"
                        title={t("emptyTitle")}
                        description={t("emptyDescription")}
                    />
                </Card>
            )}

            {!isLoading && activities.length > 0 && (
                <div className="flex flex-col gap-4">
                    {activities.map((item, index) => (
                        <Card
                            key={`${item.type}-${item.id}-${index}`}
                            padding="md"
                            hover
                            className="group flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`shrink-0 rounded-md p-3 ${item.bgColor}`}>
                                    <Icon name={item.icon} size={20} className={item.color} />
                                </div>
                                <div>
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="type-card-label uppercase tracking-wider">{item.title}</span>
                                        <span className="text-ink-faint">&bull;</span>
                                        <span className="text-xs font-semibold text-ink-muted">{formatDateID(item.date)}</span>
                                    </div>
                                    <Link
                                        href={item.link}
                                        className="block text-base font-bold text-ink transition-colors hover:underline group-hover:text-brand-ink"
                                    >
                                        {item.reference}
                                    </Link>
                                    <p className="mt-0.5 text-sm text-ink-muted">{item.description}</p>
                                </div>
                            </div>

                            <div className="flex w-full shrink-0 items-end justify-between gap-2 border-t border-line pt-3 sm:w-auto sm:flex-col sm:justify-center sm:border-t-0 sm:pt-0">
                                <span className="text-lg font-bold text-ink tabular-nums">
                                    {formatIDR(item.amount)}
                                </span>
                                <StatusBadge status={item.status} />
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
