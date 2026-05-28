"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Field, SelectField } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { PaymentSummary } from "@/features/pos/components/payment-summary"
import type { AddPaymentInput, PaymentMethod, Sale } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"

const METHODS: { value: PaymentMethod; label: string }[] = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "qris", label: "QRIS" },
    { value: "transfer", label: "Transfer" },
]

type PaymentDialogProps = {
    open: boolean
    onClose: () => void
    sale: Sale | null
    isLoading: boolean
    onAddPayment: (input: AddPaymentInput) => void
    onRemovePayment: (paymentId: number) => void
    onComplete: () => void
}

export function PaymentDialog({
    open,
    onClose,
    sale,
    isLoading,
    onAddPayment,
    onRemovePayment,
    onComplete,
}: PaymentDialogProps) {
    const [method, setMethod] = useState<PaymentMethod>("cash")
    const [amount, setAmount] = useState("")
    const [reference, setReference] = useState("")
    const [paymentError, setPaymentError] = useState<string | null>(null)

    const total = sale ? toNumber(sale.total) : 0
    const paid = sale ? toNumber(sale.amount_paid) : 0
    const balanceDue = Math.max(total - paid, 0)
    const tendered = toNumber(amount)
    const change = method === "cash" && tendered > balanceDue ? tendered - balanceDue : 0
    const fullyPaid = balanceDue <= 0

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Payment"
            description={sale?.sale_number ? `Sale ${sale.sale_number}` : "Take payment for this sale"}
            footer={
                <>
                    <Button type="button" variant="outline" size="xl" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        type="button"
                        size="xl"
                        disabled={isLoading || !fullyPaid}
                        onClick={onComplete}
                        className="bg-teal-700 hover:bg-teal-800 text-white"
                    >
                        Complete sale
                    </Button>
                </>
            }
        >
            {sale && (
                <div className="grid gap-4">
                    <PaymentSummary sale={sale} />

                    {sale.payments && sale.payments.length > 0 && (
                        <div className="grid gap-2">
                            {sale.payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm"
                                >
                                    <span className="font-semibold uppercase text-navy-700">{payment.method}</span>
                                    <span className="flex items-center gap-3">
                                        <span className="font-bold text-navy-900">{formatCurrency(payment.amount)}</span>
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            onClick={() => onRemovePayment(payment.id)}
                                            className="flex h-7 w-7 items-center justify-center rounded-md text-navy-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 cursor-pointer outline-none"
                                        >
                                            <Icon name="delete" size={16} />
                                        </button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <form
                        className="grid gap-3 border-t border-navy-50 pt-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            setPaymentError(null)
                            if (method !== "cash" && tendered > balanceDue) {
                                setPaymentError("Non-cash payments cannot exceed the balance due.")
                                return
                            }
                            onAddPayment({
                                method,
                                amount: method === "cash" ? Math.min(tendered, balanceDue) : tendered,
                                reference: reference || undefined,
                            })
                            setAmount("")
                            setReference("")
                        }}
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            <SelectField
                                label="Method"
                                value={method}
                                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                            >
                                {METHODS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </SelectField>
                            <Field
                                label="Amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                placeholder={String(Math.max(balanceDue, 0))}
                                required
                            />
                        </div>
                        <Field
                            label="Reference (optional)"
                            value={reference}
                            onChange={(event) => setReference(event.target.value)}
                            placeholder="Card / transfer reference"
                        />
                        {change > 0 && (
                            <p className="text-sm font-semibold text-emerald-700">
                                Change due: {formatCurrency(change)}
                            </p>
                        )}
                        {paymentError ? (
                            <p className="text-sm font-semibold text-destructive">{paymentError}</p>
                        ) : null}
                        <Button
                            type="submit"
                            variant="secondary"
                            size="xl"
                            disabled={isLoading || tendered <= 0 || fullyPaid}
                            className="w-full"
                        >
                            Add payment
                        </Button>
                    </form>
                </div>
            )}
        </Dialog>
    )
}
