import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    addVariant,
    deleteBrand,
    deleteCategory,
    deleteDiscount,
    deleteProduct,
    deleteProductUnit,
    deleteReward,
    deleteUnit,
    deleteVariant,
    deleteVariantGroup,
    deleteVariantMaster,
    getProductUnit,
    getVariantGroup,
    getVariantMaster,
    getProduct,
    moveCategory,
    recordAdjustment,
    recordIssue,
    recordTransfer,
    resolveVariantPrice,
    setVariantAvailability,
    syncProductTags,
    updateBrand,
    updateCategory,
    updateProduct,
    updateProductUnit,
    updateUnit,
    updateVariant,
    updateVariantGroup,
    updateVariantMaster,
    createVariantGroup,
    createVariantMaster,
    createProductUnit,
    listVariantGroups,
    listVariantMasters,
    listProductUnits,
} from "@/features/inventory/inventory-api"

const requestOptions = { token: "token", companyId: 7 }

describe("inventory API route coverage", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "OK",
                    data: { product: { id: 4 }, price: "10000.0000" },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("covers catalogue update, delete, move, tags, variants, and availability routes", async () => {
        await updateCategory(requestOptions, 1, { name: "Snacks" })
        await moveCategory(requestOptions, 1, { parent_id: null })
        await deleteCategory(requestOptions, 1)
        await updateBrand(requestOptions, 2, { name: "House" })
        await deleteBrand(requestOptions, 2)
        await updateUnit(requestOptions, 3, { code: "pcs" })
        await deleteUnit(requestOptions, 3)
        await getProduct(requestOptions, 4)
        await updateProduct(requestOptions, 4, { name: "Rice Crackers" })
        await syncProductTags(requestOptions, 4, ["snack", "retail"])
        await addVariant(requestOptions, 4, { sku: "SKU-2", name: "Large" })
        await updateVariant(requestOptions, 4, 5, { sku: "SKU-2A" })
        await setVariantAvailability(requestOptions, 4, 5, {
            branch_id: 9,
            is_available: true,
            is_exclusive: false,
        })
        await deleteVariant(requestOptions, 4, 5)
        await deleteProduct(requestOptions, 4)

        const calls = vi.mocked(fetch).mock.calls.map(([url, init]) => [
            String(url),
            init?.method ?? "GET",
        ])

        expect(calls).toEqual([
            [expect.stringContaining("/api/v1/inventory/categories/1"), "PATCH"],
            [expect.stringContaining("/api/v1/inventory/categories/1/move"), "POST"],
            [expect.stringContaining("/api/v1/inventory/categories/1"), "DELETE"],
            [expect.stringContaining("/api/v1/inventory/brands/2"), "PATCH"],
            [expect.stringContaining("/api/v1/inventory/brands/2"), "DELETE"],
            [expect.stringContaining("/api/v1/inventory/units-of-measure/3"), "PATCH"],
            [expect.stringContaining("/api/v1/inventory/units-of-measure/3"), "DELETE"],
            [expect.stringContaining("/api/v1/inventory/products/4"), "GET"],
            [expect.stringContaining("/api/v1/inventory/products/4"), "PATCH"],
            [expect.stringContaining("/api/v1/inventory/products/4/tags"), "PUT"],
            [expect.stringContaining("/api/v1/inventory/products/4/variants"), "POST"],
            [expect.stringContaining("/api/v1/inventory/products/4/variants/5"), "PATCH"],
            [expect.stringContaining("/api/v1/inventory/products/4/variants/5/availability"), "PUT"],
            [expect.stringContaining("/api/v1/inventory/products/4/variants/5"), "DELETE"],
            [expect.stringContaining("/api/v1/inventory/products/4"), "DELETE"],
        ])
    })

    it("covers stock movement, price resolve, and promotion delete routes", async () => {
        await recordIssue(requestOptions, {
            branch_id: 1,
            product_variant_id: 2,
            quantity: 3,
            notes: "sample",
        })
        await recordAdjustment(requestOptions, {
            branch_id: 1,
            product_variant_id: 2,
            quantity: -1,
            unit_cost: 1000,
            notes: "count",
        })
        await recordTransfer(requestOptions, {
            from_branch_id: 1,
            to_branch_id: 2,
            items: [{ product_variant_id: 2, quantity: 1 }],
            notes: "move",
        })
        await resolveVariantPrice(requestOptions, 4, 5, { branch_id: 1, quantity: 2 })
        await deleteDiscount(requestOptions, 6)
        await deleteReward(requestOptions, 7)

        const calls = vi.mocked(fetch).mock.calls.map(([url, init]) => [
            String(url),
            init?.method ?? "GET",
        ])

        expect(calls).toEqual([
            [expect.stringContaining("/api/v1/inventory/stock/issues"), "POST"],
            [expect.stringContaining("/api/v1/inventory/stock/adjustments"), "POST"],
            [expect.stringContaining("/api/v1/inventory/stock/transfers"), "POST"],
            [expect.stringContaining("/api/v1/inventory/products/4/variants/5/price"), "GET"],
            [expect.stringContaining("/api/v1/inventory/discounts/6"), "DELETE"],
            [expect.stringContaining("/api/v1/inventory/rewards/7"), "DELETE"],
        ])
    })

    it("covers variant group, variant master, and product unit routes", async () => {
        await listVariantGroups(requestOptions)
        await createVariantGroup(requestOptions, {
            name: "Package Size",
            code: "package-size",
            unit_of_measure_id: 3,
        })
        await getVariantGroup(requestOptions, 1)
        await updateVariantGroup(requestOptions, 1, { is_active: false })
        await deleteVariantGroup(requestOptions, 1)
        await listVariantMasters(requestOptions, { variant_group_id: 1 })
        await createVariantMaster(requestOptions, {
            variant_group_id: 1,
            name: "25 Pax",
            code: "25-pax",
        })
        await getVariantMaster(requestOptions, 2)
        await updateVariantMaster(requestOptions, 2, { position: 20 })
        await deleteVariantMaster(requestOptions, 2)
        await listProductUnits(requestOptions, { product_id: 4 })
        await createProductUnit(requestOptions, {
            product_id: 4,
            sku: "SKL-NB-25",
            variant_ids: [2],
        })
        await getProductUnit(requestOptions, 3)
        await updateProductUnit(requestOptions, 3, { sku: "SKL-NB-25-A" })
        await deleteProductUnit(requestOptions, 3)

        const calls = vi.mocked(fetch).mock.calls.map(([url, init]) => [
            String(url),
            init?.method ?? "GET",
        ])

        expect(calls).toEqual([
            [expect.stringContaining("/api/v1/inventory/variant-groups"), "GET"],
            [expect.stringContaining("/api/v1/inventory/variant-groups"), "POST"],
            [expect.stringContaining("/api/v1/inventory/variant-groups/1"), "GET"],
            [expect.stringContaining("/api/v1/inventory/variant-groups/1"), "PATCH"],
            [expect.stringContaining("/api/v1/inventory/variant-groups/1"), "DELETE"],
            [expect.stringContaining("/api/v1/inventory/variants?variant_group_id=1"), "GET"],
            [expect.stringContaining("/api/v1/inventory/variants"), "POST"],
            [expect.stringContaining("/api/v1/inventory/variants/2"), "GET"],
            [expect.stringContaining("/api/v1/inventory/variants/2"), "PATCH"],
            [expect.stringContaining("/api/v1/inventory/variants/2"), "DELETE"],
            [expect.stringContaining("/api/v1/inventory/product-units?product_id=4"), "GET"],
            [expect.stringContaining("/api/v1/inventory/product-units"), "POST"],
            [expect.stringContaining("/api/v1/inventory/product-units/3"), "GET"],
            [expect.stringContaining("/api/v1/inventory/product-units/3"), "PATCH"],
            [expect.stringContaining("/api/v1/inventory/product-units/3"), "DELETE"],
        ])
    })
})
