"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { StatusPill } from "@/components/ui/status-pill"
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

type DiscountTargetType = "variant" | "product" | "category"

type DiscountTargetRow = { target_type: DiscountTargetType; target_id: string }
type DiscountDependencyRow = { product_variant_id: string; required_quantity: string }
type DiscountGiveawayRow = { product_variant_id: string; giveaway_quantity: string }

/** Compact "2 targets · 1 giveaway" summary for a discount card, or null. */
function discountConfigSummary(discount: Discount): string | null {
    const parts: string[] = []
    if (discount.targets?.length) {
        parts.push(`${discount.targets.length} ${discount.targets.length === 1 ? "target" : "targets"}`)
    }
    if (discount.dependencies?.length) {
        parts.push(`${discount.dependencies.length} ${discount.dependencies.length === 1 ? "dependency" : "dependencies"}`)
    }
    if (discount.giveaways?.length) {
        parts.push(`${discount.giveaways.length} ${discount.giveaways.length === 1 ? "giveaway" : "giveaways"}`)
    }
    return parts.length > 0 ? parts.join(" · ") : null
}

export function PromotionsView() {
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
            toast.error(caught instanceof Error ? caught.message : "Unable to load promotions.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions])

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

        setIsLoading(true)

        // Rows with no selection are treated as drafts and left out of the payload.
        const targets = discountForm.targets
            .filter((target) => target.target_id !== "")
            .map((target) => ({
                target_type: target.target_type,
                target_id: Number(target.target_id),
            }))
        const dependencies = discountForm.dependencies
            .filter((dependency) => dependency.product_variant_id !== "")
            .map((dependency) => ({
                product_variant_id: Number(dependency.product_variant_id),
                required_quantity: Number(dependency.required_quantity),
            }))
        const giveaways = discountForm.giveaways
            .filter((giveaway) => giveaway.product_variant_id !== "")
            .map((giveaway) => ({
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
            toast.success("Discount campaign created successfully.")
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
            toast.error(caught instanceof Error ? caught.message : "Failed to create discount.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDeleteDiscount(discount: Discount) {
        if (!requestOptions) return

        const ok = await confirm({
            title: `Delete “${discount.name}”?`,
            message: "This permanently removes the campaign and its product targets. This can't be undone.",
            confirmLabel: "Delete",
            danger: true,
        })
        if (!ok) return

        setIsLoading(true)

        try {
            await deleteDiscount(requestOptions, discount.id)
            toast.success("Discount deleted.")
            await refreshData()
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Failed to delete discount.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDeleteReward(reward: Reward) {
        if (!requestOptions) return

        const ok = await confirm({
            title: `Delete “${reward.name}”?`,
            message: "This permanently removes the loyalty reward. This can't be undone.",
            confirmLabel: "Delete",
            danger: true,
        })
        if (!ok) return

        setIsLoading(true)

        try {
            await deleteReward(requestOptions, reward.id)
            toast.success("Reward deleted.")
            await refreshData()
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Failed to delete reward.")
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
            toast.success("Loyalty reward created successfully.")
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
            toast.error(caught instanceof Error ? caught.message : "Failed to create reward.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-6">
            {confirmDialog}
            <InventoryPageHeader
                title="Promotions & Rewards"
                description="Manage discount campaigns, product bundle promotions, and customer loyalty rewards."
                isCompanyScoped={Boolean(activeCompanyId)}
            />

            {/* Main Grid Layout */}
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                {/* Left Side: Side-by-side lists */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Discounts List */}
                    <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-3">
                            <Icon name="percent" className="text-teal-700" />
                            <span>Discount Campaigns ({discounts.length})</span>
                        </h2>

                        <div className="grid gap-3 overflow-y-auto max-h-[600px] pr-1">
                            {discounts.map((discount) => {
                                const configSummary = discountConfigSummary(discount)
                                return (
                                <article key={discount.id} className="rounded-xl border border-navy-100 bg-navy-50/10 p-4 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-bold text-navy-900 truncate">{discount.name}</h3>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <StatusPill tone={discount.is_active ? "green" : "neutral"}>
                                                {discount.is_active ? "Active" : "Inactive"}
                                            </StatusPill>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Delete discount ${discount.name}`}
                                                onClick={() => void handleDeleteDiscount(discount)}
                                            >
                                                <Icon name="delete" size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="text-xs text-navy-600 font-semibold mt-1">
                                        Value: <span className="text-teal-700">{numberLabel(discount.value)}</span>
                                        {discount.calculation_type === "percentage" ? "%" : " IDR"}
                                    </div>

                                    <p className="text-[10px] text-navy-450 font-medium">
                                        Scope: {discount.branch_id ? `Branch ID: ${discount.branch_id}` : "Company-wide"}
                                    </p>

                                    {discount.min_quantity && (
                                        <p className="text-[10px] text-navy-450 font-medium">
                                            Min Qty: {discount.min_quantity}
                                        </p>
                                    )}

                                    {configSummary && (
                                        <p className="text-[10px] text-navy-450 font-medium">
                                            {configSummary}
                                        </p>
                                    )}

                                    <div className="text-[10px] text-navy-400 font-medium border-t border-navy-100/50 pt-1.5 mt-1">
                                        Validity: {discount.effective_from ?? "Immediate"} to {discount.effective_to ?? "Open"}
                                    </div>
                                </article>
                                )
                            })}

                            {discounts.length === 0 && (
                                <div className="rounded-xl border border-dashed border-navy-200 bg-navy-50/20 p-6 text-center text-xs font-semibold text-navy-450">
                                    No active discounts found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rewards List */}
                    <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-3">
                            <Icon name="card_membership" className="text-teal-700" />
                            <span>Loyalty Rewards ({rewards.length})</span>
                        </h2>

                        <div className="grid gap-3 overflow-y-auto max-h-[600px] pr-1">
                            {rewards.map((reward) => (
                                <article key={reward.id} className="rounded-xl border border-navy-100 bg-navy-50/10 p-4 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-bold text-navy-900 truncate">{reward.name}</h3>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <StatusPill tone={reward.is_active ? "green" : "neutral"}>
                                                {reward.is_active ? "Active" : "Inactive"}
                                            </StatusPill>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Delete reward ${reward.name}`}
                                                onClick={() => void handleDeleteReward(reward)}
                                            >
                                                <Icon name="delete" size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="text-xs text-navy-600 font-semibold mt-1">
                                        Benefit: <span className="text-teal-700">{numberLabel(reward.value)}</span>
                                        {reward.calculation_type === "percentage" ? "%" : " IDR"}
                                    </div>

                                    <p className="text-[10px] text-navy-450 font-medium">
                                        Scope: {reward.branch_id ? `Branch ID: ${reward.branch_id}` : "Company-wide"}
                                    </p>

                                    {reward.min_quantity && (
                                        <p className="text-[10px] text-navy-450 font-medium">
                                            Min Purchase Qty: {reward.min_quantity}
                                        </p>
                                    )}

                                    <div className="text-[10px] text-navy-400 font-medium border-t border-navy-100/50 pt-1.5 mt-1">
                                        Validity: {reward.effective_from ?? "Immediate"} to {reward.effective_to ?? "Open"}
                                    </div>
                                </article>
                            ))}

                            {rewards.length === 0 && (
                                <div className="rounded-xl border border-dashed border-navy-200 bg-navy-50/20 p-6 text-center text-xs font-semibold text-navy-450">
                                    No active rewards found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Tabbed Create Form */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col gap-4 self-start">
                    <div className="flex border-b border-navy-50">
                        <button
                            onClick={() => setFormTab("discount")}
                            className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 cursor-pointer transition-colors ${ formTab === "discount" ? "border-teal-700 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-950" }`}
                        >
                            Add Discount
                        </button>
                        <button
                            onClick={() => setFormTab("reward")}
                            className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 cursor-pointer transition-colors ${ formTab === "reward" ? "border-teal-700 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-950" }`}
                        >
                            Add Reward
                        </button>
                    </div>

                    {formTab === "discount" ? (
                        <form onSubmit={handleCreateDiscount} className="grid gap-3.5">
                            <Field
                                label="Campaign Name"
                                value={discountForm.name}
                                onChange={(event) =>
                                    setDiscountForm((current) => ({ ...current, name: event.target.value }))
                                }
                                placeholder="e.g. End Year Mega Sale"
                                required
                            />

                            <div className="grid gap-3 sm:grid-cols-2">
                                <SelectField
                                    label="Calc Type"
                                    value={discountForm.calculation_type}
                                    onChange={(event) =>
                                        setDiscountForm((current) => ({
                                            ...current,
                                            calculation_type: event.target.value as "percentage" | "amount",
                                        }))
                                    }
                                    required
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="amount">Fixed Amount (IDR)</option>
                                </SelectField>

                                <Field
                                    label="Value"
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
                                    label="Branch scope"
                                    value={discountForm.branch_id}
                                    onChange={(val) =>
                                        setDiscountForm((current) => ({ ...current, branch_id: String(val) }))
                                    }
                                    options={branches.map((branch) => ({
                                        value: branch.id,
                                        label: branch.name
                                    }))}
                                    placeholder="Company-wide"
                                />

                                <Field
                                    label="Min Qty Requirement"
                                    type="number"
                                    min="1"
                                    value={discountForm.min_quantity}
                                    onChange={(event) =>
                                        setDiscountForm((current) => ({ ...current, min_quantity: event.target.value }))
                                    }
                                    placeholder="e.g. 5 (Optional)"
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-navy-700">Applies to</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-label="Add target"
                                        onClick={() =>
                                            setDiscountForm((current) => ({
                                                ...current,
                                                targets: [...current.targets, { target_type: "variant", target_id: "" }],
                                            }))
                                        }
                                    >
                                        <Icon name="add" size={14} />
                                        <span>Add</span>
                                    </Button>
                                </div>
                                {discountForm.targets.map((target, index) => (
                                    <div key={index} className="grid grid-cols-[104px_1fr_auto] items-end gap-2">
                                        <SelectField
                                            label={`Target ${index + 1} type`}
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
                                            <option value="variant">Variant</option>
                                            <option value="product">Product</option>
                                            <option value="category">Category</option>
                                        </SelectField>
                                        <SearchableSelect
                                            label={`Target ${index + 1}`}
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
                                            placeholder={`Select ${target.target_type}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="mb-2"
                                            aria-label={`Remove target ${index + 1}`}
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
                                    <span className="text-xs font-bold text-navy-700">Requires (buy-X)</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-label="Add dependency"
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
                                        <span>Add</span>
                                    </Button>
                                </div>
                                {discountForm.dependencies.map((dependency, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_88px_auto] items-end gap-2">
                                        <SearchableSelect
                                            label={`Dependency ${index + 1} variant`}
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
                                            placeholder="Select variant"
                                        />
                                        <Field
                                            label="Required quantity"
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
                                            placeholder="Qty"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="mb-2"
                                            aria-label={`Remove dependency ${index + 1}`}
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
                                    <span className="text-xs font-bold text-navy-700">Giveaways (get-Y)</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-label="Add giveaway"
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
                                        <span>Add</span>
                                    </Button>
                                </div>
                                {discountForm.giveaways.map((giveaway, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_88px_auto] items-end gap-2">
                                        <SearchableSelect
                                            label={`Giveaway ${index + 1} variant`}
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
                                            placeholder="Select variant"
                                        />
                                        <Field
                                            label="Giveaway quantity"
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
                                            placeholder="Qty"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="mb-2"
                                            aria-label={`Remove giveaway ${index + 1}`}
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
                                    label="Effective From"
                                    value={discountForm.effective_from}
                                    onChange={(val) =>
                                        setDiscountForm((current) => ({ ...current, effective_from: val }))
                                    }
                                    required
                                />
                                <DatePicker
                                    label="Effective To"
                                    value={discountForm.effective_to}
                                    onChange={(val) =>
                                        setDiscountForm((current) => ({ ...current, effective_to: val }))
                                    }
                                    placeholder="Optional"
                                />
                            </div>

                            <Button
                                type="submit"
                                size="xl"
                                disabled={isLoading}
                                className="w-full cursor-pointer bg-teal-700 hover:bg-teal-800 text-white mt-2"
                            >
                                Create Discount
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleCreateReward} className="grid gap-3.5">
                            <Field
                                label="Reward Name"
                                value={rewardForm.name}
                                onChange={(event) =>
                                    setRewardForm((current) => ({ ...current, name: event.target.value }))
                                }
                                placeholder="e.g. Premium Member Reward"
                                required
                            />

                            <div className="grid gap-3 sm:grid-cols-2">
                                <SelectField
                                    label="Calc Type"
                                    value={rewardForm.calculation_type}
                                    onChange={(event) =>
                                        setRewardForm((current) => ({
                                            ...current,
                                            calculation_type: event.target.value as "percentage" | "amount",
                                        }))
                                    }
                                    required
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="amount">Fixed Amount (IDR)</option>
                                </SelectField>

                                <Field
                                    label="Value"
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
                                    label="Branch scope"
                                    value={rewardForm.branch_id}
                                    onChange={(val) =>
                                        setRewardForm((current) => ({ ...current, branch_id: String(val) }))
                                    }
                                    options={branches.map((branch) => ({
                                        value: branch.id,
                                        label: branch.name
                                    }))}
                                    placeholder="Company-wide"
                                />

                                <Field
                                    label="Min Qty Requirement"
                                    type="number"
                                    min="1"
                                    value={rewardForm.min_quantity}
                                    onChange={(event) =>
                                        setRewardForm((current) => ({ ...current, min_quantity: event.target.value }))
                                    }
                                    placeholder="e.g. 2 (Optional)"
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <DatePicker
                                    label="Effective From"
                                    value={rewardForm.effective_from}
                                    onChange={(val) =>
                                        setRewardForm((current) => ({ ...current, effective_from: val }))
                                    }
                                    required
                                />
                                <DatePicker
                                    label="Effective To"
                                    value={rewardForm.effective_to}
                                    onChange={(val) =>
                                        setRewardForm((current) => ({ ...current, effective_to: val }))
                                    }
                                    placeholder="Optional"
                                />
                            </div>

                            <Button
                                type="submit"
                                size="xl"
                                disabled={isLoading}
                                className="w-full cursor-pointer bg-teal-700 hover:bg-teal-800 text-white mt-2"
                            >
                                Create Reward
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
