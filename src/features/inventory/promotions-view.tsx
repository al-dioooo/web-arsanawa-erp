"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, SelectField } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { StatusPill } from "@/components/ui/status-pill"
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs"
import { Icon } from "@/components/ui/icon"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useSession } from "@/features/auth/session-provider"
import { InventoryPageHeader } from "@/features/inventory/inventory-layout"
import {
    createDiscount,
    createReward,
    deleteDiscount,
    deleteReward,
    loadInventory,
} from "@/features/inventory/inventory-api"
import type {
    Category,
    Discount,
    InventoryProduct,
    Reward,
} from "@/features/inventory/inventory-types"

const quantityFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 })

function numberLabel(value: string | number | null | undefined): string {
    const numeric = Number(value ?? 0)
    return quantityFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

function readableError(caught: unknown, fallback: string): string {
    return caught instanceof Error && caught.message ? caught.message : fallback
}

type DiscountTargetType = "variant" | "product" | "category"

type DiscountTargetRow = { target_type: DiscountTargetType; target_id: string }
type DiscountDependencyRow = { product_variant_id: string; required_quantity: string }
type DiscountGiveawayRow = { product_variant_id: string; giveaway_quantity: string }

type PromotionsTranslator = (key: string, values?: Record<string, string | number>) => string

/** Compact "2 targets · 1 giveaway" summary for a discount card, or null. */
function discountConfigSummary(discount: Discount, t: PromotionsTranslator): string | null {
    const parts: string[] = []
    if (discount.targets?.length) {
        const count = discount.targets.length
        parts.push(t(count === 1 ? "summary.target" : "summary.targets", { count }))
    }
    if (discount.dependencies?.length) {
        const count = discount.dependencies.length
        parts.push(t(count === 1 ? "summary.dependency" : "summary.dependencies", { count }))
    }
    if (discount.giveaways?.length) {
        const count = discount.giveaways.length
        parts.push(t(count === 1 ? "summary.giveaway" : "summary.giveaways", { count }))
    }
    return parts.length > 0 ? parts.join(" · ") : null
}

export function PromotionsView() {
    const t = useTranslations("inventory.promotions")
    const rootT = useTranslations()
    const { token, activeCompanyId, organizationContext } = useSession()
    const [discounts, setDiscounts] = useState<Discount[]>([])
    const [rewards, setRewards] = useState<Reward[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [products, setProducts] = useState<InventoryProduct[]>([])
    const [formTab, setFormTab] = useState<"discount" | "reward">("discount")
    const [confirm, confirmDialog] = useConfirm()

    const [isLoading, setIsLoading] = useState(false)

    // Form states
    const [discountForm, setDiscountForm] = useState({
        name: "",
        calculation_type: "percentage" as "percentage" | "amount",
        value: "",
        branch_id: "",
        min_quantity: "",
        effective_from: today(),
        effective_to: "",
        targets: [] as DiscountTargetRow[],
        dependencies: [] as DiscountDependencyRow[],
        giveaways: [] as DiscountGiveawayRow[],
    })

    const [rewardForm, setRewardForm] = useState({
        name: "",
        calculation_type: "percentage" as "percentage" | "amount",
        value: "",
        branch_id: "",
        min_quantity: "",
        effective_from: today(),
        effective_to: "",
    })

    const requestOptions = useMemo(() => {
        if (!token || !activeCompanyId) {
            return null
        }
        return { token, companyId: activeCompanyId }
    }, [activeCompanyId, token])

    const branches = organizationContext?.branches ?? []

    const variantOptions = useMemo(
        () =>
            products.flatMap((product) =>
                product.variants.map((variant) => ({
                    value: variant.id,
                    label: `${product.name} (${variant.sku})`,
                }))
            ),
        [products]
    )

    const productOptions = useMemo(
        () => products.map((product) => ({ value: product.id, label: product.name })),
        [products]
    )

    const categoryOptions = useMemo(
        () => categories.map((category) => ({ value: category.id, label: category.name })),
        [categories]
    )

    function targetOptionsFor(targetType: DiscountTargetType) {
        if (targetType === "variant") return variantOptions
        if (targetType === "product") return productOptions
        return categoryOptions
    }

    function targetPlaceholderFor(targetType: DiscountTargetType): string {
        if (targetType === "variant") return t("form.selectVariant")
        if (targetType === "product") return t("form.selectProduct")
        return t("form.selectCategory")
    }

    const loadErrorFallback = t("loadError")

    const refreshData = useCallback(async () => {
        if (!requestOptions) return

        setIsLoading(true)

        try {
            const loaded = await loadInventory(requestOptions, { includePromotions: true })
            setCategories(loaded.categories)
            setProducts(loaded.products)
            setDiscounts(loaded.discounts)
            setRewards(loaded.rewards)
        } catch (caught) {
            toast.error(readableError(caught, loadErrorFallback))
        } finally {
            setIsLoading(false)
        }
    }, [loadErrorFallback, requestOptions])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) {
                void refreshData()
            }
        })
        return () => {
            active = false
        }
    }, [refreshData])

    async function handleCreateDiscount(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!requestOptions) return

        // An incomplete row must block the submit: silently dropping an empty
        // target row would ship an untargeted discount that applies to the
        // whole catalogue.
        if (
            discountForm.targets.some((target) => target.target_id === "") ||
            discountForm.dependencies.some((dependency) => dependency.product_variant_id === "") ||
            discountForm.giveaways.some((giveaway) => giveaway.product_variant_id === "")
        ) {
            toast.error(t("toasts.incompleteRows"))
            return
        }

        setIsLoading(true)

        const targets = discountForm.targets.map((target) => ({
            target_type: target.target_type,
            target_id: Number(target.target_id),
        }))
        const dependencies = discountForm.dependencies.map((dependency) => ({
            product_variant_id: Number(dependency.product_variant_id),
            required_quantity: Number(dependency.required_quantity),
        }))
        const giveaways = discountForm.giveaways.map((giveaway) => ({
            product_variant_id: Number(giveaway.product_variant_id),
            giveaway_quantity: Number(giveaway.giveaway_quantity),
        }))

        try {
            await createDiscount(requestOptions, {
                name: discountForm.name,
                calculation_type: discountForm.calculation_type,
                value: Number(discountForm.value),
                branch_id: discountForm.branch_id ? Number(discountForm.branch_id) : null,
                min_quantity: discountForm.min_quantity ? Number(discountForm.min_quantity) : null,
                effective_from: discountForm.effective_from,
                effective_to: discountForm.effective_to || null,
                is_active: true,
                ...(targets.length > 0 ? { targets } : {}),
                ...(dependencies.length > 0 ? { dependencies } : {}),
                ...(giveaways.length > 0 ? { giveaways } : {}),
            })
            toast.success(t("toasts.discountCreated"))
            setDiscountForm({
                name: "",
                calculation_type: "percentage",
                value: "",
                branch_id: "",
                min_quantity: "",
                effective_from: today(),
                effective_to: "",
                targets: [],
                dependencies: [],
                giveaways: [],
            })
            await refreshData()
        } catch (caught) {
            toast.error(readableError(caught, t("toasts.discountCreateFailed")))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDeleteDiscount(discount: Discount) {
        if (!requestOptions) return

        const ok = await confirm({
            title: t("deleteConfirm.title", { name: discount.name }),
            message: t("deleteConfirm.discountMessage"),
            confirmLabel: rootT("common.delete"),
            cancelLabel: rootT("common.cancel"),
            danger: true,
        })
        if (!ok) return

        setIsLoading(true)

        try {
            await deleteDiscount(requestOptions, discount.id)
            toast.success(t("toasts.discountDeleted"))
            await refreshData()
        } catch (caught) {
            toast.error(readableError(caught, t("toasts.discountDeleteFailed")))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDeleteReward(reward: Reward) {
        if (!requestOptions) return

        const ok = await confirm({
            title: t("deleteConfirm.title", { name: reward.name }),
            message: t("deleteConfirm.rewardMessage"),
            confirmLabel: rootT("common.delete"),
            cancelLabel: rootT("common.cancel"),
            danger: true,
        })
        if (!ok) return

        setIsLoading(true)

        try {
            await deleteReward(requestOptions, reward.id)
            toast.success(t("toasts.rewardDeleted"))
            await refreshData()
        } catch (caught) {
            toast.error(readableError(caught, t("toasts.rewardDeleteFailed")))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleCreateReward(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!requestOptions) return

        setIsLoading(true)

        try {
            await createReward(requestOptions, {
                name: rewardForm.name,
                calculation_type: rewardForm.calculation_type,
                value: Number(rewardForm.value),
                branch_id: rewardForm.branch_id ? Number(rewardForm.branch_id) : null,
                min_quantity: rewardForm.min_quantity ? Number(rewardForm.min_quantity) : null,
                effective_from: rewardForm.effective_from,
                effective_to: rewardForm.effective_to || null,
                is_active: true,
            })
            toast.success(t("toasts.rewardCreated"))
            setRewardForm({
                name: "",
                calculation_type: "percentage",
                value: "",
                branch_id: "",
                min_quantity: "",
                effective_from: today(),
                effective_to: "",
            })
            await refreshData()
        } catch (caught) {
            toast.error(readableError(caught, t("toasts.rewardCreateFailed")))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-6">
            {confirmDialog}
            <InventoryPageHeader
                title={t("title")}
                description={t("subtitle")}
                isCompanyScoped={Boolean(activeCompanyId)}
            />

            {/* Main Grid Layout */}
            <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
                {/* Left Side: Side-by-side lists */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Discounts List */}
                    <Card padding="lg" className="flex flex-col gap-4">
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name="percent" className="text-brand-ink" />
                            <span>{t("discounts.heading", { count: discounts.length })}</span>
                        </h2>

                        <div className="grid max-h-150 gap-3 overflow-y-auto pe-1">
                            {discounts.map((discount) => {
                                const configSummary = discountConfigSummary(discount, t)
                                return (
                                    <Card as="article" inset padding="sm" key={discount.id} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="truncate text-sm font-bold text-ink">{discount.name}</h3>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <StatusPill tone={discount.is_active ? "green" : "neutral"}>
                                                    {discount.is_active ? t("card.active") : t("card.inactive")}
                                                </StatusPill>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label={t("deleteDiscountAria", { name: discount.name })}
                                                    onClick={() => void handleDeleteDiscount(discount)}
                                                >
                                                    <Icon name="delete" size={14} />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-1 text-xs font-semibold text-ink-secondary">
                                            {t("card.value")}{" "}
                                            <span className="text-brand-ink">{numberLabel(discount.value)}</span>
                                            {discount.calculation_type === "percentage" ? "%" : " IDR"}
                                        </div>

                                        <p className="text-xs font-medium text-ink-muted">
                                            {discount.branch_id
                                                ? t("card.branchScope", { id: discount.branch_id })
                                                : t("card.companyWide")}
                                        </p>

                                        {discount.min_quantity && (
                                            <p className="text-xs font-medium text-ink-muted">
                                                {t("card.minQty", { value: discount.min_quantity })}
                                            </p>
                                        )}

                                        {configSummary && (
                                            <p className="text-xs font-medium text-ink-muted">
                                                {configSummary}
                                            </p>
                                        )}

                                        <div className="mt-1 border-t border-line pt-1.5 text-xs font-medium text-ink-faint">
                                            {t("card.validity", {
                                                from: discount.effective_from ?? t("card.immediate"),
                                                to: discount.effective_to ?? t("card.open"),
                                            })}
                                        </div>
                                    </Card>
                                )
                            })}

                            {discounts.length === 0 && (
                                <EmptyState compact icon="percent" title={t("discounts.empty")} />
                            )}
                        </div>
                    </Card>

                    {/* Rewards List */}
                    <Card padding="lg" className="flex flex-col gap-4">
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name="card_membership" className="text-brand-ink" />
                            <span>{t("rewards.heading", { count: rewards.length })}</span>
                        </h2>

                        <div className="grid max-h-150 gap-3 overflow-y-auto pe-1">
                            {rewards.map((reward) => (
                                <Card as="article" inset padding="sm" key={reward.id} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="truncate text-sm font-bold text-ink">{reward.name}</h3>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <StatusPill tone={reward.is_active ? "green" : "neutral"}>
                                                {reward.is_active ? t("card.active") : t("card.inactive")}
                                            </StatusPill>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={t("deleteRewardAria", { name: reward.name })}
                                                onClick={() => void handleDeleteReward(reward)}
                                            >
                                                <Icon name="delete" size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-1 text-xs font-semibold text-ink-secondary">
                                        {t("card.benefit")}{" "}
                                        <span className="text-brand-ink">{numberLabel(reward.value)}</span>
                                        {reward.calculation_type === "percentage" ? "%" : " IDR"}
                                    </div>

                                    <p className="text-xs font-medium text-ink-muted">
                                        {reward.branch_id
                                            ? t("card.branchScope", { id: reward.branch_id })
                                            : t("card.companyWide")}
                                    </p>

                                    {reward.min_quantity && (
                                        <p className="text-xs font-medium text-ink-muted">
                                            {t("card.minPurchaseQty", { value: reward.min_quantity })}
                                        </p>
                                    )}

                                    <div className="mt-1 border-t border-line pt-1.5 text-xs font-medium text-ink-faint">
                                        {t("card.validity", {
                                            from: reward.effective_from ?? t("card.immediate"),
                                            to: reward.effective_to ?? t("card.open"),
                                        })}
                                    </div>
                                </Card>
                            ))}

                            {rewards.length === 0 && (
                                <EmptyState compact icon="card_membership" title={t("rewards.empty")} />
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Side: Tabbed Create Form */}
                <Card padding="lg" className="flex flex-col gap-4 self-start">
                    <Tabs value={formTab} onValueChange={(value) => setFormTab(value as "discount" | "reward")}>
                        <TabList>
                            <Tab value="discount">{t("tabs.addDiscount")}</Tab>
                            <Tab value="reward">{t("tabs.addReward")}</Tab>
                        </TabList>

                        <TabPanel value="discount" className="pt-4">
                            {formTab === "discount" && (
                                <form onSubmit={handleCreateDiscount} className="grid gap-3.5">
                                    <Field
                                        label={t("form.campaignName")}
                                        value={discountForm.name}
                                        onChange={(event) =>
                                            setDiscountForm((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder={t("form.campaignNamePlaceholder")}
                                        required
                                    />

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SelectField
                                            label={t("form.calcType")}
                                            value={discountForm.calculation_type}
                                            onChange={(event) =>
                                                setDiscountForm((current) => ({
                                                    ...current,
                                                    calculation_type: event.target.value as "percentage" | "amount",
                                                }))
                                            }
                                            required
                                        >
                                            <option value="percentage">{t("form.percentage")}</option>
                                            <option value="amount">{t("form.amount")}</option>
                                        </SelectField>

                                        <Field
                                            label={t("form.value")}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={discountForm.value}
                                            onChange={(event) =>
                                                setDiscountForm((current) => ({ ...current, value: event.target.value }))
                                            }
                                            placeholder={discountForm.calculation_type === "percentage" ? "10" : "15000"}
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SearchableSelect
                                            label={t("form.branchScope")}
                                            value={discountForm.branch_id}
                                            onChange={(val) =>
                                                setDiscountForm((current) => ({ ...current, branch_id: String(val) }))
                                            }
                                            options={branches.map((branch) => ({
                                                value: branch.id,
                                                label: branch.name
                                            }))}
                                            placeholder={t("form.companyWidePlaceholder")}
                                        />

                                        <Field
                                            label={t("form.minQty")}
                                            type="number"
                                            min="1"
                                            value={discountForm.min_quantity}
                                            onChange={(event) =>
                                                setDiscountForm((current) => ({ ...current, min_quantity: event.target.value }))
                                            }
                                            placeholder={t("form.minQtyPlaceholderDiscount")}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-ink-secondary">{t("form.appliesTo")}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={t("form.addTarget")}
                                                onClick={() =>
                                                    setDiscountForm((current) => ({
                                                        ...current,
                                                        targets: [...current.targets, { target_type: "variant", target_id: "" }],
                                                    }))
                                                }
                                            >
                                                <Icon name="add" size={14} />
                                                <span>{t("form.add")}</span>
                                            </Button>
                                        </div>
                                        {discountForm.targets.map((target, index) => (
                                            <div key={index} className="grid grid-cols-[104px_1fr_auto] items-end gap-2">
                                                <SelectField
                                                    label={t("form.targetType", { index: index + 1 })}
                                                    hideLabel
                                                    value={target.target_type}
                                                    onChange={(event) =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            targets: current.targets.map((row, rowIndex) =>
                                                                rowIndex === index
                                                                    ? {
                                                                          target_type: event.target.value as DiscountTargetType,
                                                                          target_id: "",
                                                                      }
                                                                    : row
                                                            ),
                                                        }))
                                                    }
                                                >
                                                    <option value="variant">{t("form.targetTypes.variant")}</option>
                                                    <option value="product">{t("form.targetTypes.product")}</option>
                                                    <option value="category">{t("form.targetTypes.category")}</option>
                                                </SelectField>
                                                <SearchableSelect
                                                    label={t("form.target", { index: index + 1 })}
                                                    value={target.target_id}
                                                    onChange={(val) =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            targets: current.targets.map((row, rowIndex) =>
                                                                rowIndex === index ? { ...row, target_id: String(val) } : row
                                                            ),
                                                        }))
                                                    }
                                                    options={targetOptionsFor(target.target_type)}
                                                    placeholder={targetPlaceholderFor(target.target_type)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="mb-2"
                                                    aria-label={t("form.removeTarget", { index: index + 1 })}
                                                    onClick={() =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            targets: current.targets.filter((_, rowIndex) => rowIndex !== index),
                                                        }))
                                                    }
                                                >
                                                    <Icon name="close" size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-ink-secondary">{t("form.requires")}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={t("form.addDependency")}
                                                onClick={() =>
                                                    setDiscountForm((current) => ({
                                                        ...current,
                                                        dependencies: [
                                                            ...current.dependencies,
                                                            { product_variant_id: "", required_quantity: "1" },
                                                        ],
                                                    }))
                                                }
                                            >
                                                <Icon name="add" size={14} />
                                                <span>{t("form.add")}</span>
                                            </Button>
                                        </div>
                                        {discountForm.dependencies.map((dependency, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_88px_auto] items-end gap-2">
                                                <SearchableSelect
                                                    label={t("form.dependencyVariant", { index: index + 1 })}
                                                    value={dependency.product_variant_id}
                                                    onChange={(val) =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            dependencies: current.dependencies.map((row, rowIndex) =>
                                                                rowIndex === index
                                                                    ? { ...row, product_variant_id: String(val) }
                                                                    : row
                                                            ),
                                                        }))
                                                    }
                                                    options={variantOptions}
                                                    placeholder={t("form.selectVariant")}
                                                />
                                                <Field
                                                    label={t("form.requiredQuantity")}
                                                    hideLabel
                                                    type="number"
                                                    min="1"
                                                    required
                                                    value={dependency.required_quantity}
                                                    onChange={(event) =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            dependencies: current.dependencies.map((row, rowIndex) =>
                                                                rowIndex === index
                                                                    ? { ...row, required_quantity: event.target.value }
                                                                    : row
                                                            ),
                                                        }))
                                                    }
                                                    placeholder={t("form.qtyPlaceholder")}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="mb-2"
                                                    aria-label={t("form.removeDependency", { index: index + 1 })}
                                                    onClick={() =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            dependencies: current.dependencies.filter(
                                                                (_, rowIndex) => rowIndex !== index
                                                            ),
                                                        }))
                                                    }
                                                >
                                                    <Icon name="close" size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-ink-secondary">{t("form.giveaways")}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={t("form.addGiveaway")}
                                                onClick={() =>
                                                    setDiscountForm((current) => ({
                                                        ...current,
                                                        giveaways: [
                                                            ...current.giveaways,
                                                            { product_variant_id: "", giveaway_quantity: "1" },
                                                        ],
                                                    }))
                                                }
                                            >
                                                <Icon name="add" size={14} />
                                                <span>{t("form.add")}</span>
                                            </Button>
                                        </div>
                                        {discountForm.giveaways.map((giveaway, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_88px_auto] items-end gap-2">
                                                <SearchableSelect
                                                    label={t("form.giveawayVariant", { index: index + 1 })}
                                                    value={giveaway.product_variant_id}
                                                    onChange={(val) =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            giveaways: current.giveaways.map((row, rowIndex) =>
                                                                rowIndex === index
                                                                    ? { ...row, product_variant_id: String(val) }
                                                                    : row
                                                            ),
                                                        }))
                                                    }
                                                    options={variantOptions}
                                                    placeholder={t("form.selectVariant")}
                                                />
                                                <Field
                                                    label={t("form.giveawayQuantity")}
                                                    hideLabel
                                                    type="number"
                                                    min="1"
                                                    required
                                                    value={giveaway.giveaway_quantity}
                                                    onChange={(event) =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            giveaways: current.giveaways.map((row, rowIndex) =>
                                                                rowIndex === index
                                                                    ? { ...row, giveaway_quantity: event.target.value }
                                                                    : row
                                                            ),
                                                        }))
                                                    }
                                                    placeholder={t("form.qtyPlaceholder")}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="mb-2"
                                                    aria-label={t("form.removeGiveaway", { index: index + 1 })}
                                                    onClick={() =>
                                                        setDiscountForm((current) => ({
                                                            ...current,
                                                            giveaways: current.giveaways.filter(
                                                                (_, rowIndex) => rowIndex !== index
                                                            ),
                                                        }))
                                                    }
                                                >
                                                    <Icon name="close" size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <DatePicker
                                            label={t("form.effectiveFrom")}
                                            value={discountForm.effective_from}
                                            onChange={(val) =>
                                                setDiscountForm((current) => ({ ...current, effective_from: val }))
                                            }
                                            required
                                        />
                                        <DatePicker
                                            label={t("form.effectiveTo")}
                                            value={discountForm.effective_to}
                                            onChange={(val) =>
                                                setDiscountForm((current) => ({ ...current, effective_to: val }))
                                            }
                                            placeholder={t("form.optional")}
                                        />
                                    </div>

                                    <Button type="submit" size="xl" disabled={isLoading} className="mt-2 w-full">
                                        {t("form.submitDiscount")}
                                    </Button>
                                </form>
                            )}
                        </TabPanel>

                        <TabPanel value="reward" className="pt-4">
                            {formTab === "reward" && (
                                <form onSubmit={handleCreateReward} className="grid gap-3.5">
                                    <Field
                                        label={t("form.rewardName")}
                                        value={rewardForm.name}
                                        onChange={(event) =>
                                            setRewardForm((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder={t("form.rewardNamePlaceholder")}
                                        required
                                    />

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SelectField
                                            label={t("form.calcType")}
                                            value={rewardForm.calculation_type}
                                            onChange={(event) =>
                                                setRewardForm((current) => ({
                                                    ...current,
                                                    calculation_type: event.target.value as "percentage" | "amount",
                                                }))
                                            }
                                            required
                                        >
                                            <option value="percentage">{t("form.percentage")}</option>
                                            <option value="amount">{t("form.amount")}</option>
                                        </SelectField>

                                        <Field
                                            label={t("form.value")}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={rewardForm.value}
                                            onChange={(event) =>
                                                setRewardForm((current) => ({ ...current, value: event.target.value }))
                                            }
                                            placeholder={rewardForm.calculation_type === "percentage" ? "5" : "10000"}
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SearchableSelect
                                            label={t("form.branchScope")}
                                            value={rewardForm.branch_id}
                                            onChange={(val) =>
                                                setRewardForm((current) => ({ ...current, branch_id: String(val) }))
                                            }
                                            options={branches.map((branch) => ({
                                                value: branch.id,
                                                label: branch.name
                                            }))}
                                            placeholder={t("form.companyWidePlaceholder")}
                                        />

                                        <Field
                                            label={t("form.minQty")}
                                            type="number"
                                            min="1"
                                            value={rewardForm.min_quantity}
                                            onChange={(event) =>
                                                setRewardForm((current) => ({ ...current, min_quantity: event.target.value }))
                                            }
                                            placeholder={t("form.minQtyPlaceholderReward")}
                                        />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <DatePicker
                                            label={t("form.effectiveFrom")}
                                            value={rewardForm.effective_from}
                                            onChange={(val) =>
                                                setRewardForm((current) => ({ ...current, effective_from: val }))
                                            }
                                            required
                                        />
                                        <DatePicker
                                            label={t("form.effectiveTo")}
                                            value={rewardForm.effective_to}
                                            onChange={(val) =>
                                                setRewardForm((current) => ({ ...current, effective_to: val }))
                                            }
                                            placeholder={t("form.optional")}
                                        />
                                    </div>

                                    <Button type="submit" size="xl" disabled={isLoading} className="mt-2 w-full">
                                        {t("form.submitReward")}
                                    </Button>
                                </form>
                            )}
                        </TabPanel>
                    </Tabs>
                </Card>
            </div>
        </div>
    )
}
