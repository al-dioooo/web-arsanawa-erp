import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatusPill } from "@/components/ui/status-pill"

describe("StatusPill", () => {
    it("renders a borderless DS pill", () => {
        render(<StatusPill tone="green">Paid</StatusPill>)

        const pill = screen.getByText("Paid")

        expect(pill).toHaveClass(
            "inline-flex",
            "min-h-6",
            "items-center",
            "gap-1",
            "rounded-pill",
            "px-2.5",
            "text-xs",
            "font-semibold",
            "whitespace-nowrap",
        )
        expect(pill.className).not.toMatch(/(^|\s)border(-|\s|$)/)
    })

    it("maps status tones to soft background + strong text tokens", () => {
        const cases = [
            { tone: "green", label: "Paid", classes: ["bg-success-soft", "text-success-strong"] },
            { tone: "amber", label: "Draft", classes: ["bg-warning-soft", "text-warning-strong"] },
            { tone: "red", label: "Overdue", classes: ["bg-error-soft", "text-error-strong"] },
            { tone: "neutral", label: "Void", classes: ["bg-surface-muted", "text-ink-secondary"] },
        ] as const

        for (const { tone, label, classes } of cases) {
            render(<StatusPill tone={tone}>{label}</StatusPill>)
            expect(screen.getByText(label)).toHaveClass(...classes)
        }
    })

    it("supports the sanctioned raw brand tones teal and orange", () => {
        render(<StatusPill tone="teal">Featured</StatusPill>)
        render(<StatusPill tone="orange">New</StatusPill>)

        expect(screen.getByText("Featured")).toHaveClass("bg-teal-100", "text-teal-700")
        expect(screen.getByText("New")).toHaveClass("bg-orange-100", "text-orange-700")
    })

    it("defaults to the neutral tone", () => {
        render(<StatusPill>3</StatusPill>)

        expect(screen.getByText("3")).toHaveClass("bg-surface-muted", "text-ink-secondary")
    })
})
