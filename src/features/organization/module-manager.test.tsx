import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ConsolePage from "@/app/(app)/page"
import { ModulesView } from "@/features/organization/modules-view"
import { useSession } from "@/features/auth/session-provider"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

// The home dashboard (rendered by the `/` route) pulls per-module summaries —
// keep them idle so this suite exercises only the launcher/entitlement logic.
vi.mock("@/features/home/home-api", () => ({
    useInventoryDashboardSummary: () => ({ data: undefined, isLoading: false, isError: false }),
    usePosDashboardSummary: () => ({ data: undefined, isLoading: false, isError: false }),
}))

vi.mock("@/features/finance/api", () => ({
    useFinanceDashboardSummary: () => ({ data: undefined, isLoading: false, isError: false }),
}))

vi.mock("next-intl", () => ({
    useFormatter: () => ({
        dateTime: () => "Kamis, 17 Juli 2026",
    }),
    useTranslations: () => (key: string, values?: Record<string, string | number>) => {
        const labels: Record<string, string> = {
            "console.eyebrow": "Console",
            "console.welcome": `Welcome back, ${values?.name ?? ""}`,
            "console.managing": `Managing operations for ${values?.company ?? ""}. Choose an app to begin.`,
            "console.selectOrganization": "Select an organization to activate your workspace.",
            "console.section": "Console",
            "console.applications": "Applications",
            "console.activeCount": `${values?.count ?? 0} active`,
            "console.noApplications": "No applications installed",
            "console.openModuleManagerHint": "Open the Module Manager to install apps for this company.",
            "console.askAdminHint": "Ask your administrator to install apps for this company.",
            "console.openModuleManager": "Open Module Manager",
            "console.availableToInstall": "Available to install",
            "console.organizationDescription": "Companies, branches, members, and roles.",
            "console.profileDescription": "Identity, locale, timezone, and user lookup.",
            "console.partnersDescription": "Customers, suppliers, contacts, and addresses.",
            "console.platformSettingsDescription": "Currencies and company module settings.",
            "console.moduleManagerDescription": "Install or uninstall apps for this company.",
            "console.apiKeysDescription": "External access keys for landing pages and integrations.",
            "console.inventoryDescription": "Products, stock, pricing, and promotions.",
            "console.financeDescription": "Ledger, AR/AP, payments, and tax.",
            "console.posDescription": "Counter sales, catering orders, and shifts.",
            "console.defaultDescription": `Workspace for ${values?.module ?? ""}.`,
            "common.open": "Open",
            "common.install": "Install",
            "modules.organization": "Organization",
            "modules.profile": "Profile",
            "modules.partners": "Partners",
            "modules.platformSettings": "Platform Settings",
            "modules.moduleManager": "Module Manager",
            "modules.apiKeys": "API Keys",
            // ModulesView uses the namespaced organization.modules.* dictionary;
            // the namespace argument is dropped by this mock, so bare keys land here.
            "eyebrow": "Module Manager",
            "title": `${values?.company ?? ""} Modules`,
            "fallbackTitle": "Select a company context",
            "subtitle": "Enable or disable core business modules for this company. Enabling a module grants access to authorized memberships.",
            "availableTitle": "Available Modules",
            "active": "Active",
            "disabled": "Disabled",
            "description": `Manage ${values?.module ?? ""} operations, analytics, and tenant database mappings.`,
            "enable": "Enable Module",
            "disable": "Disable Module",
            "enableAria": `Enable ${values?.module ?? ""} module`,
            "disableAria": `Disable ${values?.module ?? ""} module`,
        }

        return labels[key] ?? key
    },
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
            is_developer: false,
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
            enabled: [] as string[],
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
        updateCurrentProfile: vi.fn(),
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
        expect(screen.getByRole("heading", { name: "API Keys" })).toBeInTheDocument()
        expect(
            screen
                .getAllByRole("link", { name: /Open/ })
                .some((link) => link.getAttribute("href") === "/organization/modules"),
        ).toBe(true)
    })

    it("shows installed applications before console utilities", () => {
        mockSession({
            modules: {
                ...baseSession().modules,
                enabled: ["inventory"],
            },
        })

        render(<ConsolePage />)

        const applicationsHeading = screen.getByRole("heading", { name: "Applications" })
        const consoleHeading = screen.getByRole("heading", { name: "Console" })

        expect(applicationsHeading.compareDocumentPosition(consoleHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
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
