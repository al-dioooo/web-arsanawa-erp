"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { SaleTypeToggle } from "@/features/pos/components/sale-type-toggle"
import type { Customer } from "@/features/pos/pos-api"
import type { Sale, SaleType } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"

export type CartItem = {
    productId: number
    variantId: number
    name: string
    variantName: string | null
    sku: string
    quantity: number
    unitPrice: number
}

export type CateringFields = {
    partnerId: string
    fulfilmentDate: string
    deliveryAddress: string
    customerName: string
}

type CartPanelProps = {
    items: CartItem[]
    saleType: SaleType
    onSaleTypeChange: (type: SaleType) => void
    customers: Customer[]
    catering: CateringFields
    onCateringChange: (next: Partial<CateringFields>) => void
    onIncrement: (variantId: number) => void
    onDecrement: (variantId: number) => void
    onRemove: (variantId: number) => void
    draftSale: Sale | null
    locked: boolean
    isLoading: boolean
    canSell: boolean
    onPrimaryAction: () => void
    onOpenPayment: () => void
    onCancel: () => void
    cateringOnly?: boolean
}

export function CartPanel({
    items,
    saleType,
    onSaleTypeChange,
    customers,
    catering,
    onCateringChange,
    onIncrement,
    onDecrement,
    onRemove,
    draftSale,
    locked,
    isLoading,
    canSell,
    onPrimaryAction,
    onOpenPayment,
    onCancel,
    cateringOnly = false,
}: CartPanelProps) {
    const t = useTranslations("pos.register.cart")

    // Before a draft sale exists, estimate the total locally for display.
    // Once the API returns a sale, its totals are authoritative.
    const localSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const total = draftSale ? toNumber(draftSale.total) : localSubtotal
    const amountPaid = draftSale ? toNumber(draftSale.amount_paid) : 0
    const balanceDue = total - amountPaid

    const primaryLabel = saleType === "catering" ? t("confirmOrder") : t("charge")
    const primaryDisabled = isLoading || items.length === 0 || !canSell

    return (
        <div className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card">
            {!cateringOnly ? (
                <SaleTypeToggle value={saleType} onChange={onSaleTypeChange} disabled={locked} />
            ) : null}

            {saleType === "catering" ? (
                <div className="grid gap-3 border-b border-line pb-4">
                    <SearchableSelect
                        label={t("customer")}
                        value={catering.partnerId}
                        onChange={(val) => onCateringChange({ partnerId: String(val) })}
                        required
                        options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
                        placeholder={t("selectCustomer")}
                    />
                    <DatePicker
                        label={t("fulfilmentDate")}
                        value={catering.fulfilmentDate}
                        onChange={(val) => onCateringChange({ fulfilmentDate: val })}
                        required
                    />
                    <Field
                        label={t("deliveryAddress")}
                        value={catering.deliveryAddress}
                        onChange={(event) => onCateringChange({ deliveryAddress: event.target.value })}
                        placeholder={t("deliveryAddress")}
                    />
                </div>
            ) : (
                <div className="border-b border-line pb-4">
                    <Field
                        label={t("customerName")}
                        value={catering.customerName}
                        onChange={(event) => onCateringChange({ customerName: event.target.value })}
                        placeholder={t("walkIn")}
                    />
                </div>
            )}

            <div className="flex min-h-[120px] flex-col gap-2">
                {items.map((item) => (
                    <div key={item.variantId} className="flex items-center gap-3 rounded-md border border-line p-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                            <p className="truncate text-xs text-ink-muted">
                                {item.variantName ? `${item.variantName} · ` : ""}
                                {formatCurrency(item.unitPrice)}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => onDecrement(item.variantId)}
                                className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-secondary hover:bg-surface-muted disabled:opacity-50 cursor-pointer outline-none"
                            >
                                <Icon name="chevron_left" size={16} />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-ink">{item.quantity}</span>
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => onIncrement(item.variantId)}
                                className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-secondary hover:bg-surface-muted disabled:opacity-50 cursor-pointer outline-none"
                            >
                                <Icon name="chevron_right" size={16} />
                            </button>
                        </div>
                        <div className="w-24 text-right text-sm font-bold text-ink tabular-nums">
                            {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        <button
                            type="button"
                            disabled={locked}
                            onClick={() => onRemove(item.variantId)}
                            className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-faint hover:bg-error-soft hover:text-error-strong disabled:opacity-50 cursor-pointer outline-none"
                        >
                            <Icon name="delete" size={16} />
                        </button>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="flex flex-1 items-center justify-center py-8 text-sm font-medium text-ink-muted">
                        {t("empty")}
                    </div>
                )}
            </div>

            <div className="grid gap-1.5 border-t border-line pt-4 text-sm">
                {draftSale && (
                    <>
                        <Row label={t("subtotal")} value={formatCurrency(draftSale.subtotal)} />
                        {toNumber(draftSale.discount_total) > 0 && (
                            <Row label={t("discount")} value={`- ${formatCurrency(draftSale.discount_total)}`} />
                        )}
                        <Row label={t("tax")} value={formatCurrency(draftSale.tax_total)} />
                    </>
                )}
                <div className="flex justify-between pt-1 text-base font-bold text-ink">
                    <span>{t("total")}</span>
                    <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
                {draftSale && (
                    <>
                        <Row label={t("paid")} value={formatCurrency(amountPaid)} />
                        <div className="flex justify-between font-bold text-brand-ink">
                            <span>{t("balanceDue")}</span>
                            <span className="tabular-nums">{formatCurrency(balanceDue)}</span>
                        </div>
                    </>
                )}
            </div>

            <div className="grid gap-2">
                {!locked ? (
                    <Button
                        type="button"
                        size="xl"
                        disabled={primaryDisabled}
                        onClick={onPrimaryAction}
                        className="w-full"
                    >
                        {primaryLabel}
                    </Button>
                ) : (
                    <>
                        <Button
                            type="button"
                            size="xl"
                            disabled={isLoading}
                            onClick={onOpenPayment}
                            className="w-full"
                        >
                            <Icon name="payments" size={18} />
                            {saleType === "catering" ? t("managePayments") : t("takePayment")}
                        </Button>
                        <Button type="button" variant="outline" size="xl" disabled={isLoading} onClick={onCancel}>
                            {t("cancelSale")}
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-ink-muted">
            <span>{label}</span>
            <span className="font-medium text-ink-secondary tabular-nums">{value}</span>
        </div>
    )
}
