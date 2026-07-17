import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BranchSwitcher } from "@/components/app-shell/branch-switcher"
import { useSession } from "@/features/auth/session-provider"

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

function mockSession(overrides: { branches?: Array<{ id: number; name: string; code: string }>; activeBranchId?: number | null } = {}) {
    const branches = overrides.branches ?? [
        { id: 1, name: "Main Branch", code: "MAIN" },
        { id: 2, name: "Harbour Branch", code: "HRB" },
    ]
    const value = {
        activeBranchId: overrides.activeBranchId === undefined ? 1 : overrides.activeBranchId,
        organizationContext: { branches },
        selectBranch: vi.fn(),
    }
    vi.mocked(useSession).mockReturnValue(value as unknown as ReturnType<typeof useSession>)
    return value
}

describe("BranchSwitcher", () => {
    beforeEach(() => {
        mockSession()
    })

    it("labels the trigger with the active branch", () => {
        render(<BranchSwitcher />)

        const trigger = screen.getByRole("button", { name: /Main Branch/ })
        expect(trigger).toHaveAttribute("aria-haspopup", "menu")
        expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    it("falls back to the select-branch label without an active branch", () => {
        mockSession({ activeBranchId: null })

        render(<BranchSwitcher />)

        expect(screen.getByRole("button", { name: /shell\.selectBranch/ })).toBeInTheDocument()
    })

    it("opens the menu, marks the active branch, and selects another", () => {
        const session = mockSession()

        render(<BranchSwitcher />)
        fireEvent.click(screen.getByRole("button", { name: /Main Branch/ }))

        const menu = screen.getByRole("menu", { name: "shell.switchBranch" })
        expect(within(menu).getByRole("group", { name: "shell.switchBranch" })).toBeInTheDocument()
        expect(within(menu).getAllByRole("menuitem")).toHaveLength(2)
        expect(within(menu).getByRole("menuitem", { name: /Main Branch/ })).toHaveClass("text-brand-ink")

        fireEvent.click(within(menu).getByRole("menuitem", { name: /Harbour Branch/ }))

        expect(session.selectBranch).toHaveBeenCalledWith(2)
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })

    it("shows an empty state when no branches exist", () => {
        mockSession({ branches: [], activeBranchId: null })

        render(<BranchSwitcher />)
        fireEvent.click(screen.getByRole("button", { name: /shell\.selectBranch/ }))

        expect(screen.getByText("shell.noBranches")).toBeInTheDocument()
        expect(screen.queryByRole("menuitem")).not.toBeInTheDocument()
    })

    it("closes on Escape", () => {
        render(<BranchSwitcher />)
        fireEvent.click(screen.getByRole("button", { name: /Main Branch/ }))
        expect(screen.getByRole("menu")).toBeInTheDocument()

        fireEvent.keyDown(document, { key: "Escape" })
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })
})
