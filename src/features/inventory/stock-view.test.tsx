import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StockView } from "@/features/inventory/stock-view"
import { useSession } from "@/features/auth/session-provider"
import {
    loadInventory,
    loadStockSnapshot,
    recordAdjustment,
    recordIssue,
    recordReceipt,
    recordTransfer,
} from "@/features/inventory/inventory-api"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@/features/inventory/inventory-api", () => ({
    loadInventory: vi.fn(),
    loadStockSnapshot: vi.fn(),
    recordReceipt: vi.fn(),
    recordIssue: vi.fn(),
    recordAdjustment: vi.fn(),
    recordTransfer: vi.fn(),
}))

describe("StockView", () => {
    beforeEach(() => {
        vi.mocked(useSession).mockReturnValue({
            token: "token",
            activeCompanyId: 1,
            organizationContext: {
                company: null,
                membership: null,
                branches: [
                    { id: 1, company_id: 1, name: "Main", code: "MAIN", is_primary: true, status: "active" },
                    { id: 2, company_id: 1, name: "Outlet", code: "OUT", is_primary: false, status: "active" },
                ],
            },
        } as ReturnType<typeof useSession>)
        vi.mocked(loadInventory).mockResolvedValue({
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
                    name: "Rice Crackers",
                    description: null,
                    track_stock: true,
                    attributes: null,
                    status: "active",
                    variants: [
                        {
                            id: 5,
                            product_id: 4,
                            company_id: 1,
                            sku: "SKU-1",
                            barcode: null,
                            name: "Original",
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
            discounts: [],
            rewards: [],
        })
        vi.mocked(loadStockSnapshot).mockResolvedValue({
            lots: [],
            movements: [],
            movementTotal: 0,
            totalValue: "0.0000",
            selectedOnHand: "0.0000",
        })
        vi.mocked(recordReceipt).mockResolvedValue({})
        vi.mocked(recordIssue).mockResolvedValue({})
        vi.mocked(recordAdjustment).mockResolvedValue({})
        vi.mocked(recordTransfer).mockResolvedValue({})
    })

    it("records receipt, issue, adjustment, and transfer movements", async () => {
        render(<StockView />)

        await waitFor(() => expect(screen.getByLabelText("Issue quantity")).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText("Issue quantity"), { target: { value: "2" } })
        fireEvent.click(screen.getByRole("button", { name: "Record issue" }))
        await waitFor(() => expect(recordIssue).toHaveBeenCalledWith(
            { token: "token", companyId: 1 },
            expect.objectContaining({ branch_id: 1, product_variant_id: 5, quantity: 2 }),
        ))

        fireEvent.change(screen.getByLabelText("Adjustment quantity"), { target: { value: "-1" } })
        fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }))
        await waitFor(() => expect(recordAdjustment).toHaveBeenCalledWith(
            { token: "token", companyId: 1 },
            expect.objectContaining({ branch_id: 1, product_variant_id: 5, quantity: -1 }),
        ))

        fireEvent.change(screen.getByLabelText("Transfer quantity"), { target: { value: "1" } })
        fireEvent.click(screen.getByRole("button", { name: "Record transfer" }))
        await waitFor(() => expect(recordTransfer).toHaveBeenCalledWith(
            { token: "token", companyId: 1 },
            expect.objectContaining({
                from_branch_id: 1,
                to_branch_id: 2,
                items: [{ product_variant_id: 5, quantity: 1 }],
            }),
        ))
    })
})
