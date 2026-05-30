import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ModuleLauncher } from "@/components/app-shell/launcher"
import { useSession } from "@/features/auth/session-provider"

vi.mock("next/navigation", () => ({
    usePathname: () => "/",
}))

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => {
        const labels: Record<string, string> = {
            "launcher.button": "App Launcher",
            "launcher.applications": "Applications",
            "launcher.console": "Console",
            "modules.organization": "Organization",
            "modules.profile": "Profile",
            "modules.partners": "Partners",
            "modules.platformSettings": "Platform Settings",
            "modules.moduleManager": "Module Manager",
            "modules.apiKeys": "API Keys",
        }

        return labels[key] ?? key
    },
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

function mockSession(enabledModules: string[] = ["inventory", "pos"]) {
    vi.mocked(useSession).mockReturnValue({
        modules: {
            enabled: enabledModules,
            available: ["inventory", "finance", "pos"],
            company: null,
        },
        organizationContext: {
            company: {
                id: 1,
                name: "SEKALORI Catering",
                slug: "sekalori",
                legal_name: null,
                tax_identifier: null,
                status: "active",
            },
            branches: [],
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
        activeCompanyId: 1,
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
        user: {
            id: 1,
            name: "Alice Evergarden",
            username: "aliceevr",
            email: "hello@al.is-a.dev",
            email_verified_at: null,
            is_developer: false,
        },
    } as ReturnType<typeof useSession>)
}

describe("ModuleLauncher", () => {
    beforeEach(() => {
        mockSession()
    })

    it("prioritizes installed applications before console utilities", () => {
        render(<ModuleLauncher />)

        fireEvent.click(screen.getByRole("button", { name: "App Launcher" }))

        const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)
        expect(headings.indexOf("Applications")).toBeLessThan(headings.indexOf("Console"))
        expect(screen.getByRole("link", { name: /Inventory/ })).toHaveAttribute("href", "/inventory/catalogue")
        expect(screen.getByRole("link", { name: /Point of Sale/ })).toHaveAttribute("href", "/pos")
        expect(screen.getByRole("link", { name: /Organization/ })).toHaveAttribute("href", "/organization/companies")
        expect(screen.getByRole("link", { name: /API Keys/ })).toHaveAttribute("href", "/organization/api-keys")
    })

    it("hides company-scoped console utilities when no organization is active", () => {
        mockSession([])
        vi.mocked(useSession).mockReturnValue({
            ...vi.mocked(useSession).mock.results.at(-1)?.value,
            activeCompanyId: null,
            companies: [],
            organizationContext: {
                company: null,
                branches: [],
                membership: null,
            },
        } as ReturnType<typeof useSession>)

        render(<ModuleLauncher />)

        fireEvent.click(screen.getByRole("button", { name: "App Launcher" }))

        expect(screen.getByRole("link", { name: /Organization/ })).toBeInTheDocument()
        expect(screen.getByRole("link", { name: /Profile/ })).toBeInTheDocument()
        expect(screen.queryByRole("link", { name: /Partners/ })).not.toBeInTheDocument()
        expect(screen.queryByRole("link", { name: /Platform Settings/ })).not.toBeInTheDocument()
        expect(screen.queryByRole("link", { name: /API Keys/ })).not.toBeInTheDocument()
    })
})
