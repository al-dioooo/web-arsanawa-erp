"use client"

import { useTranslations } from "next-intl"
import type { Sale } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"

type PaymentSummaryProps = {
    sale: Sale
    showChange?: boolean
}

export function PaymentSummary({ sale, showChange = false }: PaymentSummaryProps) {
    const t = useTranslations("pos.register.summary")
    const total = toNumber(sale.total)
    const paid = toNumber(sale.amount_paid)
    const balance = Math.max(total - paid, 0)
    const change = showChange ? Math.max(paid - total, 0) : 0

    return (
        <div className="grid gap-1.5 rounded-md bg-surface-muted p-4 text-sm">
            <SummaryRow label={t("subtotal")} value={formatCurrency(sale.subtotal)} />
            <SummaryRow label={t("discount")} value={`- ${formatCurrency(sale.discount_total)}`} />
            <SummaryRow label={t("tax")} value={formatCurrency(sale.tax_total)} />
            <div className="flex justify-between pt-1 text-base font-bold text-ink">
                <span>{t("total")}</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
            <SummaryRow label={t("paid")} value={formatCurrency(paid)} />
            <div className={`flex justify-between font-bold ${balance > 0 ? "text-brand-ink" : "text-success-strong"}`}>
                <span>{balance > 0 ? t("balanceDue") : t("paidInFull")}</span>
                <span className="tabular-nums">{formatCurrency(balance)}</span>
            </div>
            {change > 0 ? <SummaryRow label={t("change")} value={formatCurrency(change)} /> : null}
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 text-ink-muted">
            <span>{label}</span>
            <span className="text-end font-medium text-ink-secondary tabular-nums">{value}</span>
        </div>
    )
}
