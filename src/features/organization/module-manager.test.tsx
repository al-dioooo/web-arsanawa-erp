import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ConsolePage from "@/app/(app)/page"
import { ModulesView } from "@/features/organization/modules-view"
import { useSession } from "@/features/auth/session-provider"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

const updateEntitlements = vi.fn()

function mockSession(overrides: Partial<ReturnType<typeof baseSession>> = {}) {
    vi.mocked(useSession).mockReturnValue({
        ...baseSession(),
        ...overrides,
    })
}

function baseSession() {
    return {
        token: "token",
        expiresAt: "2026-05-30T00:00:00.000Z",
        user: {
            id: 1,
            name: "Alice Evergarden",
            username: "aliceevr",
            email: "hello@al.is-a.dev",
            email_verified_at: null,
        },
        profile: null,
        companies: [
            {
                company: {
                    id: 1,
                    name: "SEKALORI Catering",
                    slug: "sekalori",
                    legal_name: "PT Sekalori Rasa Nusantara",
                    tax_identifier: null,
                    status: "active",
                },
                membership: {
                    id: 1,
                    company_id: 1,
                    user_id: 1,
                    branch_id: 1,
                    role: "owner",
                    status: "active",
                    joined_at: "2026-05-29T00:00:00.000Z",
                },
            },
        ],
        activeCompanyId: 1,
        activeBranchId: 1,
        organizationContext: {
            company: {
                id: 1,
                name: "SEKALORI Catering",
                slug: "sekalori",
                legal_name: "PT Sekalori Rasa Nusantara",
                tax_identifier: null,
                status: "active",
            },
            membership: {
                id: 1,
                company_id: 1,
                user_id: 1,
                branch_id: 1,
                role: "owner",
                status: "active",
                joined_at: "2026-05-29T00:00:00.000Z",
            },
            branches: [],
        },
        modules: {
            enabled: [],
            available: ["inventory", "finance", "pos"],
            company: {
                id: 1,
                name: "SEKALORI Catering",
                slug: "sekalori",
                legal_name: "PT Sekalori Rasa Nusantara",
                tax_identifier: null,
                status: "active",
            },
        },
        entitlements: [
            {
                id: 1,
                company_id: 1,
                module: "inventory",
                is_enabled: false,
                enabled_at: null,
                expires_at: null,
            },
            {
                id: 2,
                company_id: 1,
                module: "finance",
                is_enabled: true,
                enabled_at: "2026-05-29T00:00:00.000Z",
                expires_at: null,
            },
            {
                id: 3,
                company_id: 1,
                module: "pos",
                is_enabled: false,
                enabled_at: null,
                expires_at: null,
            },
        ],
        isLoading: false,
        error: null,
        fieldErrors: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
        refreshWorkspace: vi.fn(),
        selectCompany: vi.fn(),
        selectBranch: vi.fn(),
        createCompany: vi.fn(),
        createBranch: vi.fn(),
        addMembership: vi.fn(),
        updateEntitlements,
        clearError: vi.fn(),
    }
}

describe("module manager access", () => {
    beforeEach(() => {
        updateEntitlements.mockReset()
        mockSession()
    })

    it("shows module manager to a freshly seeded owner membership", () => {
        render(<ConsolePage />)

        expect(screen.getByRole("heading", { name: "Module Manager" })).toBeInTheDocument()
        expect(
            screen
                .getAllByRole("link", { name: /Open/ })
                .some((link) => link.getAttribute("href") === "/organization/modules"),
        ).toBe(true)
    })

    it("renders only implemented module apps and preserves state when installing one", () => {
        render(<ModulesView />)

        expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Finance" })).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Point of Sale" })).toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "Accounting" })).not.toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "Reporting" })).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Enable Inventory module" }))

        expect(updateEntitlements).toHaveBeenCalledWith(1, {
            modules: [
                { module: "inventory", is_enabled: true, expires_at: null },
                { module: "finance", is_enabled: true, expires_at: null },
                { module: "pos", is_enabled: false, expires_at: null },
            ],
        })
    })
})
