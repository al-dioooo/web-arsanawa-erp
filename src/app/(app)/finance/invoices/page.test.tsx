import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import InvoicesPage from "./page"
import { useInvoices } from "@/features/finance/api-invoices"

const push = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api-invoices", () => ({
    useInvoices: vi.fn(),
}))

vi.mock("next-intl", () => ({
    useTranslations: (namespace?: string) => (key: string) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const labels: Record<string, string> = {
            "finance.invoices.filters.from": "Invoice Date From",
            "finance.invoices.filters.to": "Invoice Date To",
            "finance.invoices.empty": "No invoices found. Create one to get started.",
        }
        return labels[fullKey] ?? fullKey
    },
}))

describe("finance invoices page", () => {
    it("passes invoice date range filters to the invoices API hook", () => {
        vi.mocked(useInvoices).mockReturnValue({
            data: [],
            isLoading: false,
        } as unknown as ReturnType<typeof useInvoices>)

        render(<InvoicesPage />)

        fireEvent.change(screen.getByLabelText("Invoice Date From"), {
            target: { value: "2026-06-01" },
        })
        fireEvent.change(screen.getByLabelText("Invoice Date To"), {
            target: { value: "2026-06-30" },
        })

        expect(useInvoices).toHaveBeenLastCalledWith(1, expect.objectContaining({
            start_date: "2026-06-01",
            end_date: "2026-06-30",
        }))
    })

    it("shows an error state instead of the empty state when the query fails", () => {
        vi.mocked(useInvoices).mockReturnValue({
            data: [],
            isLoading: false,
            isError: true,
            error: new Error("Request failed"),
        } as unknown as ReturnType<typeof useInvoices>)

        render(<InvoicesPage />)

        expect(screen.getByText("Request failed")).toBeInTheDocument()
        expect(screen.queryByText(/No invoices found/i)).not.toBeInTheDocument()
    })
})
