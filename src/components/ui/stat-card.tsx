"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { SparkBars } from "@/components/charts/spark-bars"
import { Card, CardLabel, CardValue } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { SkeletonCard } from "@/components/ui/skeleton"
import { useCountUp } from "@/lib/use-count-up"

export interface StatCardProps {
    label: string
    /** When set, the whole card links into the owning module's detail page. */
    href?: string
    value: number
    /**
     * Turns the animated value into the displayed string. MUST be
     * referentially stable (a module-level Intl-bound formatter).
     */
    formatValue: (n: number) => string
    isLoading?: boolean
    isError?: boolean
    /**
     * Title of the compact error state shown when the query failed.
     * Required whenever `isError` can become true.
     */
    errorLabel?: string
    /** Optional pill/trend rendered under the value (e.g. "5 transaksi"). */
    badge?: ReactNode
    /** Optional sparkline series rendered at the bottom of the card. */
    spark?: number[]
    sparkColor?: string
}

/**
 * Dashboard stat tile: label, count-up value, optional badge and sparkline.
 * With `href` the whole card is a link (hover lift + chevron); without it
 * the tile renders as a static metric card.
 */
export function StatCard({
    label,
    href,
    value,
    formatValue,
    isLoading = false,
    isError = false,
    errorLabel,
    badge,
    spark,
    sparkColor,
}: StatCardProps) {
    // Unconditional hook call — loading/error branches render below.
    const display = useCountUp(value, { formatter: formatValue })

    if (isLoading) {
        return <SkeletonCard className="min-h-28" />
    }

    if (isError) {
        return (
            <Card padding="sm" className="min-h-28">
                <EmptyState compact icon="error_outline" title={errorLabel} className="py-3" />
            </Card>
        )
    }

    const body = (
        <>
            <div className="flex items-start justify-between gap-2">
                <CardLabel>{label}</CardLabel>
                {href ? (
                    <Icon
                        name="chevron_right"
                        size={16}
                        className="mt-0.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                    />
                ) : null}
            </div>
            <CardValue className="mt-1">{display}</CardValue>
            {badge ? <div className="mt-2">{badge}</div> : null}
            {spark && spark.length > 0 ? (
                <SparkBars data={spark} color={sparkColor} height={36} className="mt-3" />
            ) : null}
        </>
    )

    if (href) {
        return (
            <Card as={Link} href={href} hover className="group flex min-h-28 flex-col">
                {body}
            </Card>
        )
    }

    return <Card className="flex min-h-28 flex-col">{body}</Card>
}
