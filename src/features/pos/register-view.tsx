"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useSession } from "@/features/auth/session-provider"
import { CartPanel, type CartItem, type CateringFields } from "@/features/pos/components/cart-panel"
import { PaymentDialog } from "@/features/pos/components/payment-dialog"
import { PosSetupChecklist } from "@/features/pos/components/pos-setup-checklist"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"
import { ProductGrid } from "@/features/pos/components/product-grid"
import { RegisterSelector } from "@/features/pos/components/register-selector"
import { ShiftBar } from "@/features/pos/components/shift-bar"
import {
    addSalePayment,
    applyPromotions,
    cancelSale,
    completeSale,
    confirmOrder,
    createSale,
    getCurrentShift,
    getSale,
    listRegisters,
    loadPosDashboardSummary,
    loadCustomers,
    loadProductsForSale,
    openShift,
    removeSalePayment,
    resolveCompanyPrices,
    updateSale,
    type Customer,
    type PosRequestOptions,
} from "@/features/pos/pos-api"
import type { Category, InventoryProduct, ProductVariant } from "@/features/inventory/inventory-types"
import type { AddPaymentInput, PosDashboardSummary, Register, Sale, SaleType, Shift } from "@/features/pos/pos-types"
import { formatIDR } from "@/lib/format"
import { toNumber } from "@/lib/money"

const EMPTY_CATERING: CateringFields = {
    partnerId: "",
    fulfilmentDate: "",
    deliveryAddress: "",
    customerName: "",
}

export function RegisterView() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { token, activeCompanyId, activeBranchId, companies } = useSession()

    const [products, setProducts] = useState<InventoryProduct[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [registers, setRegisters] = useState<Register[]>([])
    const [dashboardSummary, setDashboardSummary] = useState<PosDashboardSummary | null>(null)
    const [selectedRegisterId, setSelectedRegisterId] = useState<number | null>(null)
    const [shift, setShift] = useState<Shift | null>(null)
    const [priceMap, setPriceMap] = useState<Record<string, string | null>>({})

    const [cart, setCart] = useState<CartItem[]>([])
    const [saleType, setSaleType] = useState<SaleType>("counter")
    const [catering, setCatering] = useState<CateringFields>(EMPTY_CATERING)
    const [draftSale, setDraftSale] = useState<Sale | null>(null)
    const [paymentOpen, setPaymentOpen] = useState(false)
    const [openShiftForm, setOpenShiftForm] = useState<{ register_id: string; opening_float: string } | null>(null)

    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const activeCompany = companies.find((entry) => entry.company.id === activeCompanyId)?.company
    const cateringOnly = activeCompany?.slug === "sekalori"
    const effectiveSaleType: SaleType = cateringOnly ? "catering" : saleType

    const selectedRegister = useMemo(
        () => registers.find((register) => register.id === selectedRegisterId) ?? null,
        [registers, selectedRegisterId],
    )
    const selectedRegisterKey =
        activeCompanyId && activeBranchId ? `pos:selected-register:${activeCompanyId}:${activeBranchId}` : null
    const locked = draftSale !== null && (draftSale.status !== "draft" || paymentOpen)
    const canSell = cateringOnly
        ? !!activeBranchId
        : shift?.status === "open" && !!activeBranchId && !!selectedRegister

    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        setError(null)
        try {
            const [catalogue, loadedCustomers, loadedRegisters, summary] = await Promise.all([
                loadProductsForSale(requestOptions),
                loadCustomers(requestOptions).catch(() => [] as Customer[]),
                cateringOnly ? Promise.resolve([] as Register[]) : listRegisters(requestOptions),
                loadPosDashboardSummary(requestOptions).catch(() => null),
            ])
            setProducts(catalogue.products)
            setCategories(catalogue.categories)
            setCustomers(loadedCustomers)
            setRegisters(loadedRegisters)
            setDashboardSummary(summary)

            const activeRegisters = loadedRegisters.filter(
                (register) => register.is_active && (!activeBranchId || register.branch_id === activeBranchId),
            )
            const persistedId =
                selectedRegisterKey && typeof window !== "undefined"
                    ? Number(window.localStorage.getItem(selectedRegisterKey))
                    : NaN
            const persistedRegister = activeRegisters.find((register) => register.id === persistedId)
            if (persistedRegister) {
                setSelectedRegisterId(persistedRegister.id)
            } else if (selectedRegisterKey && typeof window !== "undefined") {
                window.localStorage.removeItem(selectedRegisterKey)
                setSelectedRegisterId((current) =>
                    current && activeRegisters.some((register) => register.id === current) ? current : null,
                )
            }

            // Resolve every variant price in one batch request.
            const variantPrices = await resolveCompanyPrices(requestOptions).catch(
                () => ({}) as Record<number, string>,
            )
            const entries = catalogue.products
                .filter((product) => product.status === "active")
                .flatMap((product) =>
                    product.variants
                        .filter((variant) => variant.is_active)
                        .map(
                            (variant) =>
                                [
                                    `${product.id}:${variant.id}`,
                                    variantPrices[variant.id] ?? null,
                                ] as const,
                        ),
                )
            setPriceMap(Object.fromEntries(entries))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load register.")
        } finally {
            setIsLoading(false)
        }
    }, [activeBranchId, cateringOnly, requestOptions, selectedRegisterKey])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void refreshData()
        })
        return () => {
            active = false
        }
    }, [refreshData])

    useEffect(() => {
        if (cateringOnly || !requestOptions || !selectedRegisterId) {
            return
        }

        let active = true
        void getCurrentShift(requestOptions, selectedRegisterId)
            .then((currentShift) => {
                if (active) setShift(currentShift)
            })
            .catch(() => {
                if (active) setShift(null)
            })
        return () => {
            active = false
        }
    }, [cateringOnly, requestOptions, selectedRegisterId])

    useEffect(() => {
        const saleId = Number(searchParams.get("sale_id"))
        if (!requestOptions || !saleId) return

        let active = true
        void getSale(requestOptions, saleId)
            .then((sale) => {
                if (!active) return
                setDraftSale(sale)
                setSaleType(sale.type)
                setPaymentOpen(sale.status === "confirmed")
                setSelectedRegisterId(sale.register_id ?? null)
                setCatering({
                    partnerId: sale.partner_id ? String(sale.partner_id) : "",
                    fulfilmentDate: sale.fulfilment_date ?? "",
                    deliveryAddress: sale.delivery_address ?? "",
                    customerName: sale.customer_name ?? "",
                })
                setCart(
                    (sale.lines ?? []).map((line) => ({
                        productId: 0,
                        variantId: line.product_variant_id,
                        name: line.description ?? `Variant #${line.product_variant_id}`,
                        variantName: null,
                        sku: `#${line.product_variant_id}`,
                        quantity: toNumber(line.quantity),
                        unitPrice: toNumber(line.unit_price),
                    })),
                )
            })
            .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to resume sale."))

        return () => {
            active = false
        }
    }, [requestOptions, searchParams])

    const resetSale = useCallback(() => {
        setCart([])
        setDraftSale(null)
        setPaymentOpen(false)
        setCatering(EMPTY_CATERING)
        setSaleType(cateringOnly ? "catering" : "counter")
    }, [cateringOnly])

    function handleAdd(product: InventoryProduct, variant: ProductVariant) {
        const resolvedPrice = priceMap[`${product.id}:${variant.id}`]
        if (resolvedPrice === null || resolvedPrice === undefined) return
        const price = toNumber(resolvedPrice)
        setCart((current) => {
            const existing = current.find((item) => item.variantId === variant.id)
            if (existing) {
                return current.map((item) =>
                    item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item,
                )
            }
            return [
                ...current,
                {
                    productId: product.id,
                    variantId: variant.id,
                    name: product.name,
                    variantName: variant.name,
                    sku: variant.sku,
                    quantity: 1,
                    unitPrice: price,
                },
            ]
        })
    }

    function changeQty(variantId: number, delta: number) {
        setCart((current) =>
            current
                .map((item) =>
                    item.variantId === variantId
                        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                        : item,
                )
                .filter((item) => item.quantity > 0),
        )
    }

    async function runMutation(callback: () => Promise<unknown>, successMessage?: string) {
        if (!requestOptions) return
        setIsLoading(true)
        setError(null)
        setMessage(null)
        try {
            await callback()
            if (successMessage) setMessage(successMessage)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "The request failed.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handlePrimaryAction() {
        if (!requestOptions || !activeBranchId || cart.length === 0) return
        if (!cateringOnly && !selectedRegister) return
        if (!cateringOnly && (!shift || shift.status !== "open" || shift.register_id !== selectedRegister?.id)) {
            setError("Open a shift for the selected register before selling.")
            return
        }

        if (effectiveSaleType === "catering" && (!catering.partnerId || !catering.fulfilmentDate)) {
            setError("Catering orders require a customer and a fulfilment date.")
            return
        }

        await runMutation(async () => {
            const payload = {
                type: effectiveSaleType,
                branch_id: cateringOnly ? activeBranchId : selectedRegister!.branch_id,
                register_id: cateringOnly ? undefined : selectedRegister!.id,
                cashier_shift_id: cateringOnly ? undefined : shift!.id,
                partner_id: effectiveSaleType === "catering" ? Number(catering.partnerId) : undefined,
                customer_name:
                    effectiveSaleType === "counter" ? catering.customerName || undefined : undefined,
                fulfilment_date: effectiveSaleType === "catering" ? catering.fulfilmentDate : undefined,
                delivery_address:
                    effectiveSaleType === "catering" ? catering.deliveryAddress || undefined : undefined,
                lines: cart.map((item) => ({
                    product_variant_id: item.variantId,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                })),
            }

            let sale =
                draftSale?.status === "draft"
                    ? await updateSale(requestOptions, draftSale.id, payload)
                    : await createSale(requestOptions, payload)

            sale = await applyPromotions(requestOptions, sale.id)

            if (effectiveSaleType === "catering") {
                sale = await confirmOrder(requestOptions, sale.id)
            }

            setDraftSale(sale)
            if (cateringOnly) {
                resetSale()
                await refreshData()
            } else {
                setPaymentOpen(true)
            }
        }, cateringOnly ? "Catering order confirmed." : undefined)
    }

    async function handleAddPayment(input: AddPaymentInput) {
        if (!requestOptions || !draftSale) return
        await runMutation(async () => {
            const updated = await addSalePayment(requestOptions, draftSale.id, input)
            setDraftSale(updated)
        })
    }

    async function handleRemovePayment(paymentId: number) {
        if (!requestOptions || !draftSale) return
        await runMutation(async () => {
            const updated = await removeSalePayment(requestOptions, draftSale.id, paymentId)
            setDraftSale(updated)
        })
    }

    async function handleComplete() {
        if (!requestOptions || !draftSale) return
        await runMutation(async () => {
            await completeSale(requestOptions, draftSale.id)
            resetSale()
            await refreshData()
        }, "Sale completed.")
    }

    async function handleCancel() {
        if (!requestOptions || !draftSale) {
            resetSale()
            return
        }
        await runMutation(async () => {
            if (draftSale.status === "draft" || draftSale.status === "confirmed") {
                await cancelSale(requestOptions, draftSale.id)
            }
            resetSale()
        })
    }

    function selectRegister(registerId: number | null) {
        setSelectedRegisterId(registerId)
        setShift(null)
        if (!selectedRegisterKey || typeof window === "undefined") return
        if (registerId) {
            window.localStorage.setItem(selectedRegisterKey, String(registerId))
        } else {
            window.localStorage.removeItem(selectedRegisterKey)
        }
    }

    return (
        <div className="grid gap-6">
            <PosPageHeader
                title={cateringOnly ? "Catering Orders" : "POS Dashboard"}
                subtitle={cateringOnly ? "Create and confirm catering orders without registers, shifts, or counter payments." : "Ring up counter and catering sales. Tap a product to add it to the cart, then take payment."}
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                message={message}
                error={error}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: "Active Registers",
                        value: dashboardSummary?.counters.registers.active ?? 0,
                        detail: `${dashboardSummary?.counters.registers.total ?? 0} total`,
                        icon: "pos_terminal",
                        tone: "bg-teal-50 text-teal-700",
                    },
                    {
                        label: "Open Shifts",
                        value: dashboardSummary?.counters.shifts.open ?? 0,
                        detail: "Ready drawers",
                        icon: "shifts",
                        tone: "bg-emerald-50 text-emerald-700",
                    },
                    {
                        label: "Open Sales",
                        value: dashboardSummary?.counters.sales.open ?? 0,
                        detail: "Draft or confirmed",
                        icon: "receipt_long",
                        tone: "bg-amber-50 text-amber-600",
                    },
                    {
                        label: "Today Sales",
                        value: formatIDR(Number(dashboardSummary?.counters.sales.today_total ?? 0)),
                        detail: `${dashboardSummary?.counters.sales.today_count ?? 0} transactions`,
                        icon: "payments",
                        tone: "bg-indigo-50 text-indigo-600",
                    },
                ].filter((item) => !cateringOnly || !["Active Registers", "Open Shifts"].includes(item.label)).map((item) => (
                    <div key={item.label} className="rounded-2xl border border-navy-100 bg-white p-5">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">
                                {item.label}
                            </span>
                            <div className={`rounded-xl p-2 ${item.tone}`}>
                                <Icon name={item.icon} className="text-xl" />
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="h-8 w-28 animate-pulse rounded-lg bg-navy-100" />
                        ) : (
                            <div className="grid gap-1">
                                <span className="text-2xl font-bold font-display text-navy-900">{item.value}</span>
                                <span className="text-sm font-medium text-navy-400">{item.detail}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!cateringOnly ? (
                <>
                    <ShiftBar
                        shift={shift}
                        registers={selectedRegister ? [selectedRegister] : registers}
                        onOpenShift={() => setOpenShiftForm({ register_id: "", opening_float: "" })}
                        onCloseShift={() => router.push("/pos/shifts")}
                    />

                    <div className="grid gap-4 rounded-2xl border border-navy-100 bg-white p-6 lg:grid-cols-[minmax(240px,360px)_1fr]">
                        <RegisterSelector
                            registers={registers}
                            branchId={activeBranchId}
                            value={selectedRegisterId}
                            onChange={selectRegister}
                            disabled={locked}
                        />
                        <PosSetupChecklist
                            hasBranch={!!activeBranchId}
                            hasRegister={!!selectedRegister}
                            hasOpenShift={shift?.status === "open" && shift.register_id === selectedRegisterId}
                        />
                    </div>
                </>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
                <ProductGrid
                    products={products}
                    categories={categories}
                    priceMap={priceMap}
                    onAdd={handleAdd}
                    disabled={!canSell || locked}
                />
                <CartPanel
                    items={cart}
                    saleType={effectiveSaleType}
                    onSaleTypeChange={setSaleType}
                    customers={customers}
                    catering={catering}
                    onCateringChange={(next) => setCatering((cur) => ({ ...cur, ...next }))}
                    onIncrement={(variantId) => changeQty(variantId, 1)}
                    onDecrement={(variantId) => changeQty(variantId, -1)}
                    onRemove={(variantId) => changeQty(variantId, -Infinity)}
                    draftSale={draftSale}
                    locked={locked}
                    isLoading={isLoading}
                    canSell={!!canSell}
                    onPrimaryAction={handlePrimaryAction}
                    onOpenPayment={() => setPaymentOpen(true)}
                    onCancel={handleCancel}
                    cateringOnly={cateringOnly}
                />
            </div>

            <PaymentDialog
                open={paymentOpen}
                onClose={() => setPaymentOpen(false)}
                sale={draftSale}
                isLoading={isLoading}
                onAddPayment={handleAddPayment}
                onRemovePayment={handleRemovePayment}
                onComplete={handleComplete}
                allowPaymentEditing={!cateringOnly}
            />

            {/* Inline open-shift dialog so a cashier can start selling without leaving the register. */}
            {!cateringOnly ? <Dialog
                open={openShiftForm !== null}
                onClose={() => setOpenShiftForm(null)}
                title="Open shift"
                description="Select a register and record the opening cash float."
                footer={
                    <>
                        <Button type="button" variant="outline" size="xl" onClick={() => setOpenShiftForm(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="register-open-shift-form"
                            size="xl"
                            disabled={isLoading || !openShiftForm?.register_id || openShiftForm?.opening_float === ""}
                            className="bg-teal-700 hover:bg-teal-800 text-white"
                        >
                            Open shift
                        </Button>
                    </>
                }
            >
                {openShiftForm && (
                    <form
                        id="register-open-shift-form"
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void runMutation(async () => {
                                const registerId = Number(openShiftForm.register_id)
                                await openShift(requestOptions!, {
                                    register_id: registerId,
                                    opening_float: toNumber(openShiftForm.opening_float),
                                })
                                selectRegister(registerId)
                                setOpenShiftForm(null)
                                await refreshData()
                            }, "Shift opened.")
                        }}
                    >
                        <SearchableSelect
                            label="Register"
                            value={openShiftForm.register_id}
                            onChange={(val) =>
                                setOpenShiftForm((cur) => (cur ? { ...cur, register_id: String(val) } : cur))
                            }
                            required
                            options={registers
                                .filter((r) => r.is_active && (!activeBranchId || r.branch_id === activeBranchId))
                                .map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))}
                            placeholder="Select register"
                        />
                        <Field
                            label="Opening float"
                            type="number"
                            min="0"
                            step="0.01"
                            value={openShiftForm.opening_float}
                            onChange={(event) =>
                                setOpenShiftForm((cur) => (cur ? { ...cur, opening_float: event.target.value } : cur))
                            }
                            placeholder="0"
                            required
                        />
                    </form>
                )}
            </Dialog> : null}
        </div>
    )
}
