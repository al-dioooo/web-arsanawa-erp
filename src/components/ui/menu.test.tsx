import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Menu, MenuItem, MenuSection, MenuSeparator, usePopover } from "@/components/ui/menu"

function MenuHarness({ onSelect = () => {} }: { onSelect?: (value: string) => void }) {
    const { open, setOpen, triggerProps, containerRef } = usePopover()

    return (
        <div>
            <button type="button">Outside</button>
            <div className="relative" ref={containerRef}>
                <button type="button" {...triggerProps}>
                    Open menu
                </button>
                <Menu open={open} onClose={() => setOpen(false)} align="end" aria-label="Account">
                    <MenuSection label="Account">
                        <MenuItem icon="manage_accounts" onSelect={() => onSelect("profile")}>
                            Profile
                        </MenuItem>
                        <MenuItem selected onSelect={() => onSelect("console")}>
                            Console
                        </MenuItem>
                    </MenuSection>
                    <MenuSeparator />
                    <MenuItem href="/platform/settings" onSelect={() => onSelect("settings")}>
                        Settings
                    </MenuItem>
                    <MenuItem destructive onSelect={() => onSelect("sign-out")}>
                        Sign out
                    </MenuItem>
                </Menu>
            </div>
        </div>
    )
}

describe("usePopover + Menu", () => {
    it("opens from the trigger with menu semantics", () => {
        render(<MenuHarness />)

        const trigger = screen.getByRole("button", { name: "Open menu" })
        expect(trigger).toHaveAttribute("aria-haspopup", "menu")
        expect(trigger).toHaveAttribute("aria-expanded", "false")
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()

        fireEvent.click(trigger)

        expect(trigger).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByRole("menu")).toBeInTheDocument()
        expect(screen.getAllByRole("menuitem")).toHaveLength(4)
    })

    it("closes on outside click but not on clicks inside the container", () => {
        render(<MenuHarness />)
        fireEvent.click(screen.getByRole("button", { name: "Open menu" }))

        fireEvent.mouseDown(screen.getByRole("menu"))
        expect(screen.getByRole("menu")).toBeInTheDocument()

        fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }))
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false")
    })

    it("closes on Escape", () => {
        render(<MenuHarness />)
        fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
        expect(screen.getByRole("menu")).toBeInTheDocument()

        fireEvent.keyDown(document, { key: "Escape" })
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })

    it("runs onSelect and closes the menu when an item is chosen", () => {
        const onSelect = vi.fn()
        render(<MenuHarness onSelect={onSelect} />)
        fireEvent.click(screen.getByRole("button", { name: "Open menu" }))

        fireEvent.click(screen.getByRole("menuitem", { name: "Profile" }))

        expect(onSelect).toHaveBeenCalledWith("profile")
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })

    it("renders href items as links and styles selected/destructive items", () => {
        render(<MenuHarness />)
        fireEvent.click(screen.getByRole("button", { name: "Open menu" }))

        const link = screen.getByRole("menuitem", { name: "Settings" })
        expect(link.tagName).toBe("A")
        expect(link).toHaveAttribute("href", "/platform/settings")

        expect(screen.getByRole("menuitem", { name: "Console" })).toHaveClass("text-brand-ink")
        expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveClass("text-error", "hover:bg-error-soft")
    })

    it("renders section labels and separators", () => {
        render(<MenuHarness />)
        fireEvent.click(screen.getByRole("button", { name: "Open menu" }))

        expect(screen.getByRole("group", { name: "Account" })).toBeInTheDocument()
        expect(screen.getByText("Account")).toHaveClass("uppercase", "text-ink-faint")
        expect(screen.getByRole("separator")).toHaveClass("border-t", "border-line")
    })
})
