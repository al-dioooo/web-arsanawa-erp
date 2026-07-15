import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatusBadge, statusTone, formatStatusLabel } from "@/components/ui/status-badge"

describe("status-badge", () => {
    it("maps a status to one consistent tone regardless of module", () => {
        expect(statusTone("paid")).toBe("green")
        expect(statusTone("completed")).toBe("green")
        expect(statusTone("draft")).toBe("amber")
        expect(statusTone("confirmed")).toBe("amber")
        expect(statusTone("void")).toBe("neutral")
        expect(statusTone("overdue")).toBe("red")
        expect(statusTone("something-unknown")).toBe("neutral")
    })

    it("formats snake_case statuses as Title Case labels", () => {
        expect(formatStatusLabel("partially_paid")).toBe("Partially Paid")
    })

    it("renders a pill with the formatted label", () => {
        render(<StatusBadge status="partially_paid" />)
        expect(screen.getByText("Partially Paid")).toBeInTheDocument()
    })
})
