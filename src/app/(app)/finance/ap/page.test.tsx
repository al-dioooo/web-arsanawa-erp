import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import APAgingPage from "./page"
import { useAPAging } from "@/features/finance/api-bills"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api-bills", () => ({
    useAPAging: vi.fn(),
}))

describe("accounts payable aging page", () => {
    it("renders the aging report without the Export PDF action", () => {
        vi.mocked(useAPAging).mockReturnValue({
            data: [
                {
                    partner_id: 20,
                    partner_name: "Sekalori Supplier",
                    current: "150000",
                    days_1_30: "250000",
                    days_31_60: "0",
                    days_61_90: "0",
                    over_90: "0",
                    total: "400000",
                },
            ],
            isLoading: false,
        } as ReturnType<typeof useAPAging>)

        render(<APAgingPage />)

        expect(screen.getByRole("heading", { name: "Accounts Payable Aging" })).toBeInTheDocument()
        expect(screen.getByText("Sekalori Supplier")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Export PDF" })).not.toBeInTheDocument()
    })
})
