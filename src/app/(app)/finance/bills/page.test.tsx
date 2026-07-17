import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import BillsPage from "./page"
import { useBills } from "@/features/finance/api-bills"

const push = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api-bills", () => ({
    useBills: vi.fn(),
}))

describe("finance bills page", () => {
    it("passes selected status to the bills API hook", () => {
        vi.mocked(useBills).mockReturnValue({
            data: [],
            isLoading: false,
        } as unknown as ReturnType<typeof useBills>)

        render(<BillsPage />)

        fireEvent.change(screen.getByLabelText("Status"), {
            target: { value: "partially_paid" },
        })

        expect(useBills).toHaveBeenLastCalledWith(1, expect.objectContaining({
            status: "partially_paid",
        }))
    })

    it("passes bill date range filters to the bills API hook", () => {
        vi.mocked(useBills).mockReturnValue({
            data: [],
            isLoading: false,
        } as unknown as ReturnType<typeof useBills>)

        render(<BillsPage />)

        fireEvent.change(screen.getByLabelText("Bill date from"), {
            target: { value: "2026-06-01" },
        })
        fireEvent.change(screen.getByLabelText("Bill date to"), {
            target: { value: "2026-06-30" },
        })

        expect(useBills).toHaveBeenLastCalledWith(1, expect.objectContaining({
            start_date: "2026-06-01",
            end_date: "2026-06-30",
        }))
    })
})
