import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PromotionsView } from "@/features/inventory/promotions-view"
import { useSession } from "@/features/auth/session-provider"
import {
    createDiscount,
    deleteDiscount,
    loadInventory,
} from "@/features/inventory/inventory-api"

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}))

// Dictionary-backed next-intl mock: keeps assertions readable and returns a
// stable translator per namespace so effects keyed on t-derived strings
// don't re-run every render.
vi.mock("next-intl", () => {
    const labels: Record<string, string> = {
        "inventory.promotions.title": "Promotions & Rewards",
        "inventory.promotions.summary.target": "{count} target",
        "inventory.promotions.summary.targets": "{count} targets",
        "inventory.promotions.summary.dependency": "{count} dependency",
        "inventory.promotions.summary.dependencies": "{count} dependencies",
        "inventory.promotions.summary.giveaway": "{count} giveaway",
        "inventory.promotions.summary.giveaways": "{count} giveaways",
        "inventory.promotions.deleteDiscountAria": "Delete discount {name}",
        "inventory.promotions.deleteRewardAria": "Delete reward {name}",
        "inventory.promotions.tabs.addDiscount": "Add Discount",
        "inventory.promotions.tabs.addReward": "Add Reward",
        "inventory.promotions.form.campaignName": "Campaign Name",
        "inventory.promotions.form.value": "Value",
        "inventory.promotions.form.addTarget": "Add target",
        "inventory.promotions.form.targetType": "Target {index} type",
        "inventory.promotions.form.target": "Target {index}",
        "inventory.promotions.form.addDependency": "Add dependency",
        "inventory.promotions.form.addGiveaway": "Add giveaway",
        "inventory.promotions.form.giveawayVariant": "Giveaway {index} variant",
        "inventory.promotions.form.giveawayQuantity": "Giveaway quantity",
        "inventory.promotions.form.submitDiscount": "Create Discount",
        "inventory.promotions.form.submitReward": "Create Reward",
        "common.delete": "Delete",
        "common.cancel": "Cancel",
    }
    const cache = new Map<string | undefined, (key: string, values?: Record<string, string | number>) => string>()
    return {
        useTranslations: (namespace?: string) => {
            if (!cache.has(namespace)) {
                cache.set(namespace, (key: string, values?: Record<string, string | number>) => {
                    const fullKey = namespace ? `${namespace}.${key}` : key
                    const template = labels[fullKey] ?? fullKey
                    return template.replace(/\{(\w+)\}/g, (_, token: string) => String(values?.[token] ?? ""))
                })
            }
            return cache.get(namespace)!
        },
    }
})

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@/features/inventory/inventory-api", () => ({
    createDiscount: vi.fn(),
    createReward: vi.fn(),
    deleteDiscount: vi.fn(),
    deleteReward: vi.fn(),
    loadInventory: vi.fn(),
}))

const inventory = {
    categories: [
        {
            id: 9,
            company_id: 1,
            parent_id: null,
            name: "Beverage",
            path: "/9/",
            depth: 0,
            position: 0,
            is_active: true,
        },
    ],
    brands: [],
    units: [],
    products: [
        {
            id: 4,
            company_id: 1,
            category_id: 9,
            brand_id: null,
            base_uom_id: 1,
            name: "Kopi Susu",
            description: null,
            track_stock: true,
            attributes: null,
            status: "active",
            variants: [
                {
                    id: 100,
                    product_id: 4,
                    company_id: 1,
                    sku: "KS-REG",
                    barcode: null,
                    name: "Regular",
                    attributes: null,
                    purchase_uom_id: null,
                    purchase_conversion_factor: "1.0000",
                    is_active: true,
                },
                {
                    id: 101,
                    product_id: 4,
                    company_id: 1,
                    sku: "KS-LRG",
                    barcode: null,
                    name: "Large",
                    attributes: null,
                    purchase_uom_id: null,
                    purchase_conversion_factor: "1.0000",
                    is_active: true,
                },
            ],
        },
    ],
    productTotal: 1,
    priceLists: [],
    discounts: [
        {
            id: 11,
            company_id: 1,
            branch_id: null,
            name: "Bundle Blast",
            calculation_type: "percentage",
            value: "10.0000",
            min_quantity: null,
            starting_item_number: null,
            multiply: false,
            effective_from: "2026-01-01",
            effective_to: null,
            is_active: true,
            targets: [
                { target_type: "product", target_id: 4 },
                { target_type: "category", target_id: 9 },
            ],
            giveaways: [{ product_variant_id: 100, giveaway_quantity: 1 }],
        },
    ],
    rewards: [
        {
            id: 21,
            company_id: 1,
            branch_id: null,
            name: "Member Perk",
            calculation_type: "amount",
            value: "5000.0000",
            min_quantity: null,
            effective_from: "2026-01-01",
            effective_to: null,
            is_active: true,
        },
    ],
} as Awaited<ReturnType<typeof loadInventory>>

function mockSession() {
    vi.mocked(useSession).mockReturnValue({
        token: "token",
        activeCompanyId: 1,
        organizationContext: {
            company: null,
            membership: null,
            branches: [
                { id: 1, company_id: 1, name: "Main", code: "MAIN", is_primary: true, status: "active" },
            ],
        },
    } as unknown as ReturnType<typeof useSession>)
}

describe("PromotionsView", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSession()
        vi.mocked(loadInventory).mockResolvedValue(inventory)
    })

    it("renders discount and reward cards with the advanced config badge", async () => {
        render(<PromotionsView />)

        expect(await screen.findByText("Bundle Blast")).toBeInTheDocument()
        expect(screen.getByText("Member Perk")).toBeInTheDocument()
        expect(screen.getByText("2 targets · 1 giveaway")).toBeInTheDocument()
    })

    it("creates a discount with a target and a giveaway", async () => {
        vi.mocked(createDiscount).mockResolvedValue({ data: {}, message: "OK" } as Awaited<
            ReturnType<typeof createDiscount>
        >)

        render(<PromotionsView />)

        await waitFor(() => expect(loadInventory).toHaveBeenCalled())

        fireEvent.change(screen.getByLabelText("Campaign Name"), {
            target: { value: "Big Promo" },
        })
        fireEvent.change(screen.getByLabelText("Value"), { target: { value: "15" } })

        fireEvent.click(screen.getByRole("button", { name: "Add target" }))
        fireEvent.change(screen.getByLabelText("Target 1 type"), {
            target: { value: "product" },
        })
        fireEvent.focus(screen.getByLabelText("Target 1"))
        fireEvent.click(screen.getByRole("option", { name: "Kopi Susu" }))

        fireEvent.click(screen.getByRole("button", { name: "Add giveaway" }))
        fireEvent.focus(screen.getByLabelText("Giveaway 1 variant"))
        fireEvent.click(screen.getByRole("option", { name: "Kopi Susu (KS-REG)" }))
        fireEvent.change(screen.getByLabelText("Giveaway quantity"), {
            target: { value: "2" },
        })

        fireEvent.click(screen.getByRole("button", { name: "Create Discount" }))

        await waitFor(() =>
            expect(createDiscount).toHaveBeenCalledWith(
                { token: "token", companyId: 1 },
                expect.objectContaining({
                    name: "Big Promo",
                    value: 15,
                    targets: [{ target_type: "product", target_id: 4 }],
                    giveaways: [{ product_variant_id: 100, giveaway_quantity: 2 }],
                }),
            ),
        )
        expect(vi.mocked(createDiscount).mock.calls[0][1]).not.toHaveProperty("dependencies")
    })

    it("deletes a discount only after confirmation", async () => {
        vi.mocked(deleteDiscount).mockResolvedValue({ data: {}, message: "OK" } as Awaited<
            ReturnType<typeof deleteDiscount>
        >)

        render(<PromotionsView />)

        fireEvent.click(await screen.findByRole("button", { name: "Delete discount Bundle Blast" }))

        const dialog = await screen.findByRole("dialog")
        fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

        await waitFor(() =>
            expect(deleteDiscount).toHaveBeenCalledWith({ token: "token", companyId: 1 }, 11),
        )
        await waitFor(() => expect(loadInventory).toHaveBeenCalledTimes(2))
    })

    it("keeps the discount when the confirm dialog is cancelled", async () => {
        render(<PromotionsView />)

        fireEvent.click(await screen.findByRole("button", { name: "Delete discount Bundle Blast" }))

        const dialog = await screen.findByRole("dialog")
        fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(deleteDiscount).not.toHaveBeenCalled()
        expect(screen.getByText("Bundle Blast")).toBeInTheDocument()
    })
})
