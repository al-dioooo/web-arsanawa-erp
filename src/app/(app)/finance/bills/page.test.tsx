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

vi.mock("next-intl", () => ({
    useTranslations: (namespace?: string) => (key: string) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const labels: Record<string, string> = {
            "finance.bills.filters.status.label": "Status",
            "finance.bills.filters.from": "Bill Date From",
            "finance.bills.filters.to": "Bill Date To",
        }
        return labels[fullKey] ?? fullKey
    },
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

        fireEvent.change(screen.getByLabelText("Bill Date From"), {
            target: { value: "2026-06-01" },
        })
        fireEvent.change(screen.getByLabelText("Bill Date To"), {
            target: { value: "2026-06-30" },
        })

        expect(useBills).toHaveBeenLastCalledWith(1, expect.objectContaining({
            start_date: "2026-06-01",
            end_date: "2026-06-30",
        }))
    })
})
