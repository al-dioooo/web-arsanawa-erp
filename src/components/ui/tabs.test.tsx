import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useState } from "react"
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs"

function TabsHarness({ variant }: { variant?: "underline" | "segmented" }) {
    const [value, setValue] = useState("one")

    return (
        <Tabs value={value} onValueChange={setValue}>
            <TabList aria-label="Sections" variant={variant}>
                <Tab value="one">One</Tab>
                <Tab value="two">Two</Tab>
                <Tab value="three">Three</Tab>
            </TabList>
            <TabPanel value="one">First panel</TabPanel>
            <TabPanel value="two">Second panel</TabPanel>
            <TabPanel value="three">Third panel</TabPanel>
        </Tabs>
    )
}

describe("Tabs", () => {
    it("exposes tablist/tab/tabpanel semantics with id wiring", () => {
        render(<TabsHarness />)

        expect(screen.getByRole("tablist", { name: "Sections" })).toBeInTheDocument()
        expect(screen.getAllByRole("tab")).toHaveLength(3)

        const activeTab = screen.getByRole("tab", { name: "One", selected: true })
        const panel = screen.getByRole("tabpanel")
        expect(panel).toHaveTextContent("First panel")
        expect(activeTab).toHaveAttribute("aria-controls", panel.id)
        expect(panel).toHaveAttribute("aria-labelledby", activeTab.id)

        // Roving tabindex: only the active tab is in the tab order.
        expect(activeTab).toHaveAttribute("tabindex", "0")
        expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("tabindex", "-1")
    })

    it("switches panels on click", () => {
        render(<TabsHarness />)

        fireEvent.click(screen.getByRole("tab", { name: "Two" }))

        expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true")
        expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "false")
        expect(screen.getByRole("tabpanel")).toHaveTextContent("Second panel")
        expect(screen.getByText("First panel")).not.toBeVisible()
    })

    it("moves focus and selection with arrow keys, wrapping at the edges", () => {
        render(<TabsHarness />)

        const first = screen.getByRole("tab", { name: "One" })
        first.focus()

        fireEvent.keyDown(first, { key: "ArrowRight" })
        const second = screen.getByRole("tab", { name: "Two" })
        expect(second).toHaveFocus()
        expect(second).toHaveAttribute("aria-selected", "true")
        expect(screen.getByRole("tabpanel")).toHaveTextContent("Second panel")

        fireEvent.keyDown(second, { key: "ArrowLeft" })
        expect(screen.getByRole("tab", { name: "One" })).toHaveFocus()

        // Wraps backwards from the first tab to the last.
        fireEvent.keyDown(screen.getByRole("tab", { name: "One" }), { key: "ArrowLeft" })
        expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus()
        expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("aria-selected", "true")
    })

    it("jumps to the first and last tab with Home and End", () => {
        render(<TabsHarness />)

        const first = screen.getByRole("tab", { name: "One" })
        first.focus()

        fireEvent.keyDown(first, { key: "End" })
        expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus()
        expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("aria-selected", "true")

        fireEvent.keyDown(screen.getByRole("tab", { name: "Three" }), { key: "Home" })
        expect(screen.getByRole("tab", { name: "One" })).toHaveFocus()
        expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true")
    })

    it("renders the underline variant by default", () => {
        render(<TabsHarness />)

        expect(screen.getByRole("tablist")).toHaveClass("border-b", "border-line")
        expect(screen.getByRole("tab", { name: "One", selected: true })).toHaveClass("text-brand-ink", "pb-2")
        expect(screen.getByRole("tab", { name: "Two" })).toHaveClass("text-ink-muted")
    })

    it("renders the segmented variant", () => {
        render(<TabsHarness variant="segmented" />)

        expect(screen.getByRole("tablist")).toHaveClass("bg-surface-muted", "rounded-md", "p-1")
        expect(screen.getByRole("tab", { name: "One", selected: true })).toHaveClass(
            "bg-surface",
            "text-brand-ink",
            "shadow-card",
            "rounded-sm",
        )
        expect(screen.getByRole("tab", { name: "Two" })).toHaveClass("text-ink-muted")
    })
})
