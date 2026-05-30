import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "@/features/finance/components/data-table"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { PageHeader } from "@/features/finance/components/page-header"

describe("finance layout components", () => {
    it("renders the page header with the same card treatment used by inventory pages", () => {
        render(
            <PageHeader
                title="Bills"
                subtitle="Track supplier liabilities."
                primaryAction={{ label: "New Bill", onClick: vi.fn() }}
            />,
        )

        expect(screen.getByText("Finance")).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Bills" })).toHaveClass("font-brand")
        expect(screen.getByRole("banner")).toHaveClass("rounded-2xl", "border", "border-navy-100", "bg-white", "p-6")
    })

    it("renders filter controls in an inventory-style rounded content section", () => {
        render(
            <FilterBar>
                <select aria-label="Status">
                    <option>All Statuses</option>
                </select>
            </FilterBar>,
        )

        expect(screen.getByLabelText("Status").closest("section")).toHaveClass("rounded-2xl", "border", "border-navy-100", "bg-white")
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

        expect(screen.getByRole("table").parentElement).toHaveClass("rounded-2xl", "border", "border-navy-100", "bg-white")
        expect(screen.getByRole("columnheader", { name: "Bill Number" })).toHaveClass("uppercase", "tracking-wider")
    })
})
