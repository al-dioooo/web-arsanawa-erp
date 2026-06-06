import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import ARAgingPage from "./page"
import { useARAging } from "@/features/finance/api-invoices"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api-invoices", () => ({
    useARAging: vi.fn(),
}))

describe("accounts receivable aging page", () => {
    it("renders the aging report without the Export PDF action", () => {
        vi.mocked(useARAging).mockReturnValue({
            data: [
                {
                    partner_id: 10,
                    partner_name: "Sekalori Customer",
                    current: "100000",
                    days_1_30: "200000",
                    days_31_60: "0",
                    days_61_90: "0",
                    over_90: "0",
                    total: "300000",
                },
            ],
            isLoading: false,
        } as ReturnType<typeof useARAging>)

        render(<ARAgingPage />)

        expect(screen.getByRole("heading", { name: "Accounts Receivable Aging" })).toBeInTheDocument()
        expect(screen.getByText("Sekalori Customer")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Export PDF" })).not.toBeInTheDocument()
    })
})
