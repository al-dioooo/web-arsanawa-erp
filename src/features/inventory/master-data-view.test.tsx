import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { InventoryMasterDataView } from "@/features/inventory/master-data-view"
import { useSession } from "@/features/auth/session-provider"
import {
    addVariant,
    createProduct,
    deleteVariant,
    getProduct,
    listBrands,
    listCategories,
    listProducts,
    listUnitsOfMeasure,
    setVariantAvailability,
    syncProductTags,
} from "@/features/inventory/inventory-api"
import type { InventoryProduct } from "@/features/inventory/inventory-types"

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}))

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}))

// Echo the en.json copy for the keys the assertions rely on; unknown keys
// fall back to the full key so missing copy is visible in failures.
vi.mock("next-intl", () => ({
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, string | number>) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const labels: Record<string, string> = {
            "common.save": "Save",
            "common.cancel": "Cancel",
            "common.delete": "Delete",
            "common.edit": "Edit",
            "common.companyScoped": "Company scoped",
            "common.noCompany": "No company",
            "inventory.master.kinds.products.title": "Products",
            "inventory.master.kinds.products.singular": "Product",
            "inventory.master.heading.create": "New {name}",
            "inventory.master.heading.detail": "{name} Detail",
            "inventory.master.form.name": "Name",
            "inventory.master.form.baseUnit": "Base Unit",
            "inventory.master.form.category": "Category",
            "inventory.master.form.brand": "Brand",
            "inventory.master.form.initialSku": "Initial variant SKU",
            "inventory.master.form.initialVariantName": "Initial variant name",
            "inventory.master.form.saving": "Saving...",
            "inventory.master.variantManager.newSku": "New variant SKU",
            "inventory.master.variantManager.newName": "Variant name",
            "inventory.master.variantManager.newBarcode": "Barcode",
            "inventory.master.variantManager.add": "Add variant",
            "inventory.master.variantManager.editAria": "Edit variant {sku}",
            "inventory.master.variantManager.deleteAria": "Delete variant {sku}",
            "inventory.master.variantManager.deleteTitle": "Delete variant “{sku}”?",
            "inventory.master.variantManager.availability.availableAria": "{sku} available at {branch}",
            "inventory.master.variantManager.tags.addLabel": "Add tag",
            "inventory.master.variantManager.tags.addButton": "Add",
            "inventory.master.variantManager.tags.save": "Save tags",
        }

        const template = labels[fullKey] ?? fullKey
        return template.replace(/\{(\w+)\}/g, (_, token: string) => String(values?.[token] ?? ""))
    },
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@/features/inventory/inventory-api", () => ({
    addVariant: vi.fn(),
    commitProductImport: vi.fn(),
    createBrand: vi.fn(),
    createCategory: vi.fn(),
    createProduct: vi.fn(),
    createProductUnit: vi.fn(),
    createUnit: vi.fn(),
    createVariantGroup: vi.fn(),
    createVariantMaster: vi.fn(),
    deleteBrand: vi.fn(),
    deleteCategory: vi.fn(),
    deleteProduct: vi.fn(),
    deleteProductUnit: vi.fn(),
    deleteUnit: vi.fn(),
    deleteVariant: vi.fn(),
    deleteVariantGroup: vi.fn(),
    deleteVariantMaster: vi.fn(),
    downloadProductImportTemplate: vi.fn(),
    getProduct: vi.fn(),
    getProductImport: vi.fn(),
    inspectProductImport: vi.fn(),
    listBrands: vi.fn(),
    listCategories: vi.fn(),
    listProducts: vi.fn(),
    listProductUnits: vi.fn(),
    listUnitsOfMeasure: vi.fn(),
    listVariantGroups: vi.fn(),
    listVariantMasters: vi.fn(),
    previewProductImport: vi.fn(),
    saveCategoryDetails: vi.fn(),
    setVariantAvailability: vi.fn(),
    syncProductTags: vi.fn(),
    updateBrand: vi.fn(),
    updateProduct: vi.fn(),
    updateProductUnit: vi.fn(),
    updateUnit: vi.fn(),
    updateVariant: vi.fn(),
    updateVariantGroup: vi.fn(),
    updateVariantMaster: vi.fn(),
    uploadProductImage: vi.fn(),
    uploadProductUnitImage: vi.fn(),
}))

const productDetail: InventoryProduct = {
    id: 4,
    company_id: 1,
    category_id: null,
    brand_id: null,
    base_uom_id: 1,
    name: "Nasi Box",
    description: null,
    track_stock: true,
    attributes: null,
    status: "active",
    variants: [
        {
            id: 100,
            product_id: 4,
            company_id: 1,
            sku: "NB-REG",
            barcode: null,
            name: "Regular",
            attributes: null,
            purchase_uom_id: null,
            purchase_conversion_factor: "1.0000",
            is_active: true,
            branch_availability: [{ branch_id: 2, is_available: false, is_exclusive: false }],
        },
    ],
    tags: [{ id: 1, name: "seasonal" }],
}

function mockSession() {
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
}

function mockLists() {
    vi.mocked(listCategories).mockResolvedValue({ categories: [] })
    vi.mocked(listBrands).mockResolvedValue({ brands: [] })
    vi.mocked(listUnitsOfMeasure).mockResolvedValue({
        units: [{ id: 1, company_id: 1, name: "Pieces", code: "pcs", is_active: true }],
    })
    vi.mocked(listProducts).mockResolvedValue({ products: [productDetail], productTotal: 1 })
    vi.mocked(getProduct).mockResolvedValue({
        data: { product: productDetail },
        message: "OK",
    } as Awaited<ReturnType<typeof getProduct>>)
}

describe("InventoryMasterDataView products", () => {
    it("creates a product with an initial variant SKU", async () => {
        mockSession()
        mockLists()
        vi.mocked(createProduct).mockResolvedValue({
            data: { product: { id: 9 } },
            message: "OK",
        } as Awaited<ReturnType<typeof createProduct>>)

        render(<InventoryMasterDataView kind="products" mode="create" />)

        // Let the mount-time form reset and data load settle before typing.
        await waitFor(() => expect(listUnitsOfMeasure).toHaveBeenCalled())

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Es Kopi" } })
        fireEvent.focus(screen.getByLabelText("Base Unit"))
        fireEvent.click(await screen.findByRole("option", { name: /Pieces \(pcs\)/ }))
        fireEvent.change(screen.getByLabelText("Initial variant SKU"), { target: { value: "EK-01" } })
        fireEvent.click(screen.getByRole("button", { name: "Save" }))

        await waitFor(() => {
            expect(createProduct).toHaveBeenCalledWith(
                { token: "token", companyId: 1 },
                expect.objectContaining({
                    name: "Es Kopi",
                    base_uom_id: 1,
                    variants: [{ sku: "EK-01", name: undefined }],
                }),
            )
        })
    })

    it("lists variants on the product detail and adds a new one", async () => {
        mockSession()
        mockLists()
        vi.mocked(addVariant).mockResolvedValue({ data: {}, message: "OK" } as Awaited<
            ReturnType<typeof addVariant>
        >)

        render(<InventoryMasterDataView kind="products" mode="detail" id="4" />)

        expect((await screen.findAllByText("NB-REG")).length).toBeGreaterThan(0)

        fireEvent.change(screen.getByLabelText("New variant SKU"), { target: { value: "NB-LRG" } })
        fireEvent.click(screen.getByRole("button", { name: "Add variant" }))

        await waitFor(() => {
            expect(addVariant).toHaveBeenCalledWith({ token: "token", companyId: 1 }, 4, {
                sku: "NB-LRG",
                name: null,
                barcode: null,
            })
        })
    })

    it("reflects and toggles per-branch availability", async () => {
        mockSession()
        mockLists()
        vi.mocked(setVariantAvailability).mockResolvedValue({ data: {}, message: "OK" } as Awaited<
            ReturnType<typeof setVariantAvailability>
        >)

        render(<InventoryMasterDataView kind="products" mode="detail" id="4" />)

        const mainToggle = await screen.findByLabelText("NB-REG available at Main")
        const outletToggle = screen.getByLabelText("NB-REG available at Outlet")
        expect(mainToggle).toBeChecked()
        expect(outletToggle).not.toBeChecked()

        fireEvent.click(outletToggle)

        await waitFor(() => {
            expect(setVariantAvailability).toHaveBeenCalledWith({ token: "token", companyId: 1 }, 4, 100, {
                branch_id: 2,
                is_available: true,
                is_exclusive: false,
            })
        })
    })

    it("deletes a variant only after confirmation", async () => {
        mockSession()
        mockLists()
        vi.mocked(deleteVariant).mockResolvedValue({ data: {}, message: "OK" } as Awaited<
            ReturnType<typeof deleteVariant>
        >)

        render(<InventoryMasterDataView kind="products" mode="detail" id="4" />)

        fireEvent.click(await screen.findByLabelText("Delete variant NB-REG"))

        const dialog = await screen.findByRole("dialog")
        fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

        await waitFor(() => {
            expect(deleteVariant).toHaveBeenCalledWith({ token: "token", companyId: 1 }, 4, 100)
        })
    })

    it("saves the edited tag set", async () => {
        mockSession()
        mockLists()
        vi.mocked(syncProductTags).mockResolvedValue({ data: {}, message: "OK" } as Awaited<
            ReturnType<typeof syncProductTags>
        >)

        render(<InventoryMasterDataView kind="products" mode="detail" id="4" />)

        expect(await screen.findByText("seasonal")).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText("Add tag"), { target: { value: "promo" } })
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
        fireEvent.click(screen.getByRole("button", { name: "Save tags" }))

        await waitFor(() => {
            expect(syncProductTags).toHaveBeenCalledWith({ token: "token", companyId: 1 }, 4, [
                "seasonal",
                "promo",
            ])
        })
    })
})
