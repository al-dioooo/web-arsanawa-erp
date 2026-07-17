"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { Modal } from "@/components/ui/modal"
import { PaymentSummary } from "@/features/pos/components/payment-summary"
import type { AddPaymentInput, PaymentMethod, Sale } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"

const METHODS: PaymentMethod[] = ["cash", "card", "qris", "transfer"]

type PaymentDialogProps = {
    open: boolean
    onClose: () => void
    sale: Sale | null
    isLoading: boolean
    onAddPayment: (input: AddPaymentInput) => void
    onRemovePayment: (paymentId: number) => void
    onComplete: () => void
    allowPaymentEditing?: boolean
}

export function PaymentDialog({
    open,
    onClose,
    sale,
    isLoading,
    onAddPayment,
    onRemovePayment,
    onComplete,
    allowPaymentEditing = true,
}: PaymentDialogProps) {
    const t = useTranslations("pos.register.payment")
    const rootT = useTranslations()
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
    const canComplete = sale?.type === "catering" ? sale.status === "confirmed" : fullyPaid

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={t("title")}
            description={sale?.sale_number ? t("forSale", { number: sale.sale_number }) : t("description")}
            footer={
                <>
                    <Button type="button" variant="outline" size="xl" onClick={onClose}>
                        {rootT("common.close")}
                    </Button>
                    <Button
                        type="button"
                        size="xl"
                        disabled={isLoading || !canComplete}
                        onClick={onComplete}
                    >
                        {t("completeSale")}
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
                                    className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2 text-sm"
                                >
                                    <span className="font-semibold uppercase text-ink-secondary">{payment.method}</span>
                                    <span className="flex items-center gap-3">
                                        <span className="font-bold text-ink tabular-nums">{formatCurrency(payment.amount)}</span>
                                        {allowPaymentEditing ? (
                                            <button
                                                type="button"
                                                disabled={isLoading}
                                                onClick={() => onRemovePayment(payment.id)}
                                                className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-faint hover:bg-error-soft hover:text-error-strong disabled:opacity-50 cursor-pointer outline-none"
                                            >
                                                <Icon name="delete" size={16} />
                                            </button>
                                        ) : null}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {allowPaymentEditing ? (
                        <form
                            className="grid gap-3 border-t border-line pt-4"
                            onSubmit={(event) => {
                                event.preventDefault()
                                setPaymentError(null)
                                if (method !== "cash" && tendered > balanceDue) {
                                    setPaymentError(t("nonCashError"))
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
                                    label={t("method")}
                                    value={method}
                                    onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                                >
                                    {METHODS.map((option) => (
                                        <option key={option} value={option}>
                                            {t(`methods.${option}`)}
                                        </option>
                                    ))}
                                </SelectField>
                                <Field
                                    label={t("amount")}
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
                                label={t("reference")}
                                value={reference}
                                onChange={(event) => setReference(event.target.value)}
                                placeholder={t("referencePlaceholder")}
                            />
                            {change > 0 && (
                                <p className="text-sm font-semibold text-success-strong">
                                    {t("changeDue", { amount: formatCurrency(change) })}
                                </p>
                            )}
                            {paymentError ? (
                                <p className="text-sm font-semibold text-error">{paymentError}</p>
                            ) : null}
                            <Button
                                type="submit"
                                variant="secondary"
                                size="xl"
                                disabled={isLoading || tendered <= 0 || fullyPaid}
                                className="w-full"
                            >
                                {t("addPayment")}
                            </Button>
                        </form>
                    ) : null}
                </div>
            )}
        </Modal>
    )
}
