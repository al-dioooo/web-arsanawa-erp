"use client"

import Link from "next/link"

import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"

export interface AttentionRow {
    key: string
    icon: string
    label: string
    count: number
    href: string
}

export interface NeedsAttentionCardProps {
    title: string
    /** Pre-filtered rows — pass only module-on, count > 0 items. */
    rows: AttentionRow[]
    isLoading?: boolean
    allClearTitle: string
    allClearHint?: string
    className?: string
}

/**
 * "Perlu Tindakan" work queue: one row per pending item across modules,
 * or a friendly all-clear state when nothing needs attention.
 */
export function NeedsAttentionCard({
    title,
    rows,
    isLoading = false,
    allClearTitle,
    allClearHint,
    className,
}: NeedsAttentionCardProps) {
    return (
        <Card padding="lg" className={className}>
            <h2 className="type-section">{title}</h2>

            {isLoading ? (
                <div className="mt-4 grid gap-3" aria-hidden="true">
                    {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-pill" />
                            <Skeleton className="h-3.5 flex-1" />
                            <Skeleton className="h-5 w-8 rounded-pill" />
                        </div>
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState compact icon="check_circle" title={allClearTitle} description={allClearHint} />
            ) : (
                <ul className="mt-2 grid gap-1">
                    {rows.map((row) => (
                        <li key={row.key}>
                            <Link
                                href={row.href}
                                className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface-muted"
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-warning-soft text-warning-strong">
                                    <Icon name={row.icon} size={18} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                                    {row.label}
                                </span>
                                <StatusPill tone="amber">{row.count}</StatusPill>
                                <Icon name="chevron_right" size={16} className="shrink-0 text-ink-faint" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    )
}
