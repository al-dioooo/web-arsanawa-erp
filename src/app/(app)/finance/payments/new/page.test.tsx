import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import NewPaymentPage from "./page"
import { useCreatePayment } from "@/features/finance/api-payments"
import { usePartners } from "@/features/finance/api-invoices"
import { useBills } from "@/features/finance/api-bills"
import { useCOA } from "@/features/finance/api"

const push = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}))

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api-payments", () => ({
    useCreatePayment: vi.fn(),
}))

vi.mock("@/features/finance/api-invoices", () => ({
    usePartners: vi.fn(),
}))

vi.mock("@/features/finance/api-bills", () => ({
    useBills: vi.fn(),
}))

vi.mock("@/features/finance/api", () => ({
    useCOA: vi.fn(),
}))

describe("new outgoing payment page", () => {
    it("submits the backend payment contract with a positive bill allocation", async () => {
        const mutate = vi.fn()

        vi.mocked(useCreatePayment).mockReturnValue({
            mutate,
            isPending: false,
        } as unknown as ReturnType<typeof useCreatePayment>)
        vi.mocked(usePartners).mockReturnValue({
            data: [
                {
                    id: 20,
                    company_id: 1,
                    type: "supplier",
                    name: "Supplier Inc",
                    code: "SUP-001",
                    email: null,
                    phone: null,
                    tax_identifier: null,
                    national_id: null,
                    credit_limit: null,
                    transaction_limit: null,
                    status: "active",
                    notes: null,
                },
            ],
        } as ReturnType<typeof usePartners>)
        vi.mocked(useCOA).mockReturnValue({
            data: [
                {
                    id: 8,
                    company_id: 1,
                    code: "1-1010",
                    name: "Cash in Bank",
                    type: "asset",
                    parent_id: null,
                    is_postable: true,
                    is_active: true,
                    normal_balance: "debit",
                    children: [],
                },
            ],
        } as unknown as ReturnType<typeof useCOA>)
        vi.mocked(useBills).mockReturnValue({
            data: [
                {
                    id: 30,
                    company_id: 1,
                    branch_id: null,
                    bill_number: "BILL-001",
                    partner_id: 20,
                    currency_id: 1,
                    exchange_rate: "1.00000000",
                    bill_date: "2026-06-01",
                    due_date: "2026-06-30",
                    status: "posted",
                    subtotal: "1000.0000",
                    discount_total: "0.0000",
                    tax_total: "0.0000",
                    withholding_total: "0.0000",
                    total: "1000.0000",
                    amount_paid: "0.0000",
                    notes: null,
                    journal_entry_id: null,
                    created_by: null,
                    updated_by: null,
                },
            ],
        } as ReturnType<typeof useBills>)

        render(<NewPaymentPage />)

        fireEvent.focus(screen.getByLabelText("Vendor (Supplier)"))
        fireEvent.click(screen.getByText("Supplier Inc"))
        fireEvent.focus(screen.getByLabelText("Paid From (Kas & Bank)"))
        fireEvent.click(screen.getByText("1-1010 - Cash in Bank"))
        fireEvent.change(screen.getByLabelText("Amount Paid"), { target: { value: "750" } })

        const allocationInput = screen.getByLabelText("Allocation for BILL-001")
        fireEvent.change(allocationInput, { target: { value: "500" } })

        expect(allocationInput).toHaveValue(500)

        fireEvent.click(screen.getByRole("button", { name: "Draft Payment" }))

        await waitFor(() => expect(mutate).toHaveBeenCalled())
        expect(mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                partner_id: 20,
                cash_account_id: 8,
                payment_type: "outbound",
                amount: "750",
                allocations: [
                    {
                        bill_id: 30,
                        amount: "500",
                    },
                ],
            }),
            expect.any(Object),
        )
    })
})
