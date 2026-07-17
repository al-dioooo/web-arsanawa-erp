import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EmptyState } from "@/components/ui/empty-state"

describe("EmptyState", () => {
    it("renders title, description and action slot", () => {
        render(
            <EmptyState
                title="No products yet"
                description="Add your first product to start tracking stock."
                action={<button type="button">Add product</button>}
            />,
        )

        expect(screen.getByRole("heading", { name: "No products yet" })).toHaveClass("type-section")

        const description = screen.getByText("Add your first product to start tracking stock.")
        expect(description).toHaveClass("text-sm", "text-ink-muted", "max-w-sm")

        expect(screen.getByRole("button", { name: "Add product" })).toBeInTheDocument()
    })

    it("renders a decorative icon bubble when an icon is given", () => {
        const { container } = render(<EmptyState icon="search_off" title="No results" />)

        const bubble = container.querySelector(".rounded-pill")

        expect(bubble).not.toBeNull()
        expect(bubble).toHaveClass("size-12", "bg-surface-muted", "text-ink-faint")

        const svg = bubble?.querySelector("svg")
        expect(svg).not.toBeNull()
        expect(svg).toHaveAttribute("aria-hidden", "true")
    })

    it("omits optional slots when not provided", () => {
        const { container } = render(<EmptyState title="Nothing here" />)

        expect(container.querySelector("svg")).toBeNull()
        expect(container.querySelector("p")).toBeNull()
    })

    it("uses py-12 by default and py-8 when compact", () => {
        const { container, rerender } = render(<EmptyState title="Empty" />)

        expect(container.firstElementChild).toHaveClass("py-12")

        rerender(<EmptyState title="Empty" compact />)

        expect(container.firstElementChild).toHaveClass("py-8")
        expect(container.firstElementChild).not.toHaveClass("py-12")
    })
})
