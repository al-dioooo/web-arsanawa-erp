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

vi.mock("next-intl", () => ({
    useTranslations: (namespace?: string) => (key: string) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const labels: Record<string, string> = {
            "finance.payments.filters.status.label": "Status",
            "finance.payments.filters.from": "Payment Date From",
            "finance.payments.filters.to": "Payment Date To",
        }
        return labels[fullKey] ?? fullKey
    },
}))

describe("finance payments page", () => {
    it("passes outbound payment date range filters to the payments API hook", () => {
        vi.mocked(usePayments).mockReturnValue({
            data: [],
            isLoading: false,
        } as unknown as ReturnType<typeof usePayments>)

        render(<PaymentsPage />)

        fireEvent.change(screen.getByLabelText("Payment Date From"), {
            target: { value: "2026-06-01" },
        })
        fireEvent.change(screen.getByLabelText("Payment Date To"), {
            target: { value: "2026-06-30" },
        })

        expect(usePayments).toHaveBeenLastCalledWith(1, expect.objectContaining({
            payment_type: "outbound",
            start_date: "2026-06-01",
            end_date: "2026-06-30",
        }))
    })
})
