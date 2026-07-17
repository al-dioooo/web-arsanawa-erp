import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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

const themeState = vi.hoisted(() => ({
    theme: "system" as string | undefined,
    setTheme: vi.fn(),
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
    useTranslations: () => {
        const labels: Record<string, string> = {
            "finance.nav.bills": "Bills",
            "finance.nav.transactions": "Transactions",
            "pos.nav.register": "Kasir",
            "pos.nav.shifts": "Shift",
            "pos.nav.sales": "Penjualan",
            "pos.nav.registers": "Register",
            "pos.nav.reports": "Laporan",
            "inventory.nav.products": "Products",
            "inventory.nav.pricing": "Pricing",
            "inventory.nav.promotions": "Promotions",
            "inventory.nav.newIssue": "New Issue",
            "inventory.nav.newTransfer": "New Transfer",
        }

        const translate = (key: string) => labels[key] ?? key

        return Object.assign(translate, {
            rich: (key: string) => labels[key] ?? key,
        })
    },
}))

vi.mock("@/actions/locale", () => ({
    setUserLocale: vi.fn(),
}))

vi.mock("next-themes", () => ({
    useTheme: () => ({ theme: themeState.theme, setTheme: themeState.setTheme }),
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
    companySlug?: string
    companies?: number
} = {}) {
    const companyCount = overrides.companies ?? 1
    const value = {
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
        companies: Array.from({ length: companyCount }, (_, index) => ({
            company: {
                id: index + 1,
                name: index === 0 ? "SEKALORI Catering" : `Company ${index + 1}`,
                slug: index === 0 ? (overrides.companySlug ?? "demo-company") : `company-${index + 1}`,
                legal_name: null,
                tax_identifier: null,
                status: "active",
            },
            membership: {
                id: index + 1,
                company_id: index + 1,
                user_id: 1,
                branch_id: 1,
                role: "owner",
                status: "active",
                joined_at: null,
            },
        })),
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
                {
                    id: 2,
                    company_id: 1,
                    name: "Harbour Branch",
                    code: "HRB",
                    is_primary: false,
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
    }

    vi.mocked(useSession).mockReturnValue(value as unknown as ReturnType<typeof useSession>)
    return value
}

describe("AppShell", () => {
    beforeEach(() => {
        navigationState.pathname = "/pos/reports"
        navigationState.push.mockReset()
        navigationState.refresh.mockReset()
        themeState.theme = "system"
        themeState.setTheme.mockReset()
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

    describe("module sidebar", () => {
        it("activates the most specific POS sidebar item for nested routes", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            const reports = screen.getByRole("link", { name: /Laporan/ })
            expect(reports).toHaveClass("text-white")
            expect(reports).toHaveAttribute("aria-current", "page")
            expect(screen.getByRole("link", { name: /Dashboard/ })).not.toHaveClass("text-white")
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

        it("activates the dashboard link on the inventory module root", () => {
            navigationState.pathname = "/inventory"

            render(
                <AppShell>
                    <div>Inventory dashboard</div>
                </AppShell>,
            )

            expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveClass("text-white")
        })

        it("activates the dashboard link on the finance module root", () => {
            navigationState.pathname = "/finance"

            render(
                <AppShell>
                    <div>Finance dashboard</div>
                </AppShell>,
            )

            expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveClass("text-white")
        })

        it("does not duplicate the POS root route as register navigation", () => {
            navigationState.pathname = "/pos"

            render(
                <AppShell>
                    <div>POS dashboard</div>
                </AppShell>,
            )

            const rootLinks = screen
                .getAllByRole("link")
                .filter((link) => link.closest("[data-module-sidebar-nav]") && link.getAttribute("href") === "/pos")

            expect(rootLinks).toHaveLength(1)
            expect(rootLinks[0]).toHaveTextContent("Dashboard")
            expect(screen.queryByRole("link", { name: /Kasir/ })).not.toBeInTheDocument()
        })

        it("shows the session user with role in the sidebar user block linking to the profile", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            const userBlock = screen
                .getAllByRole("link")
                .find((link) => link.getAttribute("href") === "/profile" && link.textContent?.includes("Alice Profile"))
            expect(userBlock).toBeDefined()
            expect(userBlock).toHaveTextContent("Owner")
        })

        it("pins Settings and a destructive Sign out into the sidebar footer", () => {
            const session = mockSession()

            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            const aside = document.querySelector("aside")!
            const settings = within(aside).getByRole("link", { name: "shell.platformSettings" })
            expect(settings).toHaveAttribute("href", "/platform/settings")

            const signOut = within(aside).getByRole("button", { name: "shell.signOut" })
            expect(signOut).toHaveClass("text-error")

            fireEvent.click(signOut)
            expect(session.logout).toHaveBeenCalled()
        })

        it("hides operational POS and stock navigation but keeps pricing and promotions for SEKALORI catering-only mode", () => {
            mockSession({ companySlug: "sekalori" })
            navigationState.pathname = "/pos/sales"

            const { unmount } = render(
                <AppShell>
                    <div>Sales page</div>
                </AppShell>,
            )

            expect(screen.queryByRole("link", { name: /Shift/ })).not.toBeInTheDocument()
            expect(screen.queryByRole("link", { name: /Register/ })).not.toBeInTheDocument()
            expect(screen.queryByRole("link", { name: /Laporan/ })).not.toBeInTheDocument()
            expect(screen.getByRole("link", { name: /Penjualan/ })).toBeInTheDocument()
            unmount()

            navigationState.pathname = "/inventory"
            render(
                <AppShell>
                    <div>Inventory page</div>
                </AppShell>,
            )

            expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument()
            expect(screen.getByRole("link", { name: "Promotions" })).toBeInTheDocument()
            expect(screen.queryByRole("link", { name: "New Issue" })).not.toBeInTheDocument()
            expect(screen.queryByRole("link", { name: "New Transfer" })).not.toBeInTheDocument()
            expect(screen.getByRole("link", { name: "Products" })).toBeInTheDocument()
        })
    })

    describe("mobile drawer", () => {
        it("opens from the topbar hamburger and closes from the backdrop", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            const aside = document.querySelector("aside")!
            expect(aside).toHaveClass("-translate-x-full")

            fireEvent.click(screen.getByRole("button", { name: "shell.openSidebar" }))
            expect(aside).toHaveClass("translate-x-0")
            expect(aside).not.toHaveClass("-translate-x-full")

            const backdrop = document.querySelector(".bg-overlay")
            expect(backdrop).not.toBeNull()
            fireEvent.click(backdrop!)
            expect(aside).toHaveClass("-translate-x-full")
        })

        it("closes from the sidebar close button", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            const aside = document.querySelector("aside")!
            fireEvent.click(screen.getByRole("button", { name: "shell.openSidebar" }))
            expect(aside).toHaveClass("translate-x-0")

            fireEvent.click(screen.getByRole("button", { name: "shell.closeSidebar" }))
            expect(aside).toHaveClass("-translate-x-full")
        })
    })

    describe("branch switcher", () => {
        it("opens, lists branches, and selects one", () => {
            const session = mockSession()

            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            const trigger = screen.getByRole("button", { name: /Main Branch/ })
            expect(trigger).toHaveAttribute("aria-haspopup", "menu")

            fireEvent.click(trigger)
            const menu = screen.getByRole("menu", { name: "shell.switchBranch" })
            expect(within(menu).getAllByRole("menuitem")).toHaveLength(2)

            fireEvent.click(within(menu).getByRole("menuitem", { name: /Harbour Branch/ }))
            expect(session.selectBranch).toHaveBeenCalledWith(2)
            expect(screen.queryByRole("menu", { name: "shell.switchBranch" })).not.toBeInTheDocument()
        })

        it("closes on Escape without selecting", () => {
            const session = mockSession()

            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            fireEvent.click(screen.getByRole("button", { name: /Main Branch/ }))
            expect(screen.getByRole("menu", { name: "shell.switchBranch" })).toBeInTheDocument()

            fireEvent.keyDown(document, { key: "Escape" })
            expect(screen.queryByRole("menu", { name: "shell.switchBranch" })).not.toBeInTheDocument()
            expect(session.selectBranch).not.toHaveBeenCalled()
        })
    })

    describe("profile menu", () => {
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

        it("uses the current session profile display name in the account menu", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            fireEvent.click(screen.getByRole("button", { name: "shell.accountMenu" }))

            const menu = screen.getByRole("menu", { name: "shell.accountMenu" })
            expect(within(menu).getByText("Alice Profile")).toBeInTheDocument()
            expect(within(menu).queryByText("Alice Evergarden")).not.toBeInTheDocument()
            expect(within(menu).getByText("hello@al.is-a.dev")).toBeInTheDocument()
        })

        it("renders an appearance section with the theme toggle", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            fireEvent.click(screen.getByRole("button", { name: "shell.accountMenu" }))

            expect(screen.getByRole("group", { name: "shell.appearance" })).toBeInTheDocument()
            const radiogroup = screen.getByRole("radiogroup", { name: "appearance" })
            expect(within(radiogroup).getAllByRole("radio")).toHaveLength(3)

            fireEvent.click(within(radiogroup).getByRole("radio", { name: "themeDark" }))
            expect(themeState.setTheme).toHaveBeenCalledWith("dark")
        })

        it("keeps console, profile, platform links and a destructive sign out", async () => {
            const session = mockSession()

            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            fireEvent.click(screen.getByRole("button", { name: "shell.accountMenu" }))
            const menu = screen.getByRole("menu", { name: "shell.accountMenu" })

            expect(within(menu).getByRole("menuitem", { name: "shell.goToConsole" })).toHaveAttribute("href", "/")
            expect(within(menu).getByRole("menuitem", { name: "shell.profileSettings" })).toHaveAttribute("href", "/profile")
            expect(within(menu).getByRole("menuitem", { name: "shell.platformSettings" })).toHaveAttribute(
                "href",
                "/platform/settings",
            )

            const signOut = within(menu).getByRole("menuitem", { name: "shell.signOut" })
            expect(signOut).toHaveClass("text-error")

            fireEvent.click(signOut)
            expect(session.logout).toHaveBeenCalled()
            await waitFor(() => expect(navigationState.push).toHaveBeenCalledWith("/login"))
        })

        it("switches organizations and drops back to the console", async () => {
            const session = mockSession({ companies: 2 })

            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            fireEvent.click(screen.getByRole("button", { name: "shell.accountMenu" }))
            const menu = screen.getByRole("menu", { name: "shell.accountMenu" })

            expect(within(menu).getByRole("group", { name: "shell.switchOrganization" })).toBeInTheDocument()
            fireEvent.click(within(menu).getByRole("menuitem", { name: /Company 2/ }))

            expect(session.selectCompany).toHaveBeenCalledWith(2)
            await waitFor(() => expect(navigationState.push).toHaveBeenCalledWith("/"))
        })

        it("hides the organization switcher for single-company users", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            fireEvent.click(screen.getByRole("button", { name: "shell.accountMenu" }))

            expect(screen.queryByRole("group", { name: "shell.switchOrganization" })).not.toBeInTheDocument()
        })
    })

    describe("API status dot", () => {
        it("shows a topbar API status dot with hoverable status labels", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            expect(screen.getByLabelText("API connection status: Active and ready")).toBeInTheDocument()
            expect(screen.getByRole("tooltip", { name: "Active and ready" })).toBeInTheDocument()
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

    describe("entitlement guard", () => {
        it("blocks module content when the module is not entitled", () => {
            navigationState.pathname = "/inventory"

            render(
                <AppShell>
                    <div>Inventory dashboard</div>
                </AppShell>,
            )

            expect(screen.getByText("shell.guard.title")).toBeInTheDocument()
            expect(screen.queryByText("Inventory dashboard")).not.toBeInTheDocument()
        })

        it("renders module content when the module is entitled", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            expect(screen.getByText("Reports page")).toBeInTheDocument()
        })
    })

    describe("topbar", () => {
        it("shows the console logo only outside module mode with a width-capped search trigger", () => {
            navigationState.pathname = "/"

            render(
                <AppShell>
                    <div>Console home</div>
                </AppShell>,
            )

            const logoLink = screen
                .getAllByRole("link")
                .find((link) => link.getAttribute("href") === "/" && link.querySelector("svg"))
            expect(logoLink).toBeDefined()
            expect(logoLink).toHaveClass("shrink-0")

            const search = screen.getByRole("button", { name: "shell.openSearch" })
            expect(search).toHaveClass("max-w-md")

            expect(screen.queryByRole("button", { name: "shell.openSidebar" })).not.toBeInTheDocument()
        })

        it("shows the hamburger instead of the logo in module mode", () => {
            render(
                <AppShell>
                    <div>Reports page</div>
                </AppShell>,
            )

            expect(screen.getByRole("button", { name: "shell.openSidebar" })).toBeInTheDocument()
        })
    })
})
