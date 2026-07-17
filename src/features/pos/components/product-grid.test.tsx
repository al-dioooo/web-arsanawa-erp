import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { ProductGrid } from "@/features/pos/components/product-grid"

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}))
import type { Category, InventoryProduct } from "@/features/inventory/inventory-types"

const categories: Category[] = [
    {
        id: 1,
        company_id: 1,
        parent_id: null,
        name: "Food",
        path: "Food",
        depth: 0,
        position: 1,
        is_active: true,
    },
]

const products: InventoryProduct[] = [
    {
        id: 10,
        company_id: 1,
        category_id: 1,
        brand_id: null,
        base_uom_id: 1,
        name: "Rice Bowl",
        description: null,
        track_stock: true,
        attributes: null,
        status: "active",
        variants: [
            {
                id: 99,
                product_id: 10,
                company_id: 1,
                sku: "RICE-01",
                barcode: null,
                name: "Regular",
                attributes: null,
                purchase_uom_id: null,
                purchase_conversion_factor: "1.0000",
                is_active: true,
            },
        ],
    },
]

describe("ProductGrid", () => {
    it("disables products without a resolved price", () => {
        const onAdd = vi.fn()
        render(
            <ProductGrid
                products={products}
                categories={categories}
                priceMap={{ "10:99": null }}
                onAdd={onAdd}
            />,
        )

        const tile = screen.getByRole("button", { name: /Rice Bowl/i })
        expect(screen.getByText("noPrice")).toBeInTheDocument()
        expect(tile).toBeDisabled()

        fireEvent.click(tile)
        expect(onAdd).not.toHaveBeenCalled()
    })
})
