import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    deleteAccount,
    deleteTaxRate,
    getAccount,
    getTaxRate,
    updateAccount,
    updateTaxRate,
} from "@/features/finance/api"

describe("finance API route coverage", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "OK",
                    data: { account: { id: 4 }, tax_rate: { id: 9 } },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("covers account show, update, and delete routes", async () => {
        await getAccount(4)
        await updateAccount(4, { name: "Cash on Hand" })
        await deleteAccount(4)

        const calls = vi.mocked(fetch).mock.calls.map(([url, init]) => [
            String(url),
            init?.method ?? "GET",
        ])

        expect(calls).toEqual([
            [expect.stringContaining("/api/v1/finance/accounts/4"), "GET"],
            [expect.stringContaining("/api/v1/finance/accounts/4"), "PATCH"],
            [expect.stringContaining("/api/v1/finance/accounts/4"), "DELETE"],
        ])
    })

    it("covers tax rate show, update, and delete routes", async () => {
        await getTaxRate(9)
        await updateTaxRate(9, { rate: "11.00" })
        await deleteTaxRate(9)

        const calls = vi.mocked(fetch).mock.calls.map(([url, init]) => [
            String(url),
            init?.method ?? "GET",
        ])

        expect(calls).toEqual([
            [expect.stringContaining("/api/v1/finance/tax-rates/9"), "GET"],
            [expect.stringContaining("/api/v1/finance/tax-rates/9"), "PATCH"],
            [expect.stringContaining("/api/v1/finance/tax-rates/9"), "DELETE"],
        ])
    })
})
