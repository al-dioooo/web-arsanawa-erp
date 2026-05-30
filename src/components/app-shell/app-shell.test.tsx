import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppShell } from "@/components/app-shell/app-shell"
import { useSession } from "@/features/auth/session-provider"
import { useIsFetching, useIsMutating } from "@tanstack/react-query"

const navigationState = vi.hoisted(() => ({
    pathname: "/pos/reports",
    push: vi.fn(),
    refresh: vi.fn(),
}))

const queryState = vi.hoisted(() => ({
    fetching: 0,
    mutating: 0,
}))

vi.mock("next/navigation", () => ({
    usePathname: () => navigationState.pathname,
    useRouter: () => ({
        push: navigationState.push,
        refresh: navigationState.refresh,
    }),
}))

vi.mock("next-intl", () => ({
    useLocale: () => "id",
    useTranslations: () => (key: string) => {
        const labels: Record<string, string> = {
            "pos.nav.register": "Kasir",
            "pos.nav.shifts": "Shift",
            "pos.nav.sales": "Penjualan",
            "pos.nav.registers": "Register",
            "pos.nav.reports": "Laporan",
        }

        return labels[key] ?? key
    },
}))

vi.mock("@/actions/locale", () => ({
    setUserLocale: vi.fn(),
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
    useIsFetching: vi.fn(() => queryState.fetching),
    useIsMutating: vi.fn(() => queryState.mutating),
}))

vi.mock("@/lib/search/command-palette-context", () => ({
    useCommandPalette: () => ({ open: vi.fn() }),
}))

function mockSession(overrides: {
    avatar?: string | null
    activeCompanyId?: number | null
    isLoading?: boolean
    isAuthenticated?: boolean
} = {}) {
    vi.mocked(useSession).mockReturnValue({
        user: {
            id: 1,
            name: "Alice Evergarden",
            username: "aliceevr",
            email: "hello@al.is-a.dev",
            email_verified_at: null,
        },
        profile: {
            id: 1,
            name: "Alice Evergarden",
            username: "aliceevr",
            email: "hello@al.is-a.dev",
            profile: {
                display_name: "Alice Profile",
                avatar: overrides.avatar ?? null,
                locale: "id",
                timezone: "Asia/Jakarta",
            },
            status: { status: "active" },
        },
        companies: [
            {
                company: {
                    id: 1,
                    name: "SEKALORI Catering",
                    slug: "sekalori",
                    legal_name: null,
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
                    joined_at: null,
                },
            },
        ],
        activeCompanyId: overrides.activeCompanyId === undefined ? 1 : overrides.activeCompanyId,
        activeBranchId: 1,
        organizationContext: {
            company: null,
            branches: [
                {
                    id: 1,
                    company_id: 1,
                    name: "Main Branch",
                    code: "MAIN",
                    is_primary: true,
                    status: "active",
                },
            ],
            membership: {
                id: 1,
                company_id: 1,
                user_id: 1,
                branch_id: 1,
                role: "owner",
                status: "active",
                joined_at: null,
            },
        },
        selectCompany: vi.fn(),
        selectBranch: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: overrides.isAuthenticated ?? true,
        isLoading: overrides.isLoading ?? false,
        error: null,
        fieldErrors: null,
        modules: {
            enabled: ["pos"],
            available: ["inventory", "finance", "pos"],
            company: null,
        },
    } as ReturnType<typeof useSession>)
}

describe("AppShell module sidebar", () => {
    beforeEach(() => {
        navigationState.pathname = "/pos/reports"
        navigationState.push.mockReset()
        navigationState.refresh.mockReset()
        queryState.fetching = 0
        queryState.mutating = 0
        vi.mocked(useIsFetching).mockImplementation(() => queryState.fetching)
        vi.mocked(useIsMutating).mockImplementation(() => queryState.mutating)
        Object.defineProperty(window.navigator, "onLine", {
            configurable: true,
            value: true,
        })
        mockSession()
    })

    it("renders the profile avatar URL in the account button", () => {
        mockSession({ avatar: "https://example.com/avatar.png" })

        render(
            <AppShell>
                <div>Reports page</div>
            </AppShell>,
        )

        expect(screen.getByRole("img", { name: "Alice Profile" })).toHaveAttribute(
            "src",
            "https://example.com/avatar.png",
        )
    })

    it("activates the most specific POS sidebar item for nested routes", () => {
        render(
            <AppShell>
                <div>Reports page</div>
            </AppShell>,
        )

        expect(screen.getByRole("link", { name: /Laporan/ })).toHaveStyle({ color: "#a37565" })
        expect(screen.getByRole("link", { name: /Kasir/ })).not.toHaveStyle({ color: "#a37565" })
    })

    it("uses the current session profile display name in the account menu", () => {
        render(
            <AppShell>
                <div>Reports page</div>
            </AppShell>,
        )

        fireEvent.click(screen.getByRole("button", { name: "shell.accountMenu" }))

        expect(screen.getByText("Alice Profile")).toBeInTheDocument()
        expect(screen.queryByText("Alice Evergarden")).not.toBeInTheDocument()
    })

    it("puts the module dashboard link first in the sidebar navigation", () => {
        render(
            <AppShell>
                <div>Reports page</div>
            </AppShell>,
        )

        const navLinks = screen.getAllByRole("link").filter((link) => link.closest("[data-module-sidebar-nav]"))

        expect(navLinks[0]).toHaveTextContent("Dashboard")
        expect(navLinks[0]).toHaveAttribute("href", "/pos")
    })

    it("shows a topbar API status dot with hoverable status labels", () => {
        render(
            <AppShell>
                <div>Reports page</div>
            </AppShell>,
        )

        expect(screen.getByLabelText("API connection status: Active and ready")).toBeInTheDocument()
        expect(screen.getByText("Active and ready")).toBeInTheDocument()
    })

    it("marks the API status dot as loading while queries are active", () => {
        queryState.fetching = 1

        render(
            <AppShell>
                <div>Reports page</div>
            </AppShell>,
        )

        expect(screen.getByLabelText("API connection status: Loading")).toBeInTheDocument()
    })

    it("marks the API status dot as offline when the browser is offline", () => {
        Object.defineProperty(window.navigator, "onLine", {
            configurable: true,
            value: false,
        })

        render(
            <AppShell>
                <div>Reports page</div>
            </AppShell>,
        )

        expect(screen.getByLabelText("API connection status: Offline")).toBeInTheDocument()
    })

    it("marks the API status dot as inactive without an active company", () => {
        mockSession({ activeCompanyId: null })

        render(
            <AppShell>
                <div>Reports page</div>
            </AppShell>,
        )

        expect(screen.getByLabelText("API connection status: Inactive")).toBeInTheDocument()
    })
})
