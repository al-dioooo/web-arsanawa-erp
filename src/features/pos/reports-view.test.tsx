import { fireEvent, render, screen } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
    BreakdownCard,
    ReportsView,
    labelCaseKey,
    toBreakdownData,
} from "@/features/pos/reports-view"
import * as posApi from "@/features/pos/pos-api"
import type { SalesReport } from "@/features/pos/pos-types"

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver
})

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}))

vi.mock("sonner", () => ({
    toast: { error: vi.fn() },
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        token: "token-1",
        activeCompanyId: 1,
        organizationContext: { branches: [] },
    }),
}))

vi.mock("@/features/pos/pos-api", () => ({
    getSalesReport: vi.fn(),
    getShiftReport: vi.fn(),
    listShifts: vi.fn(),
}))

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(posApi.listShifts).mockResolvedValue([])
})

describe("toBreakdownData", () => {
    it("parses API decimal strings into numeric chart values", () => {
        const data = toBreakdownData({ cash: "150000.0000", transfer: "50000.5000" }, (key) => key)

        expect(data).toEqual([
            { label: "cash", value: 150000 },
            { label: "transfer", value: 50000.5 },
        ])
    })

    it("ranks rows largest-first", () => {
        const data = toBreakdownData({ a: "10.0000", b: "300.0000", c: "20.0000" }, (key) => key)

        expect(data.map((row) => row.label)).toEqual(["b", "c", "a"])
    })

    it("label-cases unknown keys by default and tolerates unparseable values", () => {
        const data = toBreakdownData({ bank_transfer: "not-a-number" })

        expect(data).toEqual([{ label: "Bank transfer", value: 0 }])
    })

    it("returns an empty list for an empty record", () => {
        expect(toBreakdownData({})).toEqual([])
    })
})

describe("labelCaseKey", () => {
    it("turns snake/kebab keys into sentence-cased labels", () => {
        expect(labelCaseKey("bank_transfer")).toBe("Bank transfer")
        expect(labelCaseKey("e-wallet")).toBe("E wallet")
        expect(labelCaseKey("cash")).toBe("Cash")
    })
})

describe("BreakdownCard", () => {
    it("renders an EmptyState for an empty record instead of a chart", () => {
        const { container } = render(
            <BreakdownCard
                title="By type"
                rows={{}}
                emptyTitle="No data yet"
                valueLabel="Sales"
            />,
        )

        expect(screen.getByText("No data yet")).toBeInTheDocument()
        expect(container.querySelector('[data-slot="empty-state"]')).not.toBeNull()
        expect(container.querySelector(".recharts-responsive-container")).toBeNull()
    })

    it("renders a chart when the record has entries", () => {
        const { container } = render(
            <BreakdownCard
                title="By payment method"
                rows={{ cash: "150000.0000" }}
                emptyTitle="No data yet"
                valueLabel="Sales"
            />,
        )

        expect(screen.queryByText("No data yet")).not.toBeInTheDocument()
        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
    })
})

const report: SalesReport = {
    from: "2026-07-01",
    to: "2026-07-17",
    total_sales: "350000.0000",
    sale_count: 12,
    by_type: { counter: "250000.0000", catering: "100000.0000" },
    by_payment_method: {},
}

describe("ReportsView", () => {
    it("prompts for a date range before a report has been run", async () => {
        render(<ReportsView />)

        expect(await screen.findByText("sales.empty")).toBeInTheDocument()
        expect(screen.getByText("sales.emptyHint")).toBeInTheDocument()
        expect(screen.queryByText("sales.totalSales")).not.toBeInTheDocument()
    })

    it("shows the empty shift state when no shifts exist", async () => {
        render(<ReportsView />)

        expect(await screen.findByText("shift.empty")).toBeInTheDocument()
    })

    it("runs the sales report and renders stat cards plus breakdown charts", async () => {
        vi.mocked(posApi.getSalesReport).mockResolvedValue(report)

        const { container } = render(<ReportsView />)

        fireEvent.click(await screen.findByRole("button", { name: "sales.run" }))

        expect(await screen.findByText("sales.totalSales")).toBeInTheDocument()
        expect(posApi.getSalesReport).toHaveBeenCalledWith(
            { token: "token-1", companyId: 1 },
            expect.objectContaining({ branch_id: null }),
        )

        // String decimals parsed and formatted as IDR / plain numbers.
        expect(screen.getByText(/350\.000/)).toBeInTheDocument()
        expect(screen.getByText("sales.saleCount")).toBeInTheDocument()
        expect(screen.getByText("12")).toBeInTheDocument()

        // by_type has rows -> chart; by_payment_method is empty -> EmptyState.
        expect(container.querySelector(".recharts-responsive-container")).not.toBeNull()
        expect(screen.getByText("sales.breakdownEmpty")).toBeInTheDocument()

        // The pre-run prompt is gone once results are in.
        expect(screen.queryByText("sales.empty")).not.toBeInTheDocument()
    })
})
