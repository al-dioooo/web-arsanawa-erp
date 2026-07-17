"use client"

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import {
    ChartContainer,
    ChartTooltipContent,
    tooltipProps,
    useChartAnimationActive,
    type ChartTooltipFormatter,
} from "@/components/ui/chart"
import { CHART_ANIMATION, CHART_SERIES, chartAxisProps, chartGridProps } from "@/lib/chart-theme"

export interface CategoryDatum {
    label: string
    value: number
}

export interface CategoryBarChartProps {
    data: CategoryDatum[]
    /** Localized series name shown in the tooltip. */
    valueLabel?: string
    /** Bar fill — pass a chart-theme token (defaults to the first series colour). */
    color?: string
    /** Formats tick and tooltip values (defaults to plain id-ID numbers). */
    valueFormatter?: (value: number) => string
    height?: number
    /** Pixel width reserved for category labels on the y-axis. */
    labelWidth?: number
    className?: string
}

const defaultNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

function formatDefault(value: number): string {
    return Number.isFinite(value) ? defaultNumber.format(value) : defaultNumber.format(0)
}

/** Rounded end on the value side, square base against the axis. */
const HORIZONTAL_BAR_RADIUS: [number, number, number, number] = [0, 6, 6, 0]

/**
 * Horizontal category ranking chart ({label, value} rows) — e.g. top products
 * in POS reports. Categories on the y-axis, values growing to the right.
 */
export function CategoryBarChart({
    data,
    valueLabel,
    color = CHART_SERIES[0],
    valueFormatter = formatDefault,
    height = 260,
    labelWidth = 120,
    className,
}: CategoryBarChartProps) {
    const isAnimationActive = useChartAnimationActive()

    const tooltipFormatter: ChartTooltipFormatter = (value) =>
        valueFormatter(typeof value === "number" ? value : Number(value))

    return (
        <ChartContainer height={height} className={className}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...chartGridProps} horizontal={false} vertical />
                <XAxis
                    type="number"
                    {...chartAxisProps}
                    tickFormatter={(value: number) => valueFormatter(value)}
                />
                <YAxis type="category" dataKey="label" {...chartAxisProps} width={labelWidth} />
                <Tooltip
                    {...tooltipProps}
                    content={<ChartTooltipContent formatter={tooltipFormatter} />}
                />
                <Bar
                    dataKey="value"
                    name={valueLabel}
                    fill={color}
                    radius={HORIZONTAL_BAR_RADIUS}
                    {...CHART_ANIMATION.bar}
                    isAnimationActive={isAnimationActive}
                />
            </BarChart>
        </ChartContainer>
    )
}
