import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "@/components/ui/data-table"
import { FilterBar } from "@/components/ui/filter-bar"
import { PageHeader } from "@/features/finance/components/page-header"

describe("finance layout components", () => {
    it("renders the page header on the canvas with the unified header treatment", () => {
        render(
            <PageHeader
                title="Bills"
                subtitle="Track supplier liabilities."
                primaryAction={{ label: "New Bill", onClick: vi.fn() }}
            />,
        )

        expect(screen.getByText("Finance")).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Bills" })).toHaveClass("type-page-title")
        expect(screen.getByRole("banner")).toHaveClass("mb-6", "flex", "flex-col", "gap-4")
        expect(screen.getByRole("banner")).not.toHaveClass("rounded-2xl", "border", "border-navy-100", "bg-white")

        const primaryButton = screen.getByRole("button", { name: "New Bill" })
        expect(primaryButton).toHaveClass("bg-brand")
        expect(primaryButton).not.toHaveClass("bg-teal-700")
    })

    it("renders filter controls in a design-system surface card", () => {
        render(
            <FilterBar>
                <select aria-label="Status">
                    <option>All Statuses</option>
                </select>
            </FilterBar>,
        )

        const section = screen.getByLabelText("Status").closest("section")
        expect(section).toHaveClass("rounded-lg", "bg-surface", "shadow-card")
        expect(section).not.toHaveClass("border")
    })

    it("renders tables with the inventory module table shell", () => {
        render(
            <DataTable columns={["Bill Number", "Status"]}>
                <tr>
                    <td>AP-001</td>
                    <td>Draft</td>
                </tr>
            </DataTable>,
        )

        const table = screen.getByRole("table")
        expect(table.parentElement).toHaveClass("overflow-x-auto")
        expect(table.parentElement?.parentElement).toHaveClass("rounded-lg", "bg-surface", "shadow-card")
        expect(screen.getByRole("columnheader", { name: "Bill Number" })).toHaveClass("uppercase", "tracking-wider")
    })
})
