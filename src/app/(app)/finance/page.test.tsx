import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import FinanceDashboard from "./page"
import { useCOA, useFinanceDashboardSummary, usePeriods } from "@/features/finance/api"
import { useTrialBalance } from "@/features/finance/api-journals"

const push = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api", () => ({
    useCOA: vi.fn(),
    useFinanceDashboardSummary: vi.fn(),
    usePeriods: vi.fn(),
}))

vi.mock("@/features/finance/api-journals", () => ({
    useTrialBalance: vi.fn(),
}))

describe("finance dashboard", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2026, 5, 15, 9, 0, 0))
        push.mockReset()

        vi.mocked(useCOA).mockReturnValue({
            data: [],
        } as ReturnType<typeof useCOA>)
        vi.mocked(usePeriods).mockReturnValue({
            data: [{ id: 4, company_id: 1, name: "June 2026", start_date: "2026-06-01", end_date: "2026-06-30", status: "open", closed_at: null }],
        } as ReturnType<typeof usePeriods>)
        vi.mocked(useTrialBalance).mockReturnValue({
            data: [],
        } as ReturnType<typeof useTrialBalance>)
        vi.mocked(useFinanceDashboardSummary).mockReturnValue({
            data: {
                counters: {
                    ar_outstanding: "125000.0000",
                    ap_outstanding: "45000.0000",
                    pending_approvals: 2,
                    draft_invoices: 0,
                    draft_bills: 0,
                },
                recent_activity: [],
                income_expense_series: [
                    { date: "2026-06-01", income: 100000, expense: 25000 },
                    { date: "2026-06-02", income: 0, expense: 50000 },
                ],
            },
            isLoading: false,
        } as ReturnType<typeof useFinanceDashboardSummary>)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("renders an income and expense chart with current-month date filters", () => {
        render(<FinanceDashboard />)

        const chart = screen.getByRole("region", { name: "Income and expense chart" })
        expect(within(chart).getByText("Income vs Expense")).toBeInTheDocument()
        expect(screen.getByLabelText("Dashboard start date")).toHaveValue("2026-06-01")
        expect(screen.getByLabelText("Dashboard end date")).toHaveValue("2026-06-30")
        expect(within(chart).getByText("01 Jun")).toBeInTheDocument()
        expect(within(chart).getByText("02 Jun")).toBeInTheDocument()
        expect(useFinanceDashboardSummary).toHaveBeenCalledWith(1, {
            start_date: "2026-06-01",
            end_date: "2026-06-30",
        })
    })

    it("passes changed dashboard dates to the summary hook", () => {
        render(<FinanceDashboard />)

        fireEvent.change(screen.getByLabelText("Dashboard start date"), { target: { value: "2026-06-10" } })
        fireEvent.change(screen.getByLabelText("Dashboard end date"), { target: { value: "2026-06-20" } })

        expect(useFinanceDashboardSummary).toHaveBeenLastCalledWith(1, {
            start_date: "2026-06-10",
            end_date: "2026-06-20",
        })
    })
})
