import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppShell } from "@/components/app-shell/app-shell"
import { useSession } from "@/features/auth/session-provider"

const navigationState = vi.hoisted(() => ({
    pathname: "/pos/reports",
    push: vi.fn(),
    refresh: vi.fn(),
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

vi.mock("@/lib/search/command-palette-context", () => ({
    useCommandPalette: () => ({ open: vi.fn() }),
}))

function mockSession() {
    vi.mocked(useSession).mockReturnValue({
        user: {
            id: 1,
            name: "Alice Evergarden",
            username: "aliceevr",
            email: "hello@al.is-a.dev",
            email_verified_at: null,
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
        activeCompanyId: 1,
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
        isAuthenticated: true,
        isLoading: false,
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
        mockSession()
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
})
