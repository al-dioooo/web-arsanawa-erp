"use client"

import type { Sale } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"

type PaymentSummaryProps = {
    sale: Sale
    showChange?: boolean
}

export function PaymentSummary({ sale, showChange = false }: PaymentSummaryProps) {
    const total = toNumber(sale.total)
    const paid = toNumber(sale.amount_paid)
    const balance = Math.max(total - paid, 0)
    const change = showChange ? Math.max(paid - total, 0) : 0

    return (
        <div className="grid gap-1.5 rounded-xl border border-navy-100 bg-navy-50/30 p-4 text-sm">
            <SummaryRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
            <SummaryRow label="Discount" value={`- ${formatCurrency(sale.discount_total)}`} />
            <SummaryRow label="Tax" value={formatCurrency(sale.tax_total)} />
            <div className="flex justify-between pt-1 text-base font-bold text-navy-900">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
            </div>
            <SummaryRow label="Paid" value={formatCurrency(paid)} />
            <div className={`flex justify-between font-bold ${balance > 0 ? "text-teal-700" : "text-emerald-700"}`}>
                <span>{balance > 0 ? "Balance due" : "Paid in full"}</span>
                <span>{formatCurrency(balance)}</span>
            </div>
            {change > 0 ? <SummaryRow label="Change" value={formatCurrency(change)} /> : null}
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 text-navy-500">
            <span>{label}</span>
            <span className="text-right font-medium text-navy-700">{value}</span>
        </div>
    )
}
