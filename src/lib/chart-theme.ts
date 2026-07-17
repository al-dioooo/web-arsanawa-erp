/*
 * Chart theme tokens — the single source of truth for Recharts styling.
 *
 * Every colour is a CSS-variable string (SVG accepts `var()`), so charts
 * flip automatically with the light/dark theme instead of baking in hex
 * values. Spread the prop objects onto the matching Recharts primitives:
 *
 * - <XAxis {...chartAxisProps} /> / <YAxis {...chartAxisProps} />
 * - <CartesianGrid {...chartGridProps} />
 * - <ReferenceLine {...referenceLineProps} label={{ ...REFERENCE_LABEL, value: "…" }} />
 * - <Bar radius={BAR_RADIUS} {...CHART_ANIMATION.bar} />
 * - <Line {...CHART_ANIMATION.line} />
 * - <Tooltip cursor={barCursorProps} />
 */

/** Categorical series palette, in assignment order. */
export const CHART_SERIES = [
    "var(--color-teal-500)",
    "var(--color-orange-500)",
    "var(--color-yellow-500)",
    "var(--color-navy-300)",
    "var(--color-teal-300)",
] as const

/** Semantic anchors for finance charts (income vs expense). */
export const CHART_INCOME = "var(--color-teal-500)"
export const CHART_EXPENSE = "var(--color-orange-500)"

/** Shared XAxis/YAxis props: faint 11px ticks, no axis or tick lines. */
export const chartAxisProps = {
    tick: { fill: "var(--ink-faint)", fontSize: 11, fontFamily: "var(--font-sans)" },
    axisLine: false,
    tickLine: false,
} as const

/** CartesianGrid props: dashed horizontal hairlines only. */
export const chartGridProps = {
    stroke: "var(--line)",
    strokeDasharray: "3 3",
    vertical: false,
} as const

/** ReferenceLine props (targets, budgets, break-even markers). */
export const referenceLineProps = {
    stroke: "var(--brand)",
    strokeDasharray: "4 4",
} as const

/** Label style for reference lines — pair with `referenceLineProps`. */
export const REFERENCE_LABEL = {
    fill: "var(--brand)",
    fontSize: 10,
    fontWeight: 700,
} as const

/** Bar corner radius: rounded top, square base. */
export const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0]

/** Tooltip hover cursor for bar charts — a muted well behind the bars. */
export const barCursorProps = { fill: "var(--surface-muted)" } as const

/**
 * Entrance animation config per chart type. Gate with
 * `isAnimationActive={useChartAnimationActive()}` (see @/components/ui/chart)
 * so reduced-motion users skip the entrance entirely.
 */
export const CHART_ANIMATION = {
    bar: { animationDuration: 600, animationEasing: "ease-out" as const, animationBegin: 100 },
    line: { animationDuration: 700, animationEasing: "ease-out" as const, animationBegin: 100 },
} as const
