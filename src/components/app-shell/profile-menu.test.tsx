import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProfileMenu } from "@/components/app-shell/profile-menu"
import { useSession } from "@/features/auth/session-provider"
import { setUserLocale } from "@/actions/locale"

const navigationState = vi.hoisted(() => ({
    pathname: "/",
    push: vi.fn(),
    refresh: vi.fn(),
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
    useTranslations: () => (key: string) => key,
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

function mockSession(overrides: { avatar?: string | null; companies?: number } = {}) {
    const companyCount = overrides.companies ?? 1
    const value = {
        user: {
            id: 1,
            name: "Alice Evergarden",
            email: "hello@al.is-a.dev",
        },
        profile: {
            profile: {
                display_name: "Alice Profile",
                avatar: overrides.avatar ?? null,
            },
        },
        companies: Array.from({ length: companyCount }, (_, index) => ({
            company: { id: index + 1, name: `Company ${index + 1}` },
            membership: { id: index + 1 },
        })),
        activeCompanyId: 1,
        selectCompany: vi.fn(),
        logout: vi.fn(),
    }
    vi.mocked(useSession).mockReturnValue(value as unknown as ReturnType<typeof useSession>)
    return value
}

function openMenu() {
    fireEvent.click(screen.getByRole("button", { name: "shell.accountMenu" }))
    return screen.getByRole("menu", { name: "shell.accountMenu" })
}

describe("ProfileMenu", () => {
    beforeEach(() => {
        navigationState.pathname = "/"
        navigationState.push.mockReset()
        navigationState.refresh.mockReset()
        themeState.theme = "system"
        themeState.setTheme.mockReset()
        vi.mocked(setUserLocale).mockReset()
        mockSession()
    })

    it("shows the display-name initial when no avatar is set", () => {
        render(<ProfileMenu />)

        expect(screen.getByRole("button", { name: "shell.accountMenu" })).toHaveTextContent("A")
    })

    it("shows the avatar image when set", () => {
        mockSession({ avatar: "https://example.com/avatar.png" })

        render(<ProfileMenu />)

        expect(screen.getByRole("img", { name: "Alice Profile" })).toHaveAttribute(
            "src",
            "https://example.com/avatar.png",
        )
    })

    it("renders the account header, appearance, language, links, and sign out", () => {
        render(<ProfileMenu />)
        const menu = openMenu()

        expect(within(menu).getByText("Alice Profile")).toBeInTheDocument()
        expect(within(menu).getByText("hello@al.is-a.dev")).toBeInTheDocument()

        // Appearance section hosts the theme toggle radiogroup
        expect(within(menu).getByRole("group", { name: "shell.appearance" })).toBeInTheDocument()
        expect(within(menu).getAllByRole("radio")).toHaveLength(3)

        // Language segmented control
        expect(within(menu).getByRole("group", { name: "shell.language" })).toBeInTheDocument()
        expect(within(menu).getByRole("menuitemradio", { name: "Indonesia" })).toHaveAttribute("aria-checked", "true")

        expect(within(menu).getByRole("menuitem", { name: /shell\.goToConsole/ })).toHaveAttribute("href", "/")
        expect(within(menu).getByRole("menuitem", { name: /shell\.profileSettings/ })).toHaveAttribute("href", "/profile")
        expect(within(menu).getByRole("menuitem", { name: /shell\.platformSettings/ })).toHaveAttribute(
            "href",
            "/platform/settings",
        )
        expect(within(menu).getByRole("menuitem", { name: "shell.signOut" })).toHaveClass("text-error")
    })

    it("changes the theme from the appearance section", () => {
        render(<ProfileMenu />)
        const menu = openMenu()

        fireEvent.click(within(menu).getByRole("radio", { name: "themeDark" }))

        expect(themeState.setTheme).toHaveBeenCalledWith("dark")
    })

    it("changes the locale from the language section", async () => {
        render(<ProfileMenu />)
        const menu = openMenu()

        fireEvent.click(within(menu).getByRole("menuitemradio", { name: "English" }))

        await waitFor(() => expect(setUserLocale).toHaveBeenCalledWith("en"))
        await waitFor(() => expect(navigationState.refresh).toHaveBeenCalled())
    })

    it("hides the organization section for a single company", () => {
        render(<ProfileMenu />)
        const menu = openMenu()

        expect(within(menu).queryByRole("group", { name: "shell.switchOrganization" })).not.toBeInTheDocument()
    })

    it("switches organizations and returns to the console", async () => {
        const session = mockSession({ companies: 2 })

        render(<ProfileMenu />)
        const menu = openMenu()

        expect(within(menu).getByRole("group", { name: "shell.switchOrganization" })).toBeInTheDocument()
        fireEvent.click(within(menu).getByRole("menuitem", { name: /Company 2/ }))

        expect(session.selectCompany).toHaveBeenCalledWith(2)
        await waitFor(() => expect(navigationState.push).toHaveBeenCalledWith("/"))
    })

    it("signs out and redirects to the login page", async () => {
        const session = mockSession()

        render(<ProfileMenu />)
        const menu = openMenu()

        fireEvent.click(within(menu).getByRole("menuitem", { name: "shell.signOut" }))

        expect(session.logout).toHaveBeenCalled()
        await waitFor(() => expect(navigationState.push).toHaveBeenCalledWith("/login"))
    })
})
