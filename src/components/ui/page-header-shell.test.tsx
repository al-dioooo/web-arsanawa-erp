import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PageHeaderShell } from "@/components/ui/page-header-shell"

describe("PageHeaderShell (deprecated adapter)", () => {
    it("renders the unified on-canvas PageHeader with a brand title, eyebrow, subtitle, and action slot", () => {
        render(
            <PageHeaderShell eyebrow="Finance" title="Bills" subtitle="Track liabilities">
                <button type="button">New Bill</button>
            </PageHeaderShell>,
        )

        const banner = screen.getByRole("banner")
        expect(banner).toHaveClass("mb-6", "flex", "flex-col", "gap-4", "lg:flex-row", "lg:items-end", "lg:justify-between")
        expect(banner).not.toHaveClass("rounded-2xl", "border", "border-navy-100", "bg-white")
        expect(screen.getByText("Finance")).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Bills" })).toHaveClass("type-page-title")
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
