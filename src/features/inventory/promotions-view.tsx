"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { StatusPill } from "@/components/ui/status-pill"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
import { InventoryPageHeader } from "@/features/inventory/inventory-layout"
import {
    createDiscount,
    createReward,
    loadInventory,
} from "@/features/inventory/inventory-api"
import type {
    Discount,
    Reward,
} from "@/features/inventory/inventory-types"

function numberLabel(value: string | number | null | undefined): string {
    const numeric = Number(value ?? 0)
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 4,
    }).format(Number.isFinite(numeric) ? numeric : 0)
}

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

export function PromotionsView() {
    const { token, activeCompanyId, organizationContext } = useSession()
    const [discounts, setDiscounts] = useState<Discount[]>([])
    const [rewards, setRewards] = useState<Reward[]>([])
    const [formTab, setFormTab] = useState<"discount" | "reward">("discount")

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

    const refreshData = useCallback(async () => {
        if (!requestOptions) return

        setIsLoading(true)

        try {
            const loaded = await loadInventory(requestOptions)
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
            })
            await refreshData()
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Failed to create discount.")
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
                            {discounts.map((discount) => (
                                <article key={discount.id} className="rounded-xl border border-navy-100 bg-navy-50/10 p-4 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-bold text-navy-900 truncate">{discount.name}</h3>
                                        <StatusPill tone={discount.is_active ? "green" : "neutral"}>
                                            {discount.is_active ? "Active" : "Inactive"}
                                        </StatusPill>
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

                                    <div className="text-[10px] text-navy-400 font-medium border-t border-navy-100/50 pt-1.5 mt-1">
                                        Validity: {discount.effective_from ?? "Immediate"} to {discount.effective_to ?? "Open"}
                                    </div>
                                </article>
                            ))}

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
                                        <StatusPill tone={reward.is_active ? "green" : "neutral"}>
                                            {reward.is_active ? "Active" : "Inactive"}
                                        </StatusPill>
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
