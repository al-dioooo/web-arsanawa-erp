import { render } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"

import { SparkBars } from "@/components/charts/spark-bars"

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver
})

describe("SparkBars", () => {
    it("renders a decorative pointer-inert wrapper around a responsive chart", () => {
        const { container } = render(<SparkBars data={[10, 20, 30]} className="mt-3" />)

        const wrapper = container.firstElementChild
        expect(wrapper).toHaveAttribute("aria-hidden", "true")
        expect(wrapper).toHaveClass("pointer-events-none", "w-full", "mt-3")
        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
    })

    it("renders without crashing on an empty series", () => {
        const { container } = render(<SparkBars data={[]} />)

        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
    })
})
