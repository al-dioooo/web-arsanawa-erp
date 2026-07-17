import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Card, CardLabel, CardValue, cardVariants } from "@/components/ui/card"

describe("Card", () => {
    it("renders the DS card surface with default md padding", () => {
        render(<Card data-testid="card">Content</Card>)

        const card = screen.getByTestId("card")

        expect(card.tagName).toBe("DIV")
        expect(card).toHaveClass("rounded-lg", "bg-surface", "text-ink", "shadow-card", "p-5")
        expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("never emits a border class (cards elevate via shadow only)", () => {
        for (const padding of ["none", "sm", "md", "lg"] as const) {
            expect(cardVariants({ padding, hover: true })).not.toMatch(/(^|\s)border(-|\s|$)/)
            expect(cardVariants({ padding, inset: true })).not.toMatch(/(^|\s)border(-|\s|$)/)
        }
    })

    it("maps padding variants to spacing tokens", () => {
        expect(cardVariants({ padding: "none" })).not.toMatch(/(^|\s)p-\d/)
        expect(cardVariants({ padding: "sm" })).toContain("p-4")
        expect(cardVariants({ padding: "lg" })).toContain("p-6")
    })

    it("adds hover elevation via a shadow transition", () => {
        render(<Card data-testid="card" hover />)

        const card = screen.getByTestId("card")

        expect(card).toHaveClass("transition-shadow", "duration-200", "hover:shadow-card-hover")
    })

    it("renders inset cards as muted wells without elevation", () => {
        render(<Card data-testid="card" inset />)

        const card = screen.getByTestId("card")

        expect(card).toHaveClass("bg-surface-muted", "shadow-none")
        expect(card).not.toHaveClass("bg-surface")
        expect(card).not.toHaveClass("shadow-card")
    })

    it("supports a polymorphic as prop", () => {
        render(
            <Card as="section" aria-label="Stats">
                Stat content
            </Card>,
        )

        const card = screen.getByRole("region", { name: "Stats" })

        expect(card.tagName).toBe("SECTION")
        expect(card).toHaveClass("bg-surface", "rounded-lg")
    })

    it("merges consumer className last", () => {
        render(<Card data-testid="card" className="mt-4" />)

        expect(screen.getByTestId("card")).toHaveClass("mt-4", "bg-surface")
    })
})

describe("CardLabel / CardValue", () => {
    it("renders the label type role", () => {
        render(<CardLabel>Total Revenue</CardLabel>)

        expect(screen.getByText("Total Revenue")).toHaveClass("type-card-label")
    })

    it("renders the value type role with tabular figures", () => {
        render(<CardValue>Rp 1.250.000</CardValue>)

        const value = screen.getByText("Rp 1.250.000")

        expect(value).toHaveClass("type-card-value", "tabular-nums")
        expect(value).not.toHaveClass("text-[32px]")
    })

    it("bumps to 32px for the lg size", () => {
        render(<CardValue size="lg">42</CardValue>)

        expect(screen.getByText("42")).toHaveClass("type-card-value", "text-[32px]")
    })
})
