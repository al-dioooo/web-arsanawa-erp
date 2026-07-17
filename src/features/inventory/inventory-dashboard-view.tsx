"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { buttonVariants } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { MotionLinkItem } from "@/components/ui/motion-link"
import { PageHeader } from "@/components/ui/page-header"
import { StaggerGroup, StaggerItem } from "@/components/ui/stagger"
import { StatCard } from "@/components/ui/stat-card"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import { NeedsAttentionCard, type AttentionRow } from "@/features/home/components/needs-attention-card"
import { useInventoryDashboardSummary } from "@/features/inventory/inventory-api"
import { toNumber } from "@/lib/money"

// Module-level Intl-bound formatters: referentially stable across renders,
// as useCountUp (inside StatCard) requires.
const idrFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
})
const formatIdrValue = idrFormatter.format.bind(idrFormatter)
const countFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })
const formatCountValue = countFormatter.format.bind(countFormatter)

/** Master-data quick links; labels reuse the shared `inventory.nav` keys. */
const quickActions = [
    { href: "/inventory/master/products", icon: "inventory_products", labelKey: "products" },
    { href: "/inventory/master/categories", icon: "inventory_categories", labelKey: "categories" },
    { href: "/inventory/master/brands", icon: "inventory_brands", labelKey: "brands" },
    { href: "/inventory/master/units-of-measure", icon: "inventory_units", labelKey: "unitsOfMeasure" },
    { href: "/inventory/master/product-units", icon: "inventory_product_units", labelKey: "productUnits" },
    { href: "/inventory/master/variant-groups", icon: "inventory_variant_groups", labelKey: "variantGroups" },
    { href: "/inventory/master/variants", icon: "inventory_variants", labelKey: "variantList" },
] as const

export function InventoryDashboardView() {
    const { activeCompanyId } = useSession()
    const t = useTranslations("inventory.dashboard")
    const navT = useTranslations("inventory.nav")

    const hasCompany = Boolean(activeCompanyId)
    const summary = useInventoryDashboardSummary(hasCompany)
    const counters = summary.data?.counters

    const attentionRows: AttentionRow[] = []
    if (counters) {
        if (counters.stock_movements.unsettled > 0) {
            attentionRows.push({
                key: "unsettled-movements",
                icon: "inventory_movements",
                label: t("needsAttention.unsettledMovements"),
                count: counters.stock_movements.unsettled,
                href: "/inventory/stock/movements",
            })
        }
        if (counters.stock_lots.expiring_soon > 0) {
            attentionRows.push({
                key: "expiring-lots",
                icon: "inventory_stock_lots",
                label: t("needsAttention.expiringLots"),
                count: counters.stock_lots.expiring_soon,
                href: "/inventory/stock/lots",
            })
        }
    }

    return (
        <div className="grid gap-6">
            <PageHeader
                dataAttribute="data-inventory-page-header"
                eyebrow={t("eyebrow")}
                title={t("title")}
                subtitle={t("subtitle")}
                status={
                    <StatusPill tone={hasCompany ? "green" : "amber"}>
                        {hasCompany ? t("status.scoped") : t("status.noCompany")}
                    </StatusPill>
                }
                actions={
                    <Link href="/inventory/master/products" className={buttonVariants()}>
                        {t("newProduct")}
                    </Link>
                }
                className="mb-0"
            />

            <StaggerGroup
                as="section"
                className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4"
            >
                <StaggerItem>
                    <StatCard
                        label={t("statCards.products")}
                        href="/inventory/master/products"
                        value={counters?.products.total ?? 0}
                        formatValue={formatCountValue}
                        isLoading={summary.isLoading}
                        isError={summary.isError}
                        errorLabel={t("widgetError")}
                        badge={
                            <StatusPill tone="neutral">
                                {t("statCards.activeCount", { count: counters?.products.active ?? 0 })}
                            </StatusPill>
                        }
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCard
                        label={t("statCards.sellableSkus")}
                        href="/inventory/master/product-units"
                        value={counters?.product_units.total ?? 0}
                        formatValue={formatCountValue}
                        isLoading={summary.isLoading}
                        isError={summary.isError}
                        errorLabel={t("widgetError")}
                        badge={
                            <StatusPill tone="neutral">
                                {t("statCards.activeCount", { count: counters?.product_units.active ?? 0 })}
                            </StatusPill>
                        }
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCard
                        label={t("statCards.stockValue")}
                        href="/inventory/stock"
                        value={toNumber(counters?.stock_value)}
                        formatValue={formatIdrValue}
                        isLoading={summary.isLoading}
                        isError={summary.isError}
                        errorLabel={t("widgetError")}
                        badge={
                            <StatusPill tone="neutral">
                                {t("statCards.activeLots", { count: counters?.stock_lots.active ?? 0 })}
                            </StatusPill>
                        }
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCard
                        label={t("statCards.unsettledMovements")}
                        href="/inventory/stock/movements"
                        value={counters?.stock_movements.unsettled ?? 0}
                        formatValue={formatCountValue}
                        isLoading={summary.isLoading}
                        isError={summary.isError}
                        errorLabel={t("widgetError")}
                        badge={
                            <StatusPill tone="neutral">
                                {t("statCards.ledgerRows", { count: counters?.stock_movements.total ?? 0 })}
                            </StatusPill>
                        }
                    />
                </StaggerItem>
            </StaggerGroup>

            {/* The stat row already surfaces the failure four times over — the
                work queue hides on error instead of faking an all-clear. */}
            {summary.isError ? null : (
                <NeedsAttentionCard
                    title={t("needsAttention.title")}
                    rows={attentionRows}
                    isLoading={summary.isLoading}
                    allClearTitle={t("needsAttention.allClear")}
                    allClearHint={t("needsAttention.allClearHint")}
                />
            )}

            <section className="grid gap-4">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="type-section">{t("quickActions.title")}</h2>
                    <Link
                        href="/inventory/catalogue"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink transition-colors hover:underline"
                    >
                        {t("quickActions.openCatalogue")}
                        <Icon name="chevron_right" size={16} />
                    </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {quickActions.map((action) => (
                        <MotionLinkItem
                            key={action.href}
                            href={action.href}
                            icon={action.icon}
                            label={navT(action.labelKey)}
                        />
                    ))}
                </div>
            </section>
        </div>
    )
}
