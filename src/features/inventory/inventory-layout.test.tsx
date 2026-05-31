import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import CataloguePage from "@/app/(app)/inventory/catalogue/page"
import { InventoryDashboardView } from "@/features/inventory/inventory-dashboard-view"
import { CatalogueView } from "@/features/inventory/catalogue-view"
import { InventoryMasterDataView } from "@/features/inventory/master-data-view"
import { PricingView } from "@/features/inventory/pricing-view"
import { PromotionsView } from "@/features/inventory/promotions-view"
import { StockOverviewView, StockReceiptView } from "@/features/inventory/stock-view"
import { useSession } from "@/features/auth/session-provider"
import {
    listProductUnits,
    listVariantGroups,
    listVariantMasters,
    loadInventory,
    loadInventoryDashboardSummary,
    loadStockSnapshot,
    inspectProductImport,
    previewProductImport,
    downloadProductImportTemplate,
} from "@/features/inventory/inventory-api"

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@/features/inventory/inventory-api", () => ({
    createBrand: vi.fn(),
    createCategory: vi.fn(),
    createDiscount: vi.fn(),
    createPriceList: vi.fn(),
    createProduct: vi.fn(),
    createProductUnit: vi.fn(),
    createReward: vi.fn(),
    createUnit: vi.fn(),
    createVariantGroup: vi.fn(),
    createVariantMaster: vi.fn(),
    deleteBrand: vi.fn(),
    deleteCategory: vi.fn(),
    deleteProduct: vi.fn(),
    deleteProductUnit: vi.fn(),
    deleteUnit: vi.fn(),
    deleteVariantGroup: vi.fn(),
    deleteVariantMaster: vi.fn(),
    getStockMovement: vi.fn(),
    commitProductImport: vi.fn(),
    downloadProductImportTemplate: vi.fn(),
    getProductImport: vi.fn(),
    inspectProductImport: vi.fn(),
    listProductUnits: vi.fn(),
    listVariantGroups: vi.fn(),
    listVariantMasters: vi.fn(),
    loadInventory: vi.fn(),
    loadInventoryDashboardSummary: vi.fn(),
    loadStockLots: vi.fn(),
    loadStockMovements: vi.fn(),
    loadStockSnapshot: vi.fn(),
    previewProductImport: vi.fn(),
    recordAdjustment: vi.fn(),
    recordIssue: vi.fn(),
    recordReceipt: vi.fn(),
    recordTransfer: vi.fn(),
    setPrice: vi.fn(),
    updateBrand: vi.fn(),
    updateCategory: vi.fn(),
    updateProduct: vi.fn(),
    updateProductUnit: vi.fn(),
    updateUnit: vi.fn(),
    updateVariantGroup: vi.fn(),
    updateVariantMaster: vi.fn(),
    uploadProductImage: vi.fn(),
    uploadProductUnitImage: vi.fn(),
}))

const inventory = {
    categories: [],
    brands: [],
    units: [
        {
            id: 1,
            company_id: 1,
            name: "Pieces",
            code: "pcs",
            is_active: true,
        },
    ],
    products: [],
    productTotal: 0,
    priceLists: [],
    discounts: [],
    rewards: [],
}

const productUnit = {
    id: 8,
    company_id: 1,
    product_id: 4,
    sku: "SKU-001",
    barcode: null,
    name: "Sellable SKU",
    is_active: true,
    product: null,
    variants: [],
}

function mockSession(activeCompanyId: number | null = 1) {
    vi.mocked(useSession).mockReturnValue({
        token: "token",
        activeCompanyId,
        organizationContext: {
            company: null,
            membership: null,
            branches: [
                { id: 1, company_id: 1, name: "Main", code: "MAIN", is_primary: true, status: "active" },
                { id: 2, company_id: 1, name: "Outlet", code: "OUT", is_primary: false, status: "active" },
            ],
        },
    } as ReturnType<typeof useSession>)
}

function mockInventoryApi() {
    vi.mocked(loadInventory).mockResolvedValue(inventory)
    vi.mocked(loadInventoryDashboardSummary).mockResolvedValue({
        counters: {
            products: { total: 0, active: 0 },
            product_units: { total: 0, active: 0 },
            stock_lots: { active: 0 },
            stock_movements: { total: 0, unsettled: 0 },
            stock_value: "0.0000",
        },
    })
    vi.mocked(listVariantGroups).mockResolvedValue({
        data: { variant_groups: [], pagination: { total: 0 } },
        message: "OK",
    })
    vi.mocked(listVariantMasters).mockResolvedValue({
        data: { variants: [], pagination: { total: 0 } },
        message: "OK",
    })
    vi.mocked(listProductUnits).mockResolvedValue({
        data: { product_units: [productUnit], pagination: { total: 1 } },
        message: "OK",
    })
    vi.mocked(loadStockSnapshot).mockResolvedValue({
        lots: [],
        movements: [],
        movementTotal: 0,
        totalValue: "0.0000",
        selectedOnHand: "0.0000",
    })
}

function headerFor(name: string) {
    const header = screen.getByRole("heading", { name }).closest("[data-inventory-page-header]")
    expect(header).not.toBeNull()
    return header as HTMLElement
}

function expectDashboardHeader(name: string) {
    expect(headerFor(name)).toHaveClass("rounded-2xl", "border", "border-navy-100", "bg-white", "p-6")
    expect(headerFor(name)).not.toHaveClass("border-b", "pb-5")
}

describe("inventory layout unification", () => {
    it("keeps the dashboard header and primary action as the source contract", async () => {
        mockSession()
        mockInventoryApi()

        render(<InventoryDashboardView />)

        await waitFor(() => expect(screen.getByRole("heading", { name: "Inventory Dashboard" })).toBeInTheDocument())
        expectDashboardHeader("Inventory Dashboard")
        expect(screen.getByText("Company scoped")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "New Product" })).toHaveClass("h-11", "rounded-md", "bg-teal-700", "px-6")
    })

    it("renders catalogue pricing and promotions with the dashboard header surface", async () => {
        mockSession()
        mockInventoryApi()

        const cataloguePage = render(<CataloguePage />)
        expectDashboardHeader("Catalogue Master Data")
        cataloguePage.unmount()

        const catalogueView = render(<CatalogueView />)
        await waitFor(() => expect(screen.getByRole("heading", { name: "Product Catalogue" })).toBeInTheDocument())
        expectDashboardHeader("Product Catalogue")
        catalogueView.unmount()

        const pricingView = render(<PricingView />)
        await waitFor(() => expect(screen.getByRole("heading", { name: "Pricing Management" })).toBeInTheDocument())
        expectDashboardHeader("Pricing Management")
        pricingView.unmount()

        render(<PromotionsView />)
        await waitFor(() => expect(screen.getByRole("heading", { name: "Promotions & Rewards" })).toBeInTheDocument())
        expectDashboardHeader("Promotions & Rewards")
    })

    it("upgrades master data pages from the old border header to the dashboard header and action sizing", async () => {
        mockSession()
        mockInventoryApi()

        render(<InventoryMasterDataView kind="products" mode="list" />)

        await waitFor(() => expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument())
        expectDashboardHeader("Products")
        expect(screen.getByText("Company scoped")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "New Product" })).toHaveClass("h-11")
    })

    it("upgrades stock pages and submit actions to the same dashboard layout system", async () => {
        mockSession()
        mockInventoryApi()

        const { unmount } = render(<StockOverviewView />)
        await waitFor(() => expect(screen.getByRole("heading", { name: "Stock Overview" })).toBeInTheDocument())
        expectDashboardHeader("Stock Overview")
        expect(screen.getByText("Company scoped")).toBeInTheDocument()
        unmount()

        render(<StockReceiptView />)
        await waitFor(() => expect(screen.getByRole("heading", { name: "New Receipt" })).toBeInTheDocument())
        expectDashboardHeader("New Receipt")
        expect(screen.getByRole("button", { name: "Record Receipt" })).toHaveClass("h-11")
    })

    it("keeps unscoped inventory pages readable with the shared no-company status", () => {
        mockSession(null)
        mockInventoryApi()

        render(<InventoryMasterDataView kind="products" mode="list" />)

        expectDashboardHeader("Products")
        expect(screen.getByText("No company")).toBeInTheDocument()
    })

    it("renders product image previews and icon-only master list actions", async () => {
        mockSession()
        mockInventoryApi()
        vi.mocked(loadInventory).mockResolvedValue({
            ...inventory,
            products: [
                {
                    id: 4,
                    company_id: 1,
                    category_id: null,
                    brand_id: null,
                    base_uom_id: 1,
                    name: "Nasi Box Premium",
                    description: null,
                    track_stock: true,
                    attributes: null,
                    status: "active",
                    variants: [],
                    images: [
                        {
                            id: 99,
                            url: "/storage/nasi-box.jpg",
                            alt_text: "Nasi Box Premium Image",
                            is_primary: true,
                        },
                    ],
                },
            ],
            productTotal: 1,
        })

        render(<InventoryMasterDataView kind="products" mode="list" />)

        await waitFor(() => expect(screen.getByText("Nasi Box Premium")).toBeInTheDocument())
        expect(screen.getByAltText("Nasi Box Premium Image")).toBeInTheDocument()
        expect(screen.getByLabelText("View Product")).toBeInTheDocument()
        expect(screen.getByLabelText("Edit Product")).toBeInTheDocument()
        expect(screen.queryByText("View")).not.toBeInTheDocument()
        expect(screen.queryByText("Edit")).not.toBeInTheDocument()
    })

    it("previews remote product image URLs before submitting", async () => {
        mockSession()
        mockInventoryApi()

        render(<InventoryMasterDataView kind="products" mode="create" />)

        fireEvent.change(screen.getByLabelText("Remote image URL"), {
            target: { value: "https://images.example.test/menu.jpg" },
        })

        expect(screen.getByAltText("Remote product preview")).toHaveAttribute(
            "src",
            "https://images.example.test/menu.jpg",
        )
    })

    it("drives product spreadsheet import sheet selection and validation preview", async () => {
        mockSession()
        mockInventoryApi()
        vi.mocked(downloadProductImportTemplate).mockResolvedValue(new Blob(["template"]))
        vi.mocked(inspectProductImport).mockResolvedValue({
            import: { id: 12, kind: "inventory_products", status: "inspected", error_count: 0, row_count: 0 },
            sheets: [
                { name: "Products", supported: true, row_count: 1, reason: null },
                { name: "Notes", supported: false, row_count: 3, reason: "Missing required template headers." },
            ],
            rows: [],
        })
        vi.mocked(previewProductImport).mockResolvedValue({
            import: { id: 12, kind: "inventory_products", status: "invalid", error_count: 1, row_count: 1 },
            rows: [
                {
                    id: 1,
                    row_number: 2,
                    normalized: { sku: "BAD-SKU" },
                    errors: { sku: ["SKU is required."] },
                },
            ],
            sheets: [],
        })

        render(<InventoryMasterDataView kind="products" mode="list" />)
        await waitFor(() => expect(screen.getByRole("button", { name: "Import Products" })).toBeInTheDocument())

        fireEvent.click(screen.getByRole("button", { name: "Import Products" }))
        fireEvent.change(screen.getByLabelText("Google Sheets URL"), {
            target: { value: "https://docs.google.com/spreadsheets/d/example/export?format=csv" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Inspect source" }))

        await waitFor(() => expect(screen.getByRole("option", { name: /Notes/ })).toBeDisabled())

        fireEvent.change(screen.getByLabelText("Sheet page"), { target: { value: "Products" } })
        fireEvent.click(screen.getByRole("button", { name: "Preview import" }))

        await waitFor(() => expect(screen.getByText("Row 2")).toBeInTheDocument())
        expect(screen.getByText("SKU is required.")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Queue import" })).toBeDisabled()
    })
})
