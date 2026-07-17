import { render } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"

import { IncomeExpenseChart } from "@/components/charts/income-expense-chart"

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver
})

const data = [
    { date: "2026-07-01", income: 1200000, expense: 800000 },
    { date: "2026-07-02", income: 900000, expense: 400000 },
    { date: "2026-07-03", income: 1500000, expense: 650000 },
]

describe("IncomeExpenseChart", () => {
    it("renders a full-width responsive chart container", () => {
        const { container } = render(
            <IncomeExpenseChart
                data={data}
                incomeLabel="Pemasukan"
                expenseLabel="Pengeluaran"
                averageLabel="Rata-rata"
                className="mt-4"
            />,
        )

        expect(container.firstElementChild).toHaveClass("w-full", "mt-4")
        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
    })

    it("renders without crashing on an empty series", () => {
        const { container } = render(
            <IncomeExpenseChart data={[]} incomeLabel="Income" expenseLabel="Expense" />,
        )

        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
    })
})
