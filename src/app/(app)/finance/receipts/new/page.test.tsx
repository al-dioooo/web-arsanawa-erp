import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import NewReceiptPage from "./page"
import { useCreatePayment } from "@/features/finance/api-payments"
import { useInvoices, usePartners } from "@/features/finance/api-invoices"
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

// Labels the test interacts with, mirroring messages/id.json.
const labels: Record<string, string> = {
    "finance.receipts.form.customer": "Pelanggan",
    "finance.receipts.form.depositedTo": "Disetor Ke (Kas & Bank)",
    "finance.receipts.form.amount": "Jumlah Diterima",
    "finance.receipts.form.allocationFor": "Alokasi untuk {number}",
    "finance.receipts.form.draft": "Draf Penerimaan",
}

vi.mock("next-intl", () => ({
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, string | number>) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const template = labels[fullKey] ?? fullKey
        return template.replace(/\{(\w+)\}/g, (match, token) => String(values?.[token] ?? match))
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
    useInvoices: vi.fn(),
    usePartners: vi.fn(),
}))

vi.mock("@/features/finance/api", () => ({
    useCOA: vi.fn(),
}))

describe("new incoming receipt page", () => {
    it("submits the backend payment contract with a positive invoice allocation", async () => {
        const mutate = vi.fn()

        vi.mocked(useCreatePayment).mockReturnValue({
            mutate,
            isPending: false,
        } as unknown as ReturnType<typeof useCreatePayment>)
        vi.mocked(usePartners).mockReturnValue({
            data: [
                {
                    id: 10,
                    company_id: 1,
                    type: "customer",
                    name: "Acme Customer",
                    code: "CUST-001",
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
        vi.mocked(useInvoices).mockReturnValue({
            data: [
                {
                    id: 40,
                    company_id: 1,
                    branch_id: null,
                    invoice_number: "INV-001",
                    partner_id: 10,
                    currency_id: 1,
                    exchange_rate: "1.00000000",
                    invoice_date: "2026-06-01",
                    due_date: "2026-06-30",
                    status: "posted",
                    subtotal: "1000.0000",
                    discount_total: "0.0000",
                    tax_total: "0.0000",
                    total: "1000.0000",
                    amount_paid: "0.0000",
                    notes: null,
                    journal_entry_id: null,
                },
            ],
        } as ReturnType<typeof useInvoices>)

        render(<NewReceiptPage />)

        fireEvent.focus(screen.getByLabelText("Pelanggan"))
        fireEvent.click(screen.getByText("Acme Customer"))
        fireEvent.focus(screen.getByLabelText("Disetor Ke (Kas & Bank)"))
        fireEvent.click(screen.getByText("1-1010 - Cash in Bank"))
        fireEvent.change(screen.getByLabelText("Jumlah Diterima"), { target: { value: "750" } })

        const allocationInput = screen.getByLabelText("Alokasi untuk INV-001")
        fireEvent.change(allocationInput, { target: { value: "500" } })

        expect(allocationInput).toHaveValue(500)

        fireEvent.click(screen.getByRole("button", { name: "Draf Penerimaan" }))

        await waitFor(() => expect(mutate).toHaveBeenCalled())
        expect(mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                partner_id: 10,
                cash_account_id: 8,
                payment_type: "inbound",
                amount: "750",
                allocations: [
                    {
                        invoice_id: 40,
                        amount: "500",
                    },
                ],
            }),
            expect.any(Object),
        )
    })
})
