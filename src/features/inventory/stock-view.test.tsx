import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import {
    StockAdjustmentView,
    StockIssueView,
    StockLotsView,
    StockMovementDetailView,
    StockMovementsView,
    StockOverviewView,
    StockReceiptView,
    StockTransferView,
} from "@/features/inventory/stock-view"
import { useSession } from "@/features/auth/session-provider"
import {
    getStockMovement,
    listProductUnits,
    loadStockLots,
    loadStockMovements,
    loadStockSnapshot,
    recordAdjustment,
    recordIssue,
    recordReceipt,
    recordTransfer,
} from "@/features/inventory/inventory-api"

const push = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}))

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@/features/inventory/inventory-api", () => ({
    getStockMovement: vi.fn(),
    listProductUnits: vi.fn(),
    loadStockLots: vi.fn(),
    loadStockMovements: vi.fn(),
    loadStockSnapshot: vi.fn(),
    recordReceipt: vi.fn(),
    recordIssue: vi.fn(),
    recordAdjustment: vi.fn(),
    recordTransfer: vi.fn(),
}))

const productUnit = {
    id: 8,
    company_id: 1,
    product_id: 4,
    sku: "SKL-NBR-25",
    barcode: null,
    name: "Nasi Box Regular 25 Pax",
    is_active: true,
    product: {
        id: 4,
        company_id: 1,
        category_id: null,
        brand_id: null,
        base_uom_id: 1,
        name: "Nasi Box Regular",
        description: null,
        track_stock: true,
        attributes: null,
        status: "active",
        variants: [],
    },
    variants: [],
}

describe("split stock movement views", () => {
    beforeEach(() => {
        push.mockReset()
        vi.mocked(toast.error).mockReset()
        vi.mocked(toast.success).mockReset()
        vi.mocked(recordReceipt).mockReset()
        vi.mocked(recordIssue).mockReset()
        vi.mocked(recordAdjustment).mockReset()
        vi.mocked(recordTransfer).mockReset()
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
        vi.mocked(listProductUnits).mockResolvedValue({
            data: { product_units: [productUnit], pagination: { total: 1 } },
            message: "OK",
        })
        vi.mocked(loadStockSnapshot).mockResolvedValue({
            lots: [],
            movements: [
                {
                    id: 12,
                    company_id: 1,
                    branch_id: 1,
                    product_variant_id: 5,
                    product_unit_id: 8,
                    product_unit: productUnit,
                    stock_lot_id: null,
                    type: "receipt",
                    quantity: "10.0000",
                    unit_cost: "1000.0000",
                    reference_type: null,
                    reference_id: null,
                    notes: null,
                    occurred_at: "2026-05-30T10:00:00+07:00",
                },
            ],
            movementTotal: 1,
            totalValue: "10000.0000",
            selectedOnHand: "10.0000",
        })
        vi.mocked(loadStockLots).mockResolvedValue([
            {
                id: 3,
                company_id: 1,
                branch_id: 1,
                product_variant_id: 5,
                product_unit_id: 8,
                product_unit: productUnit,
                lot_number: "LOT-1",
                received_quantity: "10.0000",
                remaining_quantity: "7.0000",
                unit_cost: "1000.0000",
                received_at: "2026-05-30",
                expiry_date: null,
                status: "active",
            },
        ])
        vi.mocked(loadStockMovements).mockResolvedValue({
            movements: [
                {
                    id: 12,
                    company_id: 1,
                    branch_id: 1,
                    product_variant_id: 5,
                    product_unit_id: 8,
                    product_unit: productUnit,
                    stock_lot_id: 3,
                    type: "receipt",
                    quantity: "10.0000",
                    unit_cost: "1000.0000",
                    reference_type: null,
                    reference_id: null,
                    notes: "Opening",
                    occurred_at: "2026-05-30T10:00:00+07:00",
                },
            ],
            total: 1,
        })
        vi.mocked(getStockMovement).mockResolvedValue({
            data: {
                movement: {
                    id: 12,
                    company_id: 1,
                    branch_id: 1,
                    product_variant_id: 5,
                    product_unit_id: 8,
                    product_unit: productUnit,
                    stock_lot_id: 3,
                    type: "receipt",
                    quantity: "10.0000",
                    unit_cost: "1000.0000",
                    reference_type: null,
                    reference_id: null,
                    notes: "Opening",
                    occurred_at: "2026-05-30T10:00:00+07:00",
                },
            },
            message: "OK",
        })
        vi.mocked(recordReceipt).mockResolvedValue({})
        vi.mocked(recordIssue).mockResolvedValue({})
        vi.mocked(recordAdjustment).mockResolvedValue({})
        vi.mocked(recordTransfer).mockResolvedValue({})
    })

    it("renders an overview with links into separated stock movement pages", async () => {
        render(<StockOverviewView />)

        await waitFor(() => expect(screen.getByText("Stock Overview")).toBeInTheDocument())

        expect(screen.getByRole("link", { name: /Stock Lots/i })).toHaveAttribute("href", "/inventory/stock/lots")
        expect(screen.getByRole("link", { name: /Movement Ledger/i })).toHaveAttribute("href", "/inventory/stock/movements")
        expect(screen.getByRole("link", { name: /New Receipt/i })).toHaveAttribute("href", "/inventory/stock/receipts/new")
    })

    it("renders lots and ledger pages with product unit context", async () => {
        render(<StockLotsView />)
        await waitFor(() => expect(screen.getByText("LOT-1")).toBeInTheDocument())
        expect(screen.getByText("SKL-NBR-25")).toBeInTheDocument()

        render(<StockMovementsView />)
        await waitFor(() => expect(screen.getByRole("link", { name: /Movement #12/i })).toHaveAttribute("href", "/inventory/stock/movements/12"))
    })

    it("renders movement detail as immutable audit information", async () => {
        render(<StockMovementDetailView movementId={12} />)

        await waitFor(() => expect(screen.getByText("Movement #12")).toBeInTheDocument())
        expect(screen.getByText("SKL-NBR-25")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    })

    it("records receipt issue adjustment and transfer with product units", async () => {
        render(<StockReceiptView />)
        await waitFor(() => expect(screen.getByLabelText("Quantity")).toBeInTheDocument())
        fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "10" } })
        fireEvent.change(screen.getByLabelText("Unit Cost (IDR)"), { target: { value: "1000" } })
        fireEvent.click(screen.getByRole("button", { name: "Record Receipt" }))
        await waitFor(() => expect(recordReceipt).toHaveBeenCalledWith(
            { token: "token", companyId: 1 },
            expect.objectContaining({ product_unit_id: 8, branch_id: 1, quantity: 10, unit_cost: 1000 }),
        ))
        expect(toast.success).toHaveBeenCalledWith("Stock receipt recorded successfully.")
        expect(push).toHaveBeenCalledWith("/inventory/stock")
        push.mockClear()
        vi.mocked(toast.success).mockClear()

        render(<StockIssueView />)
        await waitFor(() => expect(screen.getByLabelText("Issue quantity")).toBeInTheDocument())
        fireEvent.change(screen.getByLabelText("Issue quantity"), { target: { value: "2" } })
        fireEvent.click(screen.getByRole("button", { name: "Record Issue" }))
        await waitFor(() => expect(recordIssue).toHaveBeenCalledWith(
            { token: "token", companyId: 1 },
            expect.objectContaining({ product_unit_id: 8, branch_id: 1, quantity: 2 }),
        ))
        expect(toast.success).toHaveBeenCalledWith("Stock issue recorded successfully.")
        expect(push).toHaveBeenCalledWith("/inventory/stock")
        push.mockClear()
        vi.mocked(toast.success).mockClear()

        render(<StockAdjustmentView />)
        await waitFor(() => expect(screen.getByLabelText("Adjustment quantity")).toBeInTheDocument())
        fireEvent.change(screen.getByLabelText("Adjustment quantity"), { target: { value: "-1" } })
        fireEvent.click(screen.getByRole("button", { name: "Record Adjustment" }))
        await waitFor(() => expect(recordAdjustment).toHaveBeenCalledWith(
            { token: "token", companyId: 1 },
            expect.objectContaining({ product_unit_id: 8, branch_id: 1, quantity: -1 }),
        ))
        expect(toast.success).toHaveBeenCalledWith("Stock adjustment recorded successfully.")
        expect(push).toHaveBeenCalledWith("/inventory/stock")
        push.mockClear()
        vi.mocked(toast.success).mockClear()

        render(<StockTransferView />)
        await waitFor(() => expect(screen.getByLabelText("Transfer quantity")).toBeInTheDocument())
        fireEvent.change(screen.getByLabelText("Transfer quantity"), { target: { value: "1" } })
        fireEvent.click(screen.getByRole("button", { name: "Record Transfer" }))
        await waitFor(() => expect(recordTransfer).toHaveBeenCalledWith(
            { token: "token", companyId: 1 },
            expect.objectContaining({
                from_branch_id: 1,
                to_branch_id: 2,
                items: [{ product_unit_id: 8, quantity: 1 }],
            }),
        ))
        expect(toast.success).toHaveBeenCalledWith("Stock transfer recorded successfully.")
        expect(push).toHaveBeenCalledWith("/inventory/stock")
    })

    it("keeps stock action forms in place and shows an error when submission fails", async () => {
        vi.mocked(recordIssue).mockRejectedValueOnce(new Error("Insufficient stock"))

        render(<StockIssueView />)

        await waitFor(() => expect(screen.getByLabelText("Issue quantity")).toBeInTheDocument())
        fireEvent.change(screen.getByLabelText("Issue quantity"), { target: { value: "2" } })
        fireEvent.click(screen.getByRole("button", { name: "Record Issue" }))

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Insufficient stock"))
        expect(push).not.toHaveBeenCalled()
    })

    it("shows a user-facing error when stock context is missing", async () => {
        vi.mocked(useSession).mockReturnValue({
            token: null,
            activeCompanyId: null,
            organizationContext: {
                company: null,
                membership: null,
                branches: [],
            },
        } as ReturnType<typeof useSession>)

        render(<StockReceiptView />)

        fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "10" } })
        fireEvent.change(screen.getByLabelText("Unit Cost (IDR)"), { target: { value: "1000" } })
        fireEvent.click(screen.getByRole("button", { name: "Record Receipt" }))

        expect(recordReceipt).not.toHaveBeenCalled()
        expect(toast.error).toHaveBeenCalledWith("Select an active company, branch, and Product Unit before recording stock.")
        expect(push).not.toHaveBeenCalled()
    })
})
