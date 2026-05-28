import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    listPlatformCurrencies,
    listPlatformSettings,
    upsertPlatformSettings,
} from "@/features/platform/platform-api"

describe("platform API client", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "OK",
                    data: {
                        currencies: [],
                        settings: [],
                    },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("loads currencies and module-scoped settings from the Platform API", async () => {
        await listPlatformCurrencies()
        await listPlatformSettings("finance")

        expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/api/v1/platform/currencies")
        expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("/api/v1/platform/settings?module=finance")
    })

    it("upserts company settings through the batch settings contract", async () => {
        await upsertPlatformSettings([
            {
                module: "finance",
                key: "default_cash_account_id",
                value: 12,
                branch_id: null,
            },
        ])

        const [url, init] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/platform/settings")
        expect(init?.method).toBe("PUT")
        expect(JSON.parse(String(init?.body))).toEqual({
            settings: [
                {
                    module: "finance",
                    key: "default_cash_account_id",
                    value: 12,
                    branch_id: null,
                },
            ],
        })
    })
})
