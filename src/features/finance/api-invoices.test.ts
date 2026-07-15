import { afterEach, describe, expect, it, vi } from "vitest"
import { loadAllInvoices } from "@/features/finance/api-invoices"

describe("loadAllInvoices", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("fetches every page so aging is computed over the full ledger, not just the first 15", async () => {
        const pages: Record<string, unknown> = {
            "1": {
                message: "OK",
                data: {
                    invoices: [{ id: 1, status: "posted" }],
                    pagination: { current_page: 1, last_page: 2, per_page: 100, total: 2 },
                },
            },
            "2": {
                message: "OK",
                data: {
                    invoices: [{ id: 2, status: "posted" }],
                    pagination: { current_page: 2, last_page: 2, per_page: 100, total: 2 },
                },
            },
        }

        vi.stubGlobal(
            "fetch",
            vi.fn().mockImplementation(async (url: string | URL) => {
                const page = new URL(String(url)).searchParams.get("page") ?? "1"
                return { ok: true, status: 200, json: async () => pages[page] }
            }),
        )

        const invoices = await loadAllInvoices()

        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
        expect(invoices.map((invoice) => invoice.id)).toEqual([1, 2])
        for (const [url] of vi.mocked(fetch).mock.calls) {
            expect(String(url)).toContain("per_page=100")
        }
    })
})
