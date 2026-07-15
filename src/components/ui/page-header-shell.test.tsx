import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PageHeaderShell } from "@/components/ui/page-header-shell"

describe("PageHeaderShell", () => {
    it("renders a banner card with a brand title, eyebrow, subtitle, and action slot", () => {
        render(
            <PageHeaderShell eyebrow="Finance" title="Bills" subtitle="Track liabilities">
                <button type="button">New Bill</button>
            </PageHeaderShell>,
        )

        const banner = screen.getByRole("banner")
        expect(banner).toHaveClass("rounded-2xl", "border", "border-navy-100", "bg-white", "p-6")
        expect(screen.getByText("Finance")).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Bills" })).toHaveClass("font-brand", "tracking-tight")
        expect(screen.getByText("Track liabilities")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "New Bill" })).toBeInTheDocument()
    })

    it("stamps an optional data attribute on the wrapper for test/style hooks", () => {
        render(<PageHeaderShell title="Catalogue" dataAttribute="data-inventory-page-header" />)

        expect(
            screen.getByRole("heading", { name: "Catalogue" }).closest("[data-inventory-page-header]"),
        ).not.toBeNull()
    })
})
