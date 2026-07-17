import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FilterBar } from "@/components/ui/filter-bar"

describe("FilterBar", () => {
    it("renders a borderless DS card shell that wraps its filter controls", () => {
        const { container } = render(
            <FilterBar>
                <input aria-label="Search" />
            </FilterBar>,
        )

        const shell = container.firstElementChild

        expect(shell?.tagName).toBe("SECTION")
        expect(shell).toHaveClass(
            "rounded-lg",
            "bg-surface",
            "shadow-card",
            "p-4",
            "md:p-5",
            "flex",
            "flex-wrap",
            "items-center",
            "gap-3",
        )
        expect(shell?.className).not.toMatch(/(^|\s)border(-|\s|$)/)
        expect(screen.getByLabelText("Search")).toBeInTheDocument()
    })

    it("right-aligns the optional end slot", () => {
        render(
            <FilterBar end={<button type="button">Export</button>}>
                <input aria-label="Search" />
            </FilterBar>,
        )

        const endSlot = screen.getByRole("button", { name: "Export" }).parentElement

        expect(endSlot).toHaveClass("ms-auto")
    })

    it("omits the end slot wrapper when no end content is given", () => {
        const { container } = render(
            <FilterBar>
                <input aria-label="Search" />
            </FilterBar>,
        )

        expect(container.querySelector(".ms-auto")).toBeNull()
    })
})
