"use client"

import Link from "next/link"
import { useFormatter } from "next-intl"

import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import type { FinanceDashboardSummary } from "@/features/finance/api"
import { formatIDR } from "@/lib/format"

type ActivityItem = FinanceDashboardSummary["recent_activity"][number]

export interface RecentActivityCardProps {
    title: string
    items: ActivityItem[]
    isLoading?: boolean
    isError?: boolean
    errorLabel: string
    emptyTitle: string
    emptyHint?: string
    viewAllLabel: string
    viewAllHref: string
    className?: string
}

function activityHref(item: ActivityItem): string {
    return item.type === "invoice" ? `/finance/invoices/${item.id}` : `/finance/bills/${item.id}`
}

/** Finance recent-activity feed: latest invoices and bills with status. */
export function RecentActivityCard({
    title,
    items,
    isLoading = false,
    isError = false,
    errorLabel,
    emptyTitle,
    emptyHint,
    viewAllLabel,
    viewAllHref,
    className,
}: RecentActivityCardProps) {
    const format = useFormatter()

    return (
        <Card padding="lg" className={className}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="type-section">{title}</h2>
                <Link
                    href={viewAllHref}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink transition-colors hover:text-brand"
                >
                    {viewAllLabel}
                    <Icon name="chevron_right" size={16} />
                </Link>
            </div>

            {isLoading ? (
                <div className="mt-4 grid gap-4" aria-hidden="true">
                    {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-pill" />
                            <SkeletonText lines={2} className="flex-1" />
                        </div>
                    ))}
                </div>
            ) : isError ? (
                <EmptyState compact icon="error_outline" title={errorLabel} />
            ) : items.length === 0 ? (
                <EmptyState compact icon="history" title={emptyTitle} description={emptyHint} />
            ) : (
                <ul className="mt-2 grid gap-1">
                    {items.map((item) => (
                        <li key={`${item.type}-${item.id}`}>
                            <Link
                                href={activityHref(item)}
                                className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface-muted"
                            >
                                <span
                                    className={
                                        item.type === "invoice"
                                            ? "flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand-ink"
                                            : "flex size-9 shrink-0 items-center justify-center rounded-pill bg-warning-soft text-warning-strong"
                                    }
                                >
                                    <Icon name={item.type === "invoice" ? "request_quote" : "receipt"} size={18} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">
                                        {item.number}
                                    </span>
                                    <span className="block text-xs text-ink-faint">
                                        {item.date
                                            ? format.dateTime(new Date(`${item.date}T00:00:00`), {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "—"}
                                    </span>
                                </span>
                                <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                                    {formatIDR(item.total)}
                                </span>
                                <StatusBadge status={item.status} />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    )
}
