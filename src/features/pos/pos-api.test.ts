import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cancelSale, listSales, loadCustomers, loadProductsForSale } from "@/features/pos/pos-api"

describe("POS API", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "Sales retrieved.",
                    data: {
                        sales: [],
                        pagination: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
                    },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("sends branch and fulfilment filters when listing sales", async () => {
        await listSales(
            { token: "token", companyId: 9 },
            {
                type: "catering",
                status: "confirmed",
                branch_id: 12,
                fulfilment_from: "2026-05-01",
                fulfilment_to: "2026-05-31",
            } as Parameters<typeof listSales>[1],
        )

        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/pos/sales?")
        expect(String(url)).toContain("type=catering")
        expect(String(url)).toContain("status=confirmed")
        expect(String(url)).toContain("branch_id=12")
        expect(String(url)).toContain("fulfilment_from=2026-05-01")
        expect(String(url)).toContain("fulfilment_to=2026-05-31")
    })

    it("posts to the sale cancel endpoint", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                message: "Sale canceled.",
                data: {
                    sale: { id: 44, status: "void" },
                },
            }),
        } as Response)

        await cancelSale({ token: "token", companyId: 9 }, 44)

        const [url, init] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/pos/sales/44/cancel")
        expect(init?.method).toBe("POST")
    })

    it("loads active customers within the Partners API pagination limit", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                message: "Partners retrieved.",
                data: {
                    partners: [],
                    pagination: { current_page: 1, last_page: 1, per_page: 100, total: 0 },
                },
            }),
        } as Response)

        await loadCustomers({ token: "token", companyId: 9 })

        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/partners?")
        expect(String(url)).toContain("type=customer")
        expect(String(url)).toContain("status=active")
        expect(String(url)).toContain("per_page=100")
    })

    it("loads sale products within the Inventory API pagination limit", async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                message: "OK",
                data: {
                    products: [],
                    categories: [],
                    pagination: { current_page: 1, last_page: 1, per_page: 100, total: 0 },
                },
            }),
        } as Response)

        await loadProductsForSale({ token: "token", companyId: 9 })

        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/inventory/products?")
        expect(String(url)).toContain("per_page=100")
    })
})
