import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    assignBranchRole,
    createOrganizationRole,
    deleteOrganizationRole,
    listBranchAssignments,
    listOrganizationMemberships,
    listOrganizationPermissions,
    listOrganizationRoles,
    revokeBranchRole,
    updateOrganizationRole,
} from "@/features/organization/organization-api"

describe("organization API client", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "ok",
                    data: {
                        memberships: [],
                        permissions: {},
                        roles: [],
                        assignments: [],
                    },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("loads memberships, permission catalog, and company roles", async () => {
        await listOrganizationMemberships(7)
        await listOrganizationPermissions()
        await listOrganizationRoles(7)

        expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual([
            expect.stringContaining("/api/v1/organization/companies/7/memberships"),
            expect.stringContaining("/api/v1/organization/permissions"),
            expect.stringContaining("/api/v1/organization/companies/7/roles"),
        ])
    })

    it("creates, updates, and deletes roles with permission keys", async () => {
        await createOrganizationRole(7, {
            name: "stock-supervisor",
            permissions: ["inventory.view", "inventory.manage-stock"],
        })
        await updateOrganizationRole(7, 12, {
            name: "stock-lead",
            permissions: ["inventory.view"],
        })
        await deleteOrganizationRole(7, 12)

        const calls = vi.mocked(fetch).mock.calls
        expect(String(calls[0][0])).toContain("/api/v1/organization/companies/7/roles")
        expect(calls[0][1]?.method).toBe("POST")
        expect(calls[0][1]?.body).toBe(
            JSON.stringify({
                name: "stock-supervisor",
                permissions: ["inventory.view", "inventory.manage-stock"],
            }),
        )

        expect(String(calls[1][0])).toContain("/api/v1/organization/companies/7/roles/12")
        expect(calls[1][1]?.method).toBe("PUT")

        expect(String(calls[2][0])).toContain("/api/v1/organization/companies/7/roles/12")
        expect(calls[2][1]?.method).toBe("DELETE")
    })

    it("manages branch role assignments", async () => {
        await listBranchAssignments(7, 3)
        await assignBranchRole(7, 3, { user_id: 4, role_id: 12 })
        await revokeBranchRole(7, 3, 4)

        const calls = vi.mocked(fetch).mock.calls
        expect(String(calls[0][0])).toContain(
            "/api/v1/organization/companies/7/branches/3/assignments",
        )
        expect(String(calls[1][0])).toContain(
            "/api/v1/organization/companies/7/branches/3/assignments",
        )
        expect(calls[1][1]?.method).toBe("POST")
        expect(calls[1][1]?.body).toBe(JSON.stringify({ user_id: 4, role_id: 12 }))
        expect(String(calls[2][0])).toContain(
            "/api/v1/organization/companies/7/branches/3/assignments/4",
        )
        expect(calls[2][1]?.method).toBe("DELETE")
    })
})
