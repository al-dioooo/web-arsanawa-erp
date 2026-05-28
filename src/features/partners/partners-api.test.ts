import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    createPartner,
    createPartnerAddress,
    createPartnerContact,
    deletePartner,
    deletePartnerAddress,
    deletePartnerContact,
    getPartner,
    listPartners,
    updatePartner,
    updatePartnerAddress,
    updatePartnerContact,
} from "@/features/partners/partners-api"

describe("partners API client", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "ok",
                    data: {
                        partners: [],
                        partner: { id: 5 },
                        contact: { id: 8 },
                        address: { id: 9 },
                    },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("lists and shows partners with supported filters", async () => {
        await listPartners({ type: "customer", status: "active", search: "alice", per_page: 50 })
        await getPartner(5)

        expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
            "/api/v1/partners?type=customer&status=active&search=alice&per_page=50",
        )
        expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("/api/v1/partners/5")
    })

    it("creates, updates, and deletes partners", async () => {
        await createPartner({ name: "Acme", type: "customer", email: "buyer@example.com" })
        await updatePartner(5, { name: "Acme Updated", status: "inactive" })
        await deletePartner(5)

        const calls = vi.mocked(fetch).mock.calls
        expect(String(calls[0][0])).toContain("/api/v1/partners")
        expect(calls[0][1]?.method).toBe("POST")
        expect(calls[0][1]?.body).toBe(
            JSON.stringify({ name: "Acme", type: "customer", email: "buyer@example.com" }),
        )
        expect(String(calls[1][0])).toContain("/api/v1/partners/5")
        expect(calls[1][1]?.method).toBe("PATCH")
        expect(String(calls[2][0])).toContain("/api/v1/partners/5")
        expect(calls[2][1]?.method).toBe("DELETE")
    })

    it("manages partner contacts and addresses", async () => {
        await createPartnerContact(5, { name: "Buyer", is_primary: true })
        await updatePartnerContact(5, 8, { phone: "08123456789" })
        await deletePartnerContact(5, 8)
        await createPartnerAddress(5, { address_line_1: "Jl. Merdeka 1", type: "billing" })
        await updatePartnerAddress(5, 9, { city: "Jakarta" })
        await deletePartnerAddress(5, 9)

        const calls = vi.mocked(fetch).mock.calls
        expect(String(calls[0][0])).toContain("/api/v1/partners/5/contacts")
        expect(calls[0][1]?.method).toBe("POST")
        expect(String(calls[1][0])).toContain("/api/v1/partners/5/contacts/8")
        expect(calls[1][1]?.method).toBe("PATCH")
        expect(String(calls[2][0])).toContain("/api/v1/partners/5/contacts/8")
        expect(calls[2][1]?.method).toBe("DELETE")
        expect(String(calls[3][0])).toContain("/api/v1/partners/5/addresses")
        expect(calls[3][1]?.method).toBe("POST")
        expect(String(calls[4][0])).toContain("/api/v1/partners/5/addresses/9")
        expect(calls[4][1]?.method).toBe("PATCH")
        expect(String(calls[5][0])).toContain("/api/v1/partners/5/addresses/9")
        expect(calls[5][1]?.method).toBe("DELETE")
    })
})
