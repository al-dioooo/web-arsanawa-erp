import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import PaymentsPage from "./page"
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

describe("finance payments page", () => {
    it("passes outbound payment date range filters to the payments API hook", () => {
        vi.mocked(usePayments).mockReturnValue({
            data: [],
            isLoading: false,
        } as ReturnType<typeof usePayments>)

        render(<PaymentsPage />)

        fireEvent.change(screen.getByLabelText("Payment date from"), {
            target: { value: "2026-06-01" },
        })
        fireEvent.change(screen.getByLabelText("Payment date to"), {
            target: { value: "2026-06-30" },
        })

        expect(usePayments).toHaveBeenLastCalledWith(1, expect.objectContaining({
            payment_type: "outbound",
            start_date: "2026-06-01",
            end_date: "2026-06-30",
        }))
    })
})
