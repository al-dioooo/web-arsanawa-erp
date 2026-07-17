"use client"

import { Bar, BarChart, ResponsiveContainer } from "recharts"

import { useChartAnimationActive } from "@/components/ui/chart"
import { CHART_ANIMATION, CHART_INCOME } from "@/lib/chart-theme"
import { cn } from "@/lib/utils"

export interface SparkBarsProps {
    /** Series values, in display order (oldest first). */
    data: number[]
    /** Bar fill — pass a chart-theme token (defaults to the income teal). */
    color?: string
    /** Fixed pixel height of the sparkline. */
    height?: number
    className?: string
}

/**
 * Tiny axis-less bar sparkline for stat cards. Purely decorative: no axes,
 * no tooltip, and hidden from assistive tech — always pair it with a visible
 * text value that carries the actual number.
 */
export function SparkBars({ data, color = CHART_INCOME, height = 40, className }: SparkBarsProps) {
    const isAnimationActive = useChartAnimationActive()
    const chartData = data.map((value, index) => ({ index, value }))

    return (
        <div aria-hidden="true" className={cn("pointer-events-none w-full", className)}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Bar
                        dataKey="value"
                        fill={color}
                        radius={[2, 2, 0, 0]}
                        {...CHART_ANIMATION.bar}
                        isAnimationActive={isAnimationActive}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
