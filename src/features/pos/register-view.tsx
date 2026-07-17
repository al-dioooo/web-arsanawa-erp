"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { Modal } from "@/components/ui/modal"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Skeleton } from "@/components/ui/skeleton"
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
    const t = useTranslations("pos.register")
    const rootT = useTranslations()
    // Latest translator for effects that must not re-run when the translator
    // identity changes (e.g. the sale_id resume effect).
    const tRef = useRef(t)
    useEffect(() => {
        tRef.current = t
    })
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

    const loadErrorFallback = t("loadError")
    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
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
            toast.error(caught instanceof Error ? caught.message : loadErrorFallback)
        } finally {
            setIsLoading(false)
        }
    }, [activeBranchId, cateringOnly, requestOptions, selectedRegisterKey, loadErrorFallback])

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
                        name: line.description ?? tRef.current("variantRef", { id: line.product_variant_id }),
                        variantName: null,
                        sku: `#${line.product_variant_id}`,
                        quantity: toNumber(line.quantity),
                        unitPrice: toNumber(line.unit_price),
                    })),
                )
            })
            .catch((caught) => toast.error(caught instanceof Error ? caught.message : tRef.current("resumeError")))

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
        try {
            await callback()
            if (successMessage) toast.success(successMessage)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("loadError"))
        } finally {
            setIsLoading(false)
        }
    }

    async function handlePrimaryAction() {
        if (!requestOptions || !activeBranchId || cart.length === 0) return
        if (!cateringOnly && !selectedRegister) return
        if (!cateringOnly && (!shift || shift.status !== "open" || shift.register_id !== selectedRegister?.id)) {
            toast.error(t("shiftNeeded"))
            return
        }

        if (effectiveSaleType === "catering" && (!catering.partnerId || !catering.fulfilmentDate)) {
            toast.error(t("cateringRequired"))
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
        }, cateringOnly ? t("cateringConfirmed") : undefined)
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
        }, t("saleCompleted"))
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

    const kpis: {
        key: string
        label: string
        value: string | number
        detail: string
        icon: string
        tone: string
        hideWhenCateringOnly: boolean
    }[] = [
        {
            key: "activeRegisters",
            label: t("kpis.activeRegisters"),
            value: dashboardSummary?.counters.registers.active ?? 0,
            detail: t("kpis.totalCount", { count: dashboardSummary?.counters.registers.total ?? 0 }),
            icon: "pos_terminal",
            tone: "bg-brand-soft text-brand-ink",
            hideWhenCateringOnly: true,
        },
        {
            key: "openShifts",
            label: t("kpis.openShifts"),
            value: dashboardSummary?.counters.shifts.open ?? 0,
            detail: t("kpis.readyDrawers"),
            icon: "shifts",
            tone: "bg-success-soft text-success-strong",
            hideWhenCateringOnly: true,
        },
        {
            key: "openSales",
            label: t("kpis.openSales"),
            value: dashboardSummary?.counters.sales.open ?? 0,
            detail: t("kpis.openSalesDetail"),
            icon: "receipt_long",
            tone: "bg-warning-soft text-warning-strong",
            hideWhenCateringOnly: false,
        },
        {
            key: "todaySales",
            label: t("kpis.todaySales"),
            value: formatIDR(Number(dashboardSummary?.counters.sales.today_total ?? 0)),
            detail: t("kpis.transactions", { count: dashboardSummary?.counters.sales.today_count ?? 0 }),
            icon: "payments",
            tone: "bg-surface-muted text-ink-secondary",
            hideWhenCateringOnly: false,
        },
    ]

    return (
        <div className="grid gap-6">
            <PosPageHeader
                title={cateringOnly ? t("cateringTitle") : t("title")}
                subtitle={cateringOnly ? t("cateringSubtitle") : t("subtitle")}
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.filter((item) => !cateringOnly || !item.hideWhenCateringOnly).map((item) => (
                    <Card key={item.key} padding="md">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <span className="type-card-label">{item.label}</span>
                            <div className={`rounded-md p-2 ${item.tone}`}>
                                <Icon name={item.icon} className="text-xl" />
                            </div>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <div className="grid gap-1">
                                <span className="type-card-value">{item.value}</span>
                                <span className="text-sm font-medium text-ink-muted">{item.detail}</span>
                            </div>
                        )}
                    </Card>
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

                    <Card padding="lg" className="grid gap-4 lg:grid-cols-[minmax(240px,360px)_1fr]">
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
                    </Card>
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
            {!cateringOnly ? <Modal
                open={openShiftForm !== null}
                onClose={() => setOpenShiftForm(null)}
                title={t("openShiftDialog.title")}
                description={t("openShiftDialog.description")}
                footer={
                    <>
                        <Button type="button" variant="outline" size="xl" onClick={() => setOpenShiftForm(null)}>
                            {rootT("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            form="register-open-shift-form"
                            size="xl"
                            disabled={isLoading || !openShiftForm?.register_id || openShiftForm?.opening_float === ""}
                        >
                            {t("openShiftDialog.submit")}
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
                            }, t("shiftOpened"))
                        }}
                    >
                        <SearchableSelect
                            label={t("openShiftDialog.register")}
                            value={openShiftForm.register_id}
                            onChange={(val) =>
                                setOpenShiftForm((cur) => (cur ? { ...cur, register_id: String(val) } : cur))
                            }
                            required
                            options={registers
                                .filter((r) => r.is_active && (!activeBranchId || r.branch_id === activeBranchId))
                                .map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))}
                            placeholder={t("openShiftDialog.selectRegister")}
                        />
                        <Field
                            label={t("openShiftDialog.openingFloat")}
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
            </Modal> : null}
        </div>
    )
}
