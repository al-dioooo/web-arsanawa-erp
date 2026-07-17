import { render, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import {
    ChartContainer,
    ChartTooltipContent,
    tooltipProps,
    useChartAnimationActive,
} from "@/components/ui/chart"
import { barCursorProps } from "@/lib/chart-theme"
import { resetPrefersReducedMotion, setPrefersReducedMotion } from "@/test/reduced-motion"

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver
})

afterEach(() => resetPrefersReducedMotion())

describe("ChartTooltipContent", () => {
    const payload = [
        { name: "Income", value: 1200, color: "var(--color-teal-500)" },
        { name: "Expense", value: 800, color: "var(--color-orange-500)" },
    ]

    it("renders nothing while inactive or empty", () => {
        const inactive = render(<ChartTooltipContent active={false} payload={payload} />)
        expect(inactive.container).toBeEmptyDOMElement()

        const empty = render(<ChartTooltipContent active payload={[]} />)
        expect(empty.container).toBeEmptyDOMElement()
    })

    it("renders a raised panel with a label line and one row per series", () => {
        const { container } = render(
            <ChartTooltipContent active label="May 2026" payload={payload} />,
        )

        expect(container.firstElementChild).toHaveClass(
            "rounded-md",
            "bg-surface-raised",
            "shadow-card-hover",
        )
        expect(screen.getByText("May 2026")).toHaveClass("type-card-label")
        expect(screen.getByText("Income")).toHaveClass("text-xs", "text-ink-muted")
        expect(screen.getByText("Expense")).toBeInTheDocument()
        expect(screen.getByText("1200")).toHaveClass("text-sm", "font-bold", "text-ink", "tabular-nums")

        const swatches = container.querySelectorAll(".rounded-pill")
        expect(swatches).toHaveLength(2)
        expect(swatches[0]).toHaveClass("size-2")
    })

    it("formats values through the formatter, including [value, name] tuples", () => {
        render(
            <ChartTooltipContent
                active
                payload={[{ name: "Income", value: 1200 }]}
                formatter={(value, name) => [`Rp ${value}`, `Total ${name}`]}
            />,
        )

        expect(screen.getByText("Rp 1200")).toBeInTheDocument()
        expect(screen.getByText("Total Income")).toBeInTheDocument()
    })
})

describe("ChartContainer", () => {
    it("merges the wrapper className around a full-width responsive container", () => {
        const { container } = render(
            <ChartContainer height={200} className="mt-4">
                <svg />
            </ChartContainer>,
        )

        expect(container.firstElementChild).toHaveClass("w-full", "mt-4")
        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
    })
})

describe("useChartAnimationActive", () => {
    it("disables chart entrance animation for reduced-motion users", () => {
        setPrefersReducedMotion(true)
        const { result } = renderHook(() => useChartAnimationActive())
        expect(result.current).toBe(false)
    })

    it("keeps animation on otherwise", () => {
        const { result } = renderHook(() => useChartAnimationActive())
        expect(result.current).toBe(true)
    })
})

describe("tooltipProps", () => {
    it("disables tooltip fade-lag and uses the muted bar cursor", () => {
        expect(tooltipProps.isAnimationActive).toBe(false)
        expect(tooltipProps.cursor).toBe(barCursorProps)
    })
})
