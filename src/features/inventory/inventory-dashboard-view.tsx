"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
import { loadInventoryDashboardSummary, type InventoryRequestOptions } from "@/features/inventory/inventory-api"
import { InventoryPageHeader, inventoryPrimaryActionLinkClass, inventorySurfaceClass } from "@/features/inventory/inventory-layout"
import type { InventoryDashboardSummary } from "@/features/inventory/inventory-types"
import { formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"

const quickActions = [
    { href: "/inventory/master/products", label: "Products", icon: "inventory_products", tone: "bg-teal-50 text-teal-700" },
    { href: "/inventory/master/categories", label: "Product Categories", icon: "inventory_categories", tone: "bg-orange-50 text-orange-600" },
    { href: "/inventory/master/brands", label: "Product Brands", icon: "inventory_brands", tone: "bg-amber-50 text-amber-600" },
    { href: "/inventory/master/units-of-measure", label: "Units of Measure", icon: "inventory_units", tone: "bg-indigo-50 text-indigo-600" },
    { href: "/inventory/master/product-units", label: "Product Units", icon: "inventory_product_units", tone: "bg-emerald-50 text-emerald-700" },
    { href: "/inventory/master/variant-groups", label: "Variant Groups", icon: "inventory_variant_groups", tone: "bg-sky-50 text-sky-700" },
    { href: "/inventory/master/variants", label: "Variants", icon: "inventory_variants", tone: "bg-violet-50 text-violet-700" },
]

export function InventoryDashboardView() {
    const { token, activeCompanyId } = useSession()
    const [summary, setSummary] = useState<InventoryDashboardSummary | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const requestOptions = useMemo<InventoryRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const refreshSummary = useCallback(async () => {
        if (!requestOptions) return

        setIsLoading(true)
        try {
            setSummary(await loadInventoryDashboardSummary(requestOptions))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to load inventory dashboard.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void refreshSummary()
        })
        return () => {
            active = false
        }
    }, [refreshSummary])

    const counters = summary?.counters
    const kpis = [
        {
            label: "Products",
            value: counters?.products.total ?? 0,
            detail: `${counters?.products.active ?? 0} active`,
            icon: "inventory_products",
            tone: "bg-teal-50 text-teal-700",
            href: "/inventory/master/products",
        },
        {
            label: "Sellable SKUs",
            value: counters?.product_units.total ?? 0,
            detail: `${counters?.product_units.active ?? 0} active`,
            icon: "inventory_product_units",
            tone: "bg-emerald-50 text-emerald-700",
            href: "/inventory/master/product-units",
        },
        {
            label: "Stock Value",
            value: formatIDR(Number(counters?.stock_value ?? 0)),
            detail: `${counters?.stock_lots.active ?? 0} active lots`,
            icon: "account_balance",
            tone: "bg-amber-50 text-amber-600",
            href: "/inventory/stock",
            wide: true,
        },
        {
            label: "Unsettled Movements",
            value: counters?.stock_movements.unsettled ?? 0,
            detail: `${counters?.stock_movements.total ?? 0} ledger rows`,
            icon: "inventory_transfer",
            tone: "bg-rose-50 text-rose-600",
            href: "/inventory/stock/movements",
        },
    ]

    return (
        <div className="grid gap-6">
            <InventoryPageHeader
                title="Inventory Dashboard"
                description="Track catalogue readiness, sellable SKUs, stock value, and movement work that still needs attention."
                isCompanyScoped={Boolean(activeCompanyId)}
                actions={(
                    <Link href="/inventory/master/products" className={inventoryPrimaryActionLinkClass}>
                        New Product
                    </Link>
                )}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <Link
                        key={kpi.label}
                        href={kpi.href}
                        className={cn(
                            "rounded-2xl border border-navy-100 bg-white p-5 transition-all hover:border-teal-300 hover:shadow-md",
                            kpi.wide ? "md:col-span-2 xl:col-span-1" : "",
                        )}
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">
                                {kpi.label}
                            </span>
                            <div className={cn("rounded-xl p-2", kpi.tone)}>
                                <Icon name={kpi.icon} className="text-xl" />
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="h-8 w-28 animate-pulse rounded-lg bg-navy-100" />
                        ) : (
                            <div className="grid gap-1">
                                <span className="text-2xl font-bold font-display text-navy-900">{kpi.value}</span>
                                <span className="text-sm font-medium text-navy-400">{kpi.detail}</span>
                            </div>
                        )}
                    </Link>
                ))}
            </div>

            <section className={cn(inventorySurfaceClass, "p-6")}>
                <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="flex items-center gap-2 text-base font-bold text-navy-900 font-display">
                        <Icon name="bolt" className="text-navy-400" />
                        Quick Actions
                    </h2>
                    <Link href="/inventory/catalogue" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                        Open catalogue →
                    </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {quickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="group flex min-h-20 items-center gap-3 rounded-xl border border-navy-100 p-4 transition-colors hover:border-teal-300 hover:bg-navy-50/50"
                        >
                            <div className={cn("rounded-xl p-2 transition-transform group-hover:scale-105", action.tone)}>
                                <Icon name={action.icon} className="text-xl" />
                            </div>
                            <span className="font-semibold text-navy-800">{action.label}</span>
                            <Icon name="chevron_right" className="ml-auto text-navy-300" />
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
