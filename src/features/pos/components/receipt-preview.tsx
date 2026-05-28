"use client"

import type { Sale } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"

type ReceiptPreviewProps = {
    sale: Sale
    customerName?: string | null
    registerName?: string | null
}

export function ReceiptPreview({ sale, customerName, registerName }: ReceiptPreviewProps) {
    const total = toNumber(sale.total)
    const paid = toNumber(sale.amount_paid)
    const balance = Math.max(total - paid, 0)
    const change = Math.max(paid - total, 0)

    return (
        <article className="mx-auto max-w-[420px] rounded-xl border border-navy-100 bg-white p-6 text-sm text-navy-900 print:border-0 print:p-0 print:shadow-none">
            <header className="border-b border-dashed border-navy-200 pb-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Arsanawa POS</p>
                <h1 className="mt-1 text-xl font-bold font-display">{sale.sale_number ?? `Sale #${sale.id}`}</h1>
                <p className="mt-1 text-navy-500">{sale.order_date ?? "-"}</p>
            </header>

            <section className="grid gap-1.5 border-b border-dashed border-navy-200 py-4">
                <ReceiptRow label="Status" value={sale.status} />
                <ReceiptRow label="Type" value={sale.type} />
                <ReceiptRow label="Customer" value={customerName ?? sale.customer_name ?? "Walk-in"} />
                {registerName ? <ReceiptRow label="Register" value={registerName} /> : null}
                {sale.completed_at ? <ReceiptRow label="Completed" value={sale.completed_at} /> : null}
            </section>

            <section className="border-b border-dashed border-navy-200 py-4">
                <div className="grid gap-3">
                    {sale.lines?.map((line) => (
                        <div key={line.id} className="grid gap-1">
                            <div className="flex justify-between gap-4 font-semibold">
                                <span>{line.description ?? `Variant #${line.product_variant_id}`}</span>
                                <span>{formatCurrency(line.line_total)}</span>
                            </div>
                            <div className="text-xs text-navy-500">
                                {line.quantity} x {formatCurrency(line.unit_price)}
                            </div>
                        </div>
                    ))}
                    {(!sale.lines || sale.lines.length === 0) ? (
                        <p className="text-center text-navy-400">No line items.</p>
                    ) : null}
                </div>
            </section>

            <section className="grid gap-1.5 border-b border-dashed border-navy-200 py-4">
                <ReceiptRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
                <ReceiptRow label="Discount" value={`- ${formatCurrency(sale.discount_total)}`} />
                <ReceiptRow label="Tax" value={formatCurrency(sale.tax_total)} />
                <ReceiptRow label="Total" value={formatCurrency(sale.total)} strong />
                <ReceiptRow label="Paid" value={formatCurrency(sale.amount_paid)} />
                {balance > 0 ? <ReceiptRow label="Balance" value={formatCurrency(balance)} /> : null}
                {change > 0 ? <ReceiptRow label="Change" value={formatCurrency(change)} /> : null}
            </section>

            {sale.payments && sale.payments.length > 0 ? (
                <section className="grid gap-1.5 py-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-navy-500">Payments</p>
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
        <div className={`flex justify-between gap-4 ${strong ? "font-bold text-navy-900" : "text-navy-600"}`}>
            <span>{label}</span>
            <span className="text-right">{value}</span>
        </div>
    )
}
