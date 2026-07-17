import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton"

describe("Skeleton", () => {
    it("renders a decorative pulsing bar hidden from assistive tech", () => {
        const { container } = render(<Skeleton className="h-4 w-24" />)

        const skeleton = container.firstElementChild

        expect(skeleton).toHaveAttribute("aria-hidden", "true")
        expect(skeleton).toHaveClass(
            "animate-pulse",
            "motion-reduce:animate-none",
            "rounded-sm",
            "bg-skeleton",
            "h-4",
            "w-24",
        )
    })
})

describe("SkeletonText", () => {
    it("stacks 3 bars by default with a shorter last line", () => {
        const { container } = render(<SkeletonText />)

        const wrapper = container.firstElementChild as HTMLElement
        const bars = wrapper.querySelectorAll('[data-slot="skeleton"]')

        expect(wrapper).toHaveAttribute("aria-hidden", "true")
        expect(bars).toHaveLength(3)
        expect(bars[bars.length - 1]).toHaveClass("w-2/3")
    })

    it("renders the requested number of lines with varying widths", () => {
        const { container } = render(<SkeletonText lines={5} />)

        const bars = [...container.querySelectorAll('[data-slot="skeleton"]')]

        expect(bars).toHaveLength(5)

        const widths = new Set(bars.map((bar) => [...bar.classList].find((c) => c.startsWith("w-"))))
        expect(widths.size).toBeGreaterThan(1)
    })
})

describe("SkeletonCard", () => {
    it("renders a card-shaped decorative block", () => {
        const { container } = render(<SkeletonCard />)

        const card = container.firstElementChild as HTMLElement

        expect(card).toHaveAttribute("aria-hidden", "true")
        expect(card).toHaveClass("rounded-lg", "bg-surface", "shadow-card", "p-5")
        expect(card.className).not.toMatch(/(^|\s)border(-|\s|$)/)
        expect(card.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    })
})
