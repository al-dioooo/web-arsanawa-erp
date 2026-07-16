import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PricingView } from "@/features/inventory/pricing-view"
import { useSession } from "@/features/auth/session-provider"
import {
    listPriceListPrices,
    loadInventory,
} from "@/features/inventory/inventory-api"

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@/features/inventory/inventory-api", () => ({
    createPriceList: vi.fn(),
    listPriceListPrices: vi.fn(),
    loadInventory: vi.fn(),
    setPrice: vi.fn(),
}))

const inventory = {
    categories: [],
    brands: [],
    units: [],
    products: [
        {
            id: 4,
            company_id: 1,
            category_id: null,
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
    priceLists: [
        {
            id: 5,
            company_id: 1,
            name: "Retail",
            currency_id: null,
            branch_id: null,
            is_default: true,
            is_active: true,
        },
    ],
    discounts: [],
    rewards: [],
} as Awaited<ReturnType<typeof loadInventory>>

function mockSession() {
    vi.mocked(useSession).mockReturnValue({
        token: "token",
        activeCompanyId: 1,
        organizationContext: { company: null, membership: null, branches: [] },
    } as unknown as ReturnType<typeof useSession>)
}

describe("PricingView read-back", () => {
    it("shows each variant's currently effective price", async () => {
        mockSession()
        vi.mocked(loadInventory).mockResolvedValue(inventory)
        vi.mocked(listPriceListPrices).mockResolvedValue({
            data: {
                prices: [
                    {
                        id: 1,
                        price_list_id: 5,
                        product_variant_id: 100,
                        product_unit_id: null,
                        price: "25000.0000",
                        maximum_retail_price: null,
                        effective_from: "2026-01-01",
                        effective_to: null,
                    },
                ],
            },
            message: "OK",
        })

        render(<PricingView />)

        await waitFor(() =>
            expect(listPriceListPrices).toHaveBeenCalledWith({ token: "token", companyId: 1 }, 5),
        )

        expect(await screen.findByText(/25\.000/)).toBeInTheDocument()
        expect(screen.getByText("Not priced")).toBeInTheDocument()
        expect(screen.getByText("2026-01-01")).toBeInTheDocument()
    })

    it("surfaces a price load failure with a retry", async () => {
        mockSession()
        vi.mocked(loadInventory).mockResolvedValue(inventory)
        vi.mocked(listPriceListPrices).mockRejectedValueOnce(new Error("Prices unavailable."))
        vi.mocked(listPriceListPrices).mockResolvedValue({ data: { prices: [] }, message: "OK" })

        render(<PricingView />)

        expect(await screen.findByText("Prices unavailable.")).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: /retry/i }))

        await waitFor(() =>
            expect(screen.queryByText("Prices unavailable.")).not.toBeInTheDocument(),
        )
    })
})
