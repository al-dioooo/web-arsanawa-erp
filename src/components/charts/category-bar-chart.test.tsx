import { render } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"

import { CategoryBarChart } from "@/components/charts/category-bar-chart"

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver
})

const data = [
    { label: "Nasi Goreng", value: 120 },
    { label: "Es Teh", value: 90 },
    { label: "Ayam Bakar", value: 45 },
]

describe("CategoryBarChart", () => {
    it("renders a full-width responsive chart container", () => {
        const { container } = render(
            <CategoryBarChart data={data} valueLabel="Terjual" className="mt-4" />,
        )

        expect(container.firstElementChild).toHaveClass("w-full", "mt-4")
        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
    })

    it("renders without crashing on an empty series", () => {
        const { container } = render(<CategoryBarChart data={[]} />)

        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
    })
})
