"use client"

import { useTranslations } from "next-intl"
import type { Sale } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"
import { formatDateID } from "@/lib/format"

type ReceiptPreviewProps = {
    sale: Sale
    customerName?: string | null
    registerName?: string | null
}

export function ReceiptPreview({ sale, customerName, registerName }: ReceiptPreviewProps) {
    const t = useTranslations("pos.receipt")
    const total = toNumber(sale.total)
    const paid = toNumber(sale.amount_paid)
    const balance = Math.max(total - paid, 0)
    const change = Math.max(paid - total, 0)

    return (
        <article className="mx-auto max-w-[420px] rounded-lg bg-surface p-6 text-sm text-ink shadow-card print:p-0 print:shadow-none">
            <header className="border-b border-dashed border-line-strong pb-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t("brand")}</p>
                <h1 className="mt-1 text-xl font-bold font-display">
                    {sale.sale_number ?? t("saleFallback", { id: sale.id })}
                </h1>
                <p className="mt-1 text-ink-muted">{sale.order_date ? formatDateID(sale.order_date) : "-"}</p>
            </header>

            <section className="grid gap-1.5 border-b border-dashed border-line-strong py-4">
                <ReceiptRow label={t("status")} value={sale.status} />
                <ReceiptRow label={t("type")} value={sale.type} />
                <ReceiptRow label={t("customer")} value={customerName ?? sale.customer_name ?? t("walkIn")} />
                {registerName ? <ReceiptRow label={t("register")} value={registerName} /> : null}
                {sale.completed_at ? <ReceiptRow label={t("completed")} value={sale.completed_at} /> : null}
            </section>

            <section className="border-b border-dashed border-line-strong py-4">
                <div className="grid gap-3">
                    {sale.lines?.map((line) => (
                        <div key={line.id} className="grid gap-1">
                            <div className="flex justify-between gap-4 font-semibold">
                                <span>{line.description ?? t("variantRef", { id: line.product_variant_id })}</span>
                                <span>{formatCurrency(line.line_total)}</span>
                            </div>
                            <div className="text-xs text-ink-muted">
                                {line.quantity} x {formatCurrency(line.unit_price)}
                            </div>
                        </div>
                    ))}
                    {(!sale.lines || sale.lines.length === 0) ? (
                        <p className="text-center text-ink-muted">{t("noLines")}</p>
                    ) : null}
                </div>
            </section>

            <section className="grid gap-1.5 border-b border-dashed border-line-strong py-4">
                <ReceiptRow label={t("subtotal")} value={formatCurrency(sale.subtotal)} />
                <ReceiptRow label={t("discount")} value={`- ${formatCurrency(sale.discount_total)}`} />
                <ReceiptRow label={t("tax")} value={formatCurrency(sale.tax_total)} />
                <ReceiptRow label={t("total")} value={formatCurrency(sale.total)} strong />
                <ReceiptRow label={t("paid")} value={formatCurrency(sale.amount_paid)} />
                {balance > 0 ? <ReceiptRow label={t("balance")} value={formatCurrency(balance)} /> : null}
                {change > 0 ? <ReceiptRow label={t("change")} value={formatCurrency(change)} /> : null}
            </section>

            {sale.payments && sale.payments.length > 0 ? (
                <section className="grid gap-1.5 py-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-muted">{t("payments")}</p>
                    {sale.payments.map((payment) => (
                        <ReceiptRow
                            key={payment.id}
                            label={`${payment.method}${payment.reference ? ` / ${payment.reference}` : ""}`}
                            value={formatCurrency(payment.amount)}
                        />
                    ))}
                </section>
            ) : null}
        </article>
    )
}

function ReceiptRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className={`flex justify-between gap-4 ${strong ? "font-bold text-ink" : "text-ink-secondary"}`}>
            <span>{label}</span>
            <span className="text-right">{value}</span>
        </div>
    )
}
