import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { OrganizationAdminPanel } from "@/features/organization/organization-admin-panel"
import {
    useAssignBranchRole,
    useBranchAssignments,
    useCreateOrganizationRole,
    useDeleteOrganizationRole,
    useOrganizationMemberships,
    useOrganizationPermissions,
    useOrganizationRoles,
    useRevokeBranchRole,
    useUpdateOrganizationRole,
} from "@/features/organization/organization-api"

vi.mock("@/features/organization/organization-api", () => ({
    useOrganizationMemberships: vi.fn(),
    useOrganizationPermissions: vi.fn(),
    useOrganizationRoles: vi.fn(),
    useCreateOrganizationRole: vi.fn(),
    useUpdateOrganizationRole: vi.fn(),
    useDeleteOrganizationRole: vi.fn(),
    useBranchAssignments: vi.fn(),
    useAssignBranchRole: vi.fn(),
    useRevokeBranchRole: vi.fn(),
}))

const createRole = vi.fn()
const updateRole = vi.fn()
const deleteRole = vi.fn()
const assignBranchRole = vi.fn()
const revokeBranchRole = vi.fn()

describe("OrganizationAdminPanel", () => {
    beforeEach(() => {
        createRole.mockReset()
        updateRole.mockReset()
        deleteRole.mockReset()
        assignBranchRole.mockReset()
        revokeBranchRole.mockReset()

        vi.mocked(useOrganizationMemberships).mockReturnValue({
            data: [
                {
                    id: 1,
                    company_id: 1,
                    user_id: 1,
                    branch_id: 1,
                    role: "owner",
                    status: "active",
                    joined_at: "2026-05-29T00:00:00.000Z",
                    user: {
                        id: 1,
                        name: "Alice Evergarden",
                        username: "aliceevr",
                        email: "hello@al.is-a.dev",
                    },
                },
            ],
            isLoading: false,
        } as ReturnType<typeof useOrganizationMemberships>)

        vi.mocked(useOrganizationPermissions).mockReturnValue({
            data: {
                inventory: {
                    label: "Inventory",
                    permissions: [
                        { key: "inventory.view", label: "View inventory" },
                        { key: "inventory.manage-stock", label: "Manage stock" },
                    ],
                },
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useOrganizationPermissions>)

        vi.mocked(useOrganizationRoles).mockReturnValue({
            data: [
                {
                    id: 10,
                    name: "company-owner",
                    is_builtin: true,
                    permissions: ["inventory.view", "inventory.manage-stock"],
                },
                {
                    id: 11,
                    name: "stock-supervisor",
                    is_builtin: false,
                    permissions: ["inventory.view"],
                },
            ],
            isLoading: false,
        } as ReturnType<typeof useOrganizationRoles>)

        vi.mocked(useCreateOrganizationRole).mockReturnValue({
            mutateAsync: createRole,
            isPending: false,
        } as unknown as ReturnType<typeof useCreateOrganizationRole>)
        vi.mocked(useUpdateOrganizationRole).mockReturnValue({
            mutateAsync: updateRole,
            isPending: false,
        } as unknown as ReturnType<typeof useUpdateOrganizationRole>)
        vi.mocked(useDeleteOrganizationRole).mockReturnValue({
            mutateAsync: deleteRole,
            isPending: false,
        } as unknown as ReturnType<typeof useDeleteOrganizationRole>)
        vi.mocked(useBranchAssignments).mockReturnValue({
            data: [
                {
                    id: 21,
                    company_id: 1,
                    branch_id: 1,
                    user_id: 1,
                    role_id: 11,
                    status: "active",
                    user: { id: 1, name: "Alice Evergarden", email: "hello@al.is-a.dev" },
                    role: { id: 11, name: "stock-supervisor" },
                },
            ],
            isLoading: false,
        } as ReturnType<typeof useBranchAssignments>)
        vi.mocked(useAssignBranchRole).mockReturnValue({
            mutateAsync: assignBranchRole,
            isPending: false,
        } as unknown as ReturnType<typeof useAssignBranchRole>)
        vi.mocked(useRevokeBranchRole).mockReturnValue({
            mutateAsync: revokeBranchRole,
            isPending: false,
        } as unknown as ReturnType<typeof useRevokeBranchRole>)
    })

    it("surfaces memberships, roles, and permission-backed role creation", async () => {
        render(
            <OrganizationAdminPanel
                companyId={1}
                canManage
                branches={[
                    {
                        id: 1,
                        company_id: 1,
                        name: "Main",
                        code: "MAIN",
                        is_primary: true,
                        status: "active",
                    },
                ]}
            />,
        )

        expect(screen.getAllByText("Alice Evergarden").length).toBeGreaterThan(0)
        expect(screen.getAllByText("company-owner").length).toBeGreaterThan(0)
        expect(screen.getAllByText("stock-supervisor").length).toBeGreaterThan(0)
        expect(screen.getByRole("button", { name: "Built-in" })).toBeDisabled()

        fireEvent.change(screen.getByLabelText("Role name"), {
            target: { value: "warehouse-lead" },
        })
        fireEvent.click(screen.getByLabelText(/View inventory/))
        fireEvent.click(screen.getByRole("button", { name: "Create role" }))

        await waitFor(() => expect(createRole).toHaveBeenCalledWith({
            name: "warehouse-lead",
            permissions: ["inventory.view"],
        }))

        fireEvent.change(screen.getByLabelText("Assign user ID"), {
            target: { value: "2" },
        })
        fireEvent.change(screen.getByLabelText("Assign role"), {
            target: { value: "11" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Assign branch role" }))

        await waitFor(() => expect(assignBranchRole).toHaveBeenCalledWith({
            user_id: 2,
            role_id: 11,
        }))

        fireEvent.click(screen.getByRole("button", { name: "Revoke Alice Evergarden" }))
        await waitFor(() => expect(revokeBranchRole).toHaveBeenCalledWith(1))
    })
})
