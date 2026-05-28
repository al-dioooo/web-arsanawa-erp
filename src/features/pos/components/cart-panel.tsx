"use client"

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
}: CartPanelProps) {
    // Before a draft sale exists, estimate the total locally for display.
    // Once the API returns a sale, its totals are authoritative.
    const localSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const total = draftSale ? toNumber(draftSale.total) : localSubtotal
    const amountPaid = draftSale ? toNumber(draftSale.amount_paid) : 0
    const balanceDue = total - amountPaid

    const primaryLabel = saleType === "catering" ? "Confirm order" : "Charge"
    const primaryDisabled = isLoading || items.length === 0 || !canSell

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-6">
            <SaleTypeToggle value={saleType} onChange={onSaleTypeChange} disabled={locked} />

            {saleType === "catering" ? (
                <div className="grid gap-3 border-b border-navy-50 pb-4">
                    <SearchableSelect
                        label="Customer"
                        value={catering.partnerId}
                        onChange={(val) => onCateringChange({ partnerId: String(val) })}
                        required
                        options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
                        placeholder="Select customer"
                    />
                    <DatePicker
                        label="Fulfilment date"
                        value={catering.fulfilmentDate}
                        onChange={(val) => onCateringChange({ fulfilmentDate: val })}
                        required
                    />
                    <Field
                        label="Delivery address"
                        value={catering.deliveryAddress}
                        onChange={(event) => onCateringChange({ deliveryAddress: event.target.value })}
                        placeholder="Delivery address"
                    />
                </div>
            ) : (
                <div className="border-b border-navy-50 pb-4">
                    <Field
                        label="Customer name (optional)"
                        value={catering.customerName}
                        onChange={(event) => onCateringChange({ customerName: event.target.value })}
                        placeholder="Walk-in"
                    />
                </div>
            )}

            <div className="flex min-h-[120px] flex-col gap-2">
                {items.map((item) => (
                    <div key={item.variantId} className="flex items-center gap-3 rounded-xl border border-navy-100 p-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-navy-900">{item.name}</p>
                            <p className="truncate text-xs text-navy-500">
                                {item.variantName ? `${item.variantName} · ` : ""}
                                {formatCurrency(item.unitPrice)}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => onDecrement(item.variantId)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-navy-100 text-navy-600 hover:bg-navy-50 disabled:opacity-50 cursor-pointer outline-none"
                            >
                                <Icon name="chevron_left" size={16} />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-navy-900">{item.quantity}</span>
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => onIncrement(item.variantId)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-navy-100 text-navy-600 hover:bg-navy-50 disabled:opacity-50 cursor-pointer outline-none"
                            >
                                <Icon name="chevron_right" size={16} />
                            </button>
                        </div>
                        <div className="w-24 text-right text-sm font-bold text-navy-900">
                            {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        <button
                            type="button"
                            disabled={locked}
                            onClick={() => onRemove(item.variantId)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-navy-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 cursor-pointer outline-none"
                        >
                            <Icon name="delete" size={16} />
                        </button>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="flex flex-1 items-center justify-center py-8 text-sm font-medium text-navy-400">
                        Tap products to add them to the sale.
                    </div>
                )}
            </div>

            <div className="grid gap-1.5 border-t border-navy-50 pt-4 text-sm">
                {draftSale && (
                    <>
                        <Row label="Subtotal" value={formatCurrency(draftSale.subtotal)} />
                        {toNumber(draftSale.discount_total) > 0 && (
                            <Row label="Discount" value={`- ${formatCurrency(draftSale.discount_total)}`} />
                        )}
                        <Row label="Tax" value={formatCurrency(draftSale.tax_total)} />
                    </>
                )}
                <div className="flex justify-between pt-1 text-base font-bold text-navy-900">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                </div>
                {draftSale && (
                    <>
                        <Row label="Paid" value={formatCurrency(amountPaid)} />
                        <div className="flex justify-between font-bold text-teal-700">
                            <span>Balance due</span>
                            <span>{formatCurrency(balanceDue)}</span>
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
                        className="w-full bg-teal-700 hover:bg-teal-800 text-white"
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
                            className="w-full bg-teal-700 hover:bg-teal-800 text-white"
                        >
                            <Icon name="payments" size={18} />
                            {saleType === "catering" ? "Manage payments / complete" : "Take payment"}
                        </Button>
                        <Button type="button" variant="outline" size="xl" disabled={isLoading} onClick={onCancel}>
                            Cancel sale
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-navy-500">
            <span>{label}</span>
            <span className="font-medium text-navy-700">{value}</span>
        </div>
    )
}
