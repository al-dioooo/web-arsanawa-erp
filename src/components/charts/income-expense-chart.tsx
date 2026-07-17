"use client"

import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts"

import {
    ChartContainer,
    ChartTooltipContent,
    tooltipProps,
    useChartAnimationActive,
    type ChartTooltipFormatter,
} from "@/components/ui/chart"
import {
    BAR_RADIUS,
    CHART_ANIMATION,
    CHART_EXPENSE,
    CHART_INCOME,
    chartAxisProps,
    chartGridProps,
    REFERENCE_LABEL,
    referenceLineProps,
} from "@/lib/chart-theme"
import { formatIDR } from "@/lib/format"

export interface IncomeExpensePoint {
    /** ISO date (e.g. "2026-07-01") — daily buckets. */
    date: string
    income: number
    expense: number
}

export interface IncomeExpenseChartProps {
    data: IncomeExpensePoint[]
    /** Localized series name for the income bars. */
    incomeLabel: string
    /** Localized series name for the expense bars. */
    expenseLabel: string
    /**
     * Localized prefix for the dashed average line label
     * (e.g. "Rata-rata" → "Rata-rata Rp 1,2 jt").
     */
    averageLabel?: string
    height?: number
    className?: string
}

// Compact IDR for axis ticks and the average marker ("Rp 1,2 jt").
const compactIdr = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
})

function formatCompactIdr(value: number): string {
    return Number.isFinite(value) ? compactIdr.format(value) : compactIdr.format(0)
}

function formatDayTick(value: unknown): string {
    const date = new Date(`${String(value)}T00:00:00`)
    return Number.isNaN(date.getTime()) ? String(value) : String(date.getDate())
}

const tooltipFormatter: ChartTooltipFormatter = (value) =>
    formatIDR(typeof value === "number" ? value : Number(value))

/**
 * Grouped income-vs-expense bar chart for dashboards. Daily buckets on the
 * x-axis, compact IDR ticks, and a dashed reference line marking the average
 * daily income across the visible range.
 */
export function IncomeExpenseChart({
    data,
    incomeLabel,
    expenseLabel,
    averageLabel,
    height = 260,
    className,
}: IncomeExpenseChartProps) {
    const isAnimationActive = useChartAnimationActive()

    const averageIncome =
        data.length > 0 ? data.reduce((sum, point) => sum + point.income, 0) / data.length : 0

    return (
        <ChartContainer height={height} className={className}>
            <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="date" {...chartAxisProps} tickFormatter={formatDayTick} minTickGap={16} />
                <YAxis {...chartAxisProps} width={64} tickFormatter={formatCompactIdr} />
                <Tooltip
                    {...tooltipProps}
                    content={<ChartTooltipContent formatter={tooltipFormatter} />}
                />
                <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    height={28}
                    formatter={(value) => <span className="text-xs text-ink-muted">{value}</span>}
                />
                {averageIncome > 0 ? (
                    <ReferenceLine
                        y={averageIncome}
                        {...referenceLineProps}
                        label={{
                            ...REFERENCE_LABEL,
                            position: "insideTopRight",
                            value: averageLabel
                                ? `${averageLabel} ${formatCompactIdr(averageIncome)}`
                                : formatCompactIdr(averageIncome),
                        }}
                    />
                ) : null}
                <Bar
                    dataKey="income"
                    name={incomeLabel}
                    fill={CHART_INCOME}
                    radius={BAR_RADIUS}
                    {...CHART_ANIMATION.bar}
                    isAnimationActive={isAnimationActive}
                />
                <Bar
                    dataKey="expense"
                    name={expenseLabel}
                    fill={CHART_EXPENSE}
                    radius={BAR_RADIUS}
                    {...CHART_ANIMATION.bar}
                    isAnimationActive={isAnimationActive}
                />
            </BarChart>
        </ChartContainer>
    )
}
