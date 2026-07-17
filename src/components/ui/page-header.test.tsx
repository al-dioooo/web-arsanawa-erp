import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PageHeader } from "@/components/ui/page-header"

describe("PageHeader", () => {
    it("renders a banner directly on the canvas with eyebrow, title, subtitle, status, and actions", () => {
        render(
            <PageHeader
                eyebrow="Finance"
                title="Bills"
                subtitle="Track liabilities"
                status={<span>Company scoped</span>}
                actions={<button type="button">New Bill</button>}
            />,
        )

        const banner = screen.getByRole("banner")
        expect(banner).toHaveClass("mb-6", "flex", "flex-col", "gap-4", "lg:flex-row", "lg:items-end", "lg:justify-between")
        expect(banner).not.toHaveClass("rounded-2xl", "border", "bg-white", "bg-surface", "shadow-card")
        expect(screen.getByText("Finance")).toHaveClass("uppercase", "text-brand-ink", "font-display")
        expect(screen.getByRole("heading", { name: "Bills", level: 1 })).toHaveClass("type-page-title")
        expect(screen.getByText("Track liabilities")).toHaveClass("text-sm", "text-ink-muted", "max-w-3xl")
        expect(screen.getByText("Company scoped")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "New Bill" })).toBeInTheDocument()
    })

    it("renders the greeting variant eyebrow with the quiet type-eyebrow role", () => {
        render(<PageHeader variant="greeting" eyebrow="Thursday, 17 July" title="Hi Alice" />)

        const eyebrow = screen.getByText("Thursday, 17 July")
        expect(eyebrow).toHaveClass("type-eyebrow")
        expect(eyebrow).not.toHaveClass("uppercase", "text-brand-ink")
        expect(screen.getByRole("heading", { name: "Hi Alice", level: 1 })).toHaveClass("type-page-title")
    })

    it("renders a back link above the title when backHref is provided", () => {
        render(<PageHeader title="Bill AP-001" backHref="/finance/bills" backLabel="Back to Bills" />)

        const link = screen.getByRole("link", { name: "Back to Bills" })
        expect(link).toHaveAttribute("href", "/finance/bills")
        expect(link).toHaveClass("text-sm", "font-semibold", "text-ink-muted")
    })

    it("labels the back link 'Back' by default", () => {
        render(<PageHeader title="Bill AP-001" backHref="/finance/bills" />)

        expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/finance/bills")
    })

    it("stamps an optional data attribute on the wrapper for test/style hooks", () => {
        render(<PageHeader title="Catalogue" dataAttribute="data-inventory-page-header" />)

        expect(
            screen.getByRole("heading", { name: "Catalogue" }).closest("[data-inventory-page-header]"),
        ).toBe(screen.getByRole("banner"))
    })
})
