import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    deleteAccount,
    deleteTaxRate,
    getAccount,
    loadFinanceDashboardSummary,
    getTaxRate,
    updateAccount,
    updateAccountMappings,
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

    it("sends account mappings as an array of {key, account_id} the API accepts", async () => {
        await updateAccountMappings({ ar_account: 5, ap_account: 7 })

        const [url, init] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/finance/account-mappings")
        expect(init?.method).toBe("PUT")
        expect(JSON.parse(String(init?.body))).toEqual({
            mappings: [
                { key: "ar_account", account_id: 5 },
                { key: "ap_account", account_id: 7 },
            ],
        })
    })

    it("loads the finance dashboard summary from the dashboard endpoint with date filters", async () => {
        await loadFinanceDashboardSummary(
            { start_date: "2026-06-01", end_date: "2026-06-30" },
            { token: "token", companyId: 7 },
        )

        const [url, init] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/finance/dashboard")
        expect(String(url)).toContain("start_date=2026-06-01")
        expect(String(url)).toContain("end_date=2026-06-30")
        expect(init?.method ?? "GET").toBe("GET")
    })
})
