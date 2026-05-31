"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"
import { PaymentSummary } from "@/features/pos/components/payment-summary"
import { ReceiptPreview } from "@/features/pos/components/receipt-preview"
import { SaleLifecycleActions } from "@/features/pos/components/sale-lifecycle-actions"
import { saleStatusTone } from "@/features/pos/components/sale-status"
import { cancelSale, getSale, loadCustomers, voidSale, type Customer, type PosRequestOptions } from "@/features/pos/pos-api"
import type { Sale } from "@/features/pos/pos-types"
import { formatCurrency } from "@/lib/money"

export function SaleDetailView({ saleId }: { saleId: number }) {
    const { token, activeCompanyId } = useSession()
    const [sale, setSale] = useState<Sale | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        setError(null)
        try {
            const [loadedSale, loadedCustomers] = await Promise.all([
                getSale(requestOptions, saleId),
                loadCustomers(requestOptions).catch(() => [] as Customer[]),
            ])
            setSale(loadedSale)
            setCustomers(loadedCustomers)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load sale.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions, saleId])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void refreshData()
        })
        return () => {
            active = false
        }
    }, [refreshData])

    async function handleVoid() {
        if (!requestOptions || !sale) return
        setIsLoading(true)
        setError(null)
        setMessage(null)
        try {
            const updated = await voidSale(requestOptions, sale.id)
            setSale(updated)
            setMessage("Sale voided.")
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to void sale.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleCancel() {
        if (!requestOptions || !sale) return
        setIsLoading(true)
        setError(null)
        setMessage(null)
        try {
            const updated = await cancelSale(requestOptions, sale.id)
            setSale(updated)
            setMessage("Sale canceled.")
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to cancel sale.")
        } finally {
            setIsLoading(false)
        }
    }

    const customerName = sale?.customer_name ?? customers.find((customer) => customer.id === sale?.partner_id)?.name ?? null

    return (
        <div className="grid gap-6">
            <PosPageHeader
                title={sale?.sale_number ?? (sale ? `Sale #${sale.id}` : "Sale")}
                subtitle={sale ? `${sale.type} sale` : undefined}
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                message={message}
                error={error}
                actions={
                    <>
                        <Link href="/pos/sales">
                            <Button type="button" variant="outline" size="xl">
                                <Icon name="chevron_left" size={18} />
                                Back
                            </Button>
                        </Link>
                        {sale ? (
                            <SaleLifecycleActions
                                sale={sale}
                                isLoading={isLoading}
                                onCancel={handleCancel}
                                onVoid={handleVoid}
                            />
                        ) : null}
                    </>
                }
            />

            {sale && (
                <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                    <div className="grid gap-6">
                        <div className="rounded-2xl border border-navy-100 bg-white p-6">
                            <h2 className="mb-4 border-b border-navy-50 pb-3 text-lg font-bold text-navy-900 font-display">
                                Line items
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-sm">
                                    <thead>
                                        <tr className="bg-navy-50/30 text-xs font-bold uppercase tracking-wider text-navy-500">
                                            <th className="border-b border-navy-100 px-4 py-3 font-display">Description</th>
                                            <th className="border-b border-navy-100 px-4 py-3 font-display text-right">Qty</th>
                                            <th className="border-b border-navy-100 px-4 py-3 font-display text-right">Unit</th>
                                            <th className="border-b border-navy-100 px-4 py-3 font-display text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sale.lines?.map((line) => (
                                            <tr key={line.id}>
                                                <td className="border-b border-navy-100/50 px-4 py-3 text-navy-800 font-medium">
                                                    {line.description ?? `Variant #${line.product_variant_id}`}
                                                    {line.is_giveaway ? (
                                                        <span className="ml-2 text-xs font-semibold text-emerald-700">
                                                            Giveaway
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="border-b border-navy-100/50 px-4 py-3 text-right text-navy-700">
                                                    {line.quantity}
                                                </td>
                                                <td className="border-b border-navy-100/50 px-4 py-3 text-right text-navy-700">
                                                    {formatCurrency(line.unit_price)}
                                                </td>
                                                <td className="border-b border-navy-100/50 px-4 py-3 text-right font-bold text-navy-900">
                                                    {formatCurrency(line.line_total)}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!sale.lines || sale.lines.length === 0) && (
                                            <tr>
                                                <td colSpan={4} className="py-6 text-center text-navy-400">
                                                    No line items.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {sale.payments && sale.payments.length > 0 && (
                            <div className="rounded-2xl border border-navy-100 bg-white p-6">
                                <h2 className="mb-4 border-b border-navy-50 pb-3 text-lg font-bold text-navy-900 font-display">
                                    Payments
                                </h2>
                                <div className="grid gap-2">
                                    {sale.payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between rounded-lg border border-navy-100 px-4 py-2 text-sm"
                                        >
                                            <span className="font-semibold uppercase text-navy-700">{payment.method}</span>
                                        <span className="text-right">
                                            <span className="block font-bold text-navy-900">{formatCurrency(payment.amount)}</span>
                                            <span className="block text-xs text-navy-500">
                                                {payment.reference ? `${payment.reference} · ` : ""}
                                                {payment.paid_at ?? "-"}
                                            </span>
                                        </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {sale.promotions && sale.promotions.length > 0 && (
                            <div className="rounded-2xl border border-navy-100 bg-white p-6">
                                <h2 className="mb-4 border-b border-navy-50 pb-3 text-lg font-bold text-navy-900 font-display">
                                    Promotions
                                </h2>
                                <div className="grid gap-2">
                                    {sale.promotions.map((promotion) => (
                                        <div
                                            key={promotion.id}
                                            className="flex items-center justify-between rounded-lg border border-navy-100 px-4 py-2 text-sm"
                                        >
                                            <span className="text-navy-700">
                                                {promotion.description ?? promotion.promotion_type}
                                            </span>
                                            <span className="font-bold text-emerald-700">
                                                - {formatCurrency(promotion.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-6">
                        <div className="rounded-2xl border border-navy-100 bg-white p-6">
                            <div className="mb-4 flex items-center justify-between border-b border-navy-50 pb-3">
                                <h2 className="text-lg font-bold text-navy-900 font-display">Summary</h2>
                                <StatusPill tone={saleStatusTone(sale.status)}>{sale.status}</StatusPill>
                            </div>
                            <PaymentSummary sale={sale} />
                        </div>

                        <div className="rounded-2xl border border-navy-100 bg-white p-6 text-sm">
                            <h2 className="mb-4 border-b border-navy-50 pb-3 text-lg font-bold text-navy-900 font-display">
                                Details
                            </h2>
                            <div className="grid gap-2">
                                <SummaryRow
                                    label="Customer"
                                    value={customerName ?? (sale.partner_id ? `Partner #${sale.partner_id}` : "Walk-in")}
                                />
                                <SummaryRow label="Order date" value={sale.order_date ?? "-"} />
                                <SummaryRow label="Branch" value={`#${sale.branch_id}`} />
                                <SummaryRow label="Register" value={sale.register_id ? `#${sale.register_id}` : "-"} />
                                <SummaryRow label="Revenue journal" value={sale.revenue_journal_entry_id ? `#${sale.revenue_journal_entry_id}` : "-"} />
                                <SummaryRow label="COGS journal" value={sale.cogs_journal_entry_id ? `#${sale.cogs_journal_entry_id}` : "-"} />
                                <SummaryRow label="Completed" value={sale.completed_at ?? "-"} />
                                {sale.type === "catering" && (
                                    <>
                                        <SummaryRow label="Fulfilment" value={sale.fulfilment_date ?? "-"} />
                                        <SummaryRow label="Batch" value={sale.fulfilment_time_window ?? "-"} />
                                        <SummaryRow label="Delivery" value={sale.delivery_address ?? "-"} />
                                    </>
                                )}
                            </div>
                        </div>
                        <ReceiptPreview sale={sale} customerName={customerName} />
                    </div>
                </div>
            )}
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-navy-500">{label}</span>
            <span className="text-right font-medium text-navy-700">{value}</span>
        </div>
    )
}
