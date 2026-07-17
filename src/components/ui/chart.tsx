"use client"

import type { ReactNode } from "react"
import { useReducedMotion } from "motion/react"
import { ResponsiveContainer, Tooltip } from "recharts"
import type {
    DefaultTooltipContentProps,
    TooltipPayloadEntry,
    TooltipProps,
    TooltipValueType,
} from "recharts"

import { barCursorProps } from "@/lib/chart-theme"
import { cn } from "@/lib/utils"

/**
 * Charts must skip their entrance animation for reduced-motion users.
 * Recharts animates via JS (not CSS), so the global MotionConfig cannot
 * reach it — pass this to `isAnimationActive` on every Bar/Line/Area.
 */
export function useChartAnimationActive(): boolean {
    return !useReducedMotion()
}

export interface ChartContainerProps {
    /** Fixed pixel height of the plot; width tracks the parent. */
    height?: number
    className?: string
    children: ReactNode
}

/** Sizing wrapper for every chart: full-width, fixed height. */
export function ChartContainer({ height = 260, className, children }: ChartContainerProps) {
    return (
        <div className={cn("w-full", className)}>
            <ResponsiveContainer width="100%" height={height}>
                {children}
            </ResponsiveContainer>
        </div>
    )
}

/** Recharts' formatter contract: return a node, or [value, name] to rename the row. */
export type ChartTooltipFormatter = NonNullable<DefaultTooltipContentProps["formatter"]>

/**
 * Loose structural view of a Recharts tooltip payload entry — every real
 * `TooltipPayloadEntry` is assignable to it, and tests can fake it without
 * Recharts internals like `graphicalItemId`.
 */
export interface ChartTooltipEntry {
    color?: string
    fill?: string
    stroke?: string
    name?: string | number
    value?: TooltipValueType
    dataKey?: unknown
}

export interface ChartTooltipContentProps {
    active?: boolean
    label?: ReactNode
    payload?: ReadonlyArray<ChartTooltipEntry>
    formatter?: ChartTooltipFormatter
}

/**
 * Themed tooltip panel. Pass to a Recharts Tooltip as
 * `content={ChartTooltipContent}` (or use <ChartTooltip /> below).
 */
export function ChartTooltipContent({ active, payload, label, formatter }: ChartTooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null

    return (
        <div className="rounded-md bg-surface-raised px-3 py-2 shadow-card-hover">
            {label !== undefined && label !== null && label !== "" ? (
                <p className="type-card-label mb-1">{label}</p>
            ) : null}
            <div className="flex flex-col gap-1">
                {payload.map((entry, index) => {
                    const swatch = entry.color ?? entry.fill ?? entry.stroke
                    let name: ReactNode = entry.name
                    let value: ReactNode = entry.value

                    if (formatter && entry.value !== undefined) {
                        // Safe casts: ChartTooltipEntry is a structural subset of
                        // TooltipPayloadEntry and formatters only read from it.
                        const formatted = formatter(
                            entry.value,
                            entry.name,
                            entry as TooltipPayloadEntry,
                            index,
                            payload as ReadonlyArray<TooltipPayloadEntry>,
                        )
                        if (Array.isArray(formatted)) {
                            value = formatted[0]
                            name = formatted[1] ?? name
                        } else if (formatted !== undefined && formatted !== null) {
                            value = formatted
                        }
                    }

                    return (
                        <div key={index} className="flex items-center gap-2">
                            <span
                                aria-hidden="true"
                                className="size-2 shrink-0 rounded-pill"
                                style={{ backgroundColor: swatch }}
                            />
                            <span className="text-xs text-ink-muted">{name}</span>
                            <span className="ms-auto text-sm font-bold text-ink tabular-nums">{value}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/** Preconfigured Tooltip props: no fade-lag, muted bar-hover cursor. */
export const tooltipProps = {
    isAnimationActive: false,
    cursor: barCursorProps,
} as const satisfies TooltipProps

/**
 * Drop-in themed Tooltip: <ChartTooltip /> inside any chart. Extra props
 * override the preconfigured ones (e.g. `cursor={false}` for line charts).
 */
export function ChartTooltip(props: TooltipProps) {
    return <Tooltip {...tooltipProps} content={<ChartTooltipContent />} {...props} />
}
