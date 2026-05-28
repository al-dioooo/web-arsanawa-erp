import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    addVariant,
    deleteBrand,
    deleteCategory,
    deleteDiscount,
    deleteProduct,
    deleteReward,
    deleteUnit,
    deleteVariant,
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
    updateUnit,
    updateVariant,
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
})
