import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getIdentityUser, updateIdentityProfile } from "@/features/identity/identity-api"

describe("identity API client", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "OK",
                    data: {
                        id: 1,
                        name: "Alice Evergarden",
                        username: "aliceevr",
                        email: "alice@example.com",
                        profile: {
                            display_name: "Alice",
                            avatar: null,
                            locale: "en",
                            timezone: "Asia/Jakarta",
                        },
                        status: { status: "active" },
                    },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("updates the authenticated profile through PATCH identity/profile", async () => {
        await updateIdentityProfile({
            display_name: "Alice",
            avatar: "https://example.com/avatar.png",
            locale: "en",
            timezone: "Asia/Jakarta",
        })

        const [url, init] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/identity/profile")
        expect(init?.method).toBe("PATCH")
        expect(JSON.parse(String(init?.body))).toEqual({
            display_name: "Alice",
            avatar: "https://example.com/avatar.png",
            locale: "en",
            timezone: "Asia/Jakarta",
        })
    })

    it("looks up users by id through identity/users/{id}", async () => {
        await getIdentityUser(42)

        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/identity/users/42")
    })
})
