import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import ReceiptsPage from "./page"
import { usePayments } from "@/features/finance/api-payments"

const push = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api-payments", () => ({
    usePayments: vi.fn(),
}))

describe("finance receipts page", () => {
    it("passes inbound receipt date range filters to the payments API hook", () => {
        vi.mocked(usePayments).mockReturnValue({
            data: [],
            isLoading: false,
        } as ReturnType<typeof usePayments>)

        render(<ReceiptsPage />)

        fireEvent.change(screen.getByLabelText("Receipt date from"), {
            target: { value: "2026-06-01" },
        })
        fireEvent.change(screen.getByLabelText("Receipt date to"), {
            target: { value: "2026-06-30" },
        })

        expect(usePayments).toHaveBeenLastCalledWith(1, expect.objectContaining({
            payment_type: "inbound",
            start_date: "2026-06-01",
            end_date: "2026-06-30",
        }))
    })
})
