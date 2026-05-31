import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { PaymentDialog } from "@/features/pos/components/payment-dialog"
import type { Sale } from "@/features/pos/pos-types"

function sale(overrides: Partial<Sale> = {}): Sale {
    return {
        id: 1,
        company_id: 1,
        branch_id: 1,
        register_id: 1,
        cashier_shift_id: 1,
        sale_number: "POS-001",
        type: "counter",
        partner_id: null,
        customer_name: "Walk-in",
        status: "draft",
        order_date: "2026-05-28",
        fulfilment_date: null,
        delivery_address: null,
        currency_id: 1,
        exchange_rate: "1.0000",
        subtotal: "100.0000",
        discount_total: "0.0000",
        tax_total: "0.0000",
        total: "100.0000",
        amount_paid: "80.0000",
        notes: null,
        revenue_journal_entry_id: null,
        cogs_journal_entry_id: null,
        completed_at: null,
        lines: [],
        payments: [],
        promotions: [],
        ...overrides,
    }
}

describe("PaymentDialog", () => {
    it("submits only the balance due for cash overpayment and shows change", () => {
        const onAddPayment = vi.fn()
        render(
            <PaymentDialog
                open
                onClose={vi.fn()}
                sale={sale()}
                isLoading={false}
                onAddPayment={onAddPayment}
                onRemovePayment={vi.fn()}
                onComplete={vi.fn()}
            />,
        )

        fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "200" } })
        expect(screen.getByText(/Change due:/)).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Add payment" }))

        expect(onAddPayment).toHaveBeenCalledWith({
            method: "cash",
            amount: 20,
            reference: undefined,
        })
    })

    it("blocks non-cash overpayment", () => {
        const onAddPayment = vi.fn()
        render(
            <PaymentDialog
                open
                onClose={vi.fn()}
                sale={sale()}
                isLoading={false}
                onAddPayment={onAddPayment}
                onRemovePayment={vi.fn()}
                onComplete={vi.fn()}
            />,
        )

        fireEvent.change(screen.getByLabelText("Method"), { target: { value: "card" } })
        fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "25" } })
        fireEvent.click(screen.getByRole("button", { name: "Add payment" }))

        expect(onAddPayment).not.toHaveBeenCalled()
        expect(screen.getByText("Non-cash payments cannot exceed the balance due.")).toBeInTheDocument()
    })

    it("allows confirmed catering orders to complete with a balance due", () => {
        const onComplete = vi.fn()
        render(
            <PaymentDialog
                open
                onClose={vi.fn()}
                sale={sale({
                    type: "catering",
                    status: "confirmed",
                    amount_paid: "0.0000",
                })}
                isLoading={false}
                onAddPayment={vi.fn()}
                onRemovePayment={vi.fn()}
                onComplete={onComplete}
            />,
        )

        fireEvent.click(screen.getByRole("button", { name: "Complete sale" }))

        expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it("can hide payment editing while still allowing completion", () => {
        render(
            <PaymentDialog
                open
                onClose={vi.fn()}
                sale={sale({
                    type: "catering",
                    status: "confirmed",
                    amount_paid: "100.0000",
                    payments: [
                        {
                            id: 10,
                            sale_id: 1,
                            method: "transfer",
                            amount: "100.0000",
                            reference: "proof",
                            paid_at: "2026-05-28",
                        },
                    ],
                })}
                isLoading={false}
                onAddPayment={vi.fn()}
                onRemovePayment={vi.fn()}
                onComplete={vi.fn()}
                allowPaymentEditing={false}
            />,
        )

        expect(screen.queryByRole("button", { name: "Add payment" })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Complete sale" })).toBeEnabled()
    })
})
