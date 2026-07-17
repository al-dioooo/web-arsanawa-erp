"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { PageHeader } from "@/components/ui/page-header"
import { StatusPill } from "@/components/ui/status-pill"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { PaymentSummary } from "@/features/pos/components/payment-summary"
import { ReceiptPreview } from "@/features/pos/components/receipt-preview"
import { SaleLifecycleActions } from "@/features/pos/components/sale-lifecycle-actions"
import { saleStatusTone } from "@/features/pos/components/sale-status"
import { cancelSale, getSale, loadCustomers, voidSale, type Customer, type PosRequestOptions } from "@/features/pos/pos-api"
import type { Sale } from "@/features/pos/pos-types"
import { formatCurrency } from "@/lib/money"
import { formatDateID } from "@/lib/format"

export function SaleDetailView({ saleId }: { saleId: number }) {
    const t = useTranslations("pos.sales.detail")
    const rootT = useTranslations()
    const { token, activeCompanyId } = useSession()
    const [sale, setSale] = useState<Sale | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const loadErrorFallback = t("loadError")
    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        try {
            const [loadedSale, loadedCustomers] = await Promise.all([
                getSale(requestOptions, saleId),
                loadCustomers(requestOptions).catch(() => [] as Customer[]),
            ])
            setSale(loadedSale)
            setCustomers(loadedCustomers)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : loadErrorFallback)
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions, saleId, loadErrorFallback])

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
        try {
            const updated = await voidSale(requestOptions, sale.id)
            setSale(updated)
            toast.success(t("voided"))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("voidError"))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleCancel() {
        if (!requestOptions || !sale) return
        setIsLoading(true)
        try {
            const updated = await cancelSale(requestOptions, sale.id)
            setSale(updated)
            toast.success(t("canceled"))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("cancelError"))
        } finally {
            setIsLoading(false)
        }
    }

    const customerName = sale?.customer_name ?? customers.find((customer) => customer.id === sale?.partner_id)?.name ?? null

    return (
        <div className="grid gap-6">
            <PageHeader
                eyebrow={rootT("modules.pos")}
                title={sale?.sale_number ?? (sale ? t("fallbackTitle", { id: sale.id }) : t("title"))}
                subtitle={sale ? t("typeSale", { type: sale.type }) : undefined}
                backHref="/pos/sales"
                backLabel={rootT("common.back")}
                status={
                    sale ? (
                        <StatusPill tone={saleStatusTone(sale.status)}>{sale.status}</StatusPill>
                    ) : undefined
                }
                actions={
                    sale ? (
                        <SaleLifecycleActions
                            sale={sale}
                            isLoading={isLoading}
                            onCancel={handleCancel}
                            onVoid={handleVoid}
                        />
                    ) : undefined
                }
                className="mb-0"
            />

            {sale && (
                <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                    <div className="grid gap-6">
                        <DataTable
                            columns={[
                                t("columns.description"),
                                { label: t("columns.qty"), align: "end" },
                                { label: t("columns.unit"), align: "end" },
                                { label: t("columns.total"), align: "end" },
                            ]}
                            minWidth={560}
                            toolbar={<h2 className="type-section">{t("lineItems")}</h2>}
                        >
                            {sale.lines?.map((line) => (
                                <tr key={line.id}>
                                    <td className="font-medium text-ink">
                                        {line.description ?? t("variantRef", { id: line.product_variant_id })}
                                        {line.is_giveaway ? (
                                            <span className="ms-2 text-xs font-semibold text-success-strong">
                                                {t("giveaway")}
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className="text-end tabular-nums">{line.quantity}</td>
                                    <td className="text-end tabular-nums">{formatCurrency(line.unit_price)}</td>
                                    <td className="px-6 py-4 text-end font-bold text-ink tabular-nums">
                                        {formatCurrency(line.line_total)}
                                    </td>
                                </tr>
                            ))}
                            <TableStateRow
                                isLoading={false}
                                count={sale.lines?.length ?? 0}
                                columns={4}
                                emptyMessage={t("noLines")}
                            />
                        </DataTable>

                        {sale.payments && sale.payments.length > 0 && (
                            <Card padding="lg">
                                <h2 className="mb-4 border-b border-line pb-3 type-section">
                                    {t("payments")}
                                </h2>
                                <div className="grid gap-2">
                                    {sale.payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between rounded-md bg-surface-muted px-4 py-2 text-sm"
                                        >
                                            <span className="font-semibold uppercase text-ink-secondary">{payment.method}</span>
                                            <span className="text-end">
                                                <span className="block font-bold text-ink tabular-nums">{formatCurrency(payment.amount)}</span>
                                                <span className="block text-xs text-ink-muted">
                                                    {payment.reference ? `${payment.reference} · ` : ""}
                                                    {payment.paid_at ?? "-"}
                                                </span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {sale.promotions && sale.promotions.length > 0 && (
                            <Card padding="lg">
                                <h2 className="mb-4 border-b border-line pb-3 type-section">
                                    {t("promotions")}
                                </h2>
                                <div className="grid gap-2">
                                    {sale.promotions.map((promotion) => (
                                        <div
                                            key={promotion.id}
                                            className="flex items-center justify-between rounded-md bg-surface-muted px-4 py-2 text-sm"
                                        >
                                            <span className="text-ink-secondary">
                                                {promotion.description ?? promotion.promotion_type}
                                            </span>
                                            <span className="font-bold text-success-strong tabular-nums">
                                                - {formatCurrency(promotion.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className="grid gap-6">
                        <Card padding="lg">
                            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                                <h2 className="type-section">{t("summary")}</h2>
                                <StatusPill tone={saleStatusTone(sale.status)}>{sale.status}</StatusPill>
                            </div>
                            <PaymentSummary sale={sale} />
                        </Card>

                        <Card padding="lg" className="text-sm">
                            <h2 className="mb-4 border-b border-line pb-3 type-section">
                                {t("info")}
                            </h2>
                            <div className="grid gap-2">
                                <SummaryRow
                                    label={t("customer")}
                                    value={customerName ?? (sale.partner_id ? rootT("pos.sales.partnerRef", { id: sale.partner_id }) : rootT("pos.sales.walkIn"))}
                                />
                                <SummaryRow label={t("orderDate")} value={sale.order_date ? formatDateID(sale.order_date) : "-"} />
                                <SummaryRow label={t("branch")} value={`#${sale.branch_id}`} />
                                <SummaryRow label={t("register")} value={sale.register_id ? `#${sale.register_id}` : "-"} />
                                <SummaryRow label={t("revenueJournal")} value={sale.revenue_journal_entry_id ? `#${sale.revenue_journal_entry_id}` : "-"} />
                                <SummaryRow label={t("cogsJournal")} value={sale.cogs_journal_entry_id ? `#${sale.cogs_journal_entry_id}` : "-"} />
                                <SummaryRow label={t("completed")} value={sale.completed_at ?? "-"} />
                                {sale.type === "catering" && (
                                    <>
                                        <SummaryRow label={t("fulfilment")} value={sale.fulfilment_date ?? "-"} />
                                        <SummaryRow label={t("batch")} value={sale.fulfilment_time_window ?? "-"} />
                                        <SummaryRow label={t("delivery")} value={sale.delivery_address ?? "-"} />
                                    </>
                                )}
                            </div>
                        </Card>
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
            <span className="text-ink-muted">{label}</span>
            <span className="text-end font-medium text-ink-secondary">{value}</span>
        </div>
    )
}
