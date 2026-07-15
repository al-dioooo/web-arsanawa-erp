import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchGoodsReceipt, fetchGoodsReceipts } from "@/features/finance/api-goods-receipt"

describe("goods-receipt API", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("lists goods receipts from the inventory goods-receipts endpoint and unwraps the envelope", async () => {
        const receipt = {
            id: 7,
            receipt_number: "STB-20260710-ABC123",
            delivery_note_number: "SJ-2026-0007",
            partner_id: 3,
            partner: { id: 3, name: "Supplier Inc" },
            receipt_date: "2026-07-10",
            status: "received",
            total_cost: "300000.0000",
            item_count: 1,
        }
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ message: "OK", data: { goods_receipts: [receipt], pagination: {} } }),
            }),
        )

        const receipts = await fetchGoodsReceipts({ status: "received", per_page: 100 })

        expect(receipts).toEqual([receipt])
        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/inventory/goods-receipts")
        expect(String(url)).toContain("status=received")
        expect(String(url)).toContain("per_page=100")
    })

    it("returns an empty array when the payload has no goods_receipts", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ message: "OK", data: {} }),
            }),
        )

        await expect(fetchGoodsReceipts()).resolves.toEqual([])
    })

    it("fetches a single goods receipt by id and unwraps the envelope", async () => {
        const receipt = { id: 42, receipt_number: "STB-1", lines: [{ id: 1, stock_movement_id: 99 }] }
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ message: "OK", data: { goods_receipt: receipt } }),
            }),
        )

        const result = await fetchGoodsReceipt(42)

        expect(result).toEqual(receipt)
        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/inventory/goods-receipts/42")
    })
})
