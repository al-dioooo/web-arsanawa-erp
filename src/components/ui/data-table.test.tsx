import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DataTable } from "@/components/ui/data-table"

describe("DataTable", () => {
    it("renders a borderless card shell with an overflow wrapper", () => {
        render(
            <DataTable columns={["Name", "Status"]}>
                <tr>
                    <td>Widget</td>
                    <td>Active</td>
                </tr>
            </DataTable>,
        )

        const table = screen.getByRole("table")
        const wrapper = table.parentElement
        const shell = wrapper?.parentElement

        expect(wrapper).toHaveClass("overflow-x-auto")
        expect(shell).toHaveClass("rounded-lg", "bg-surface", "shadow-card", "overflow-hidden")
        expect(shell?.className).not.toMatch(/\bborder\b/)
    })

    it("supports the legacy string[] columns API", () => {
        render(
            <DataTable columns={["Bill Number", "Status"]}>
                <tr>
                    <td>AP-001</td>
                    <td>Draft</td>
                </tr>
            </DataTable>,
        )

        const header = screen.getByRole("columnheader", { name: "Bill Number" })
        expect(header).toHaveClass("type-card-label", "uppercase", "tracking-wider", "text-start")
        expect(screen.getByText("AP-001")).toBeInTheDocument()
    })

    it("supports object columns with end alignment and custom classes", () => {
        render(
            <DataTable
                columns={[
                    { label: "Product" },
                    { label: "Total", align: "end", className: "w-32" },
                ]}
            >
                <tr>
                    <td>Widget</td>
                    <td>Rp 10.000</td>
                </tr>
            </DataTable>,
        )

        const start = screen.getByRole("columnheader", { name: "Product" })
        const end = screen.getByRole("columnheader", { name: "Total" })

        expect(start).toHaveClass("text-start")
        expect(start).not.toHaveClass("text-end")
        expect(end).toHaveClass("text-end", "w-32")
    })

    it("applies minWidth to the table element only when provided", () => {
        const { rerender } = render(
            <DataTable columns={["Name"]} minWidth={720}>
                <tr>
                    <td>Widget</td>
                </tr>
            </DataTable>,
        )

        expect(screen.getByRole("table")).toHaveStyle({ minWidth: "720px" })

        rerender(
            <DataTable columns={["Name"]}>
                <tr>
                    <td>Widget</td>
                </tr>
            </DataTable>,
        )

        expect(screen.getByRole("table").style.minWidth).toBe("")
    })

    it("renders toolbar and footer slots inside the card with divider lines", () => {
        render(
            <DataTable
                columns={["Name"]}
                toolbar={<input aria-label="Search" />}
                footer={<div data-testid="pagination" />}
            >
                <tr>
                    <td>Widget</td>
                </tr>
            </DataTable>,
        )

        const shell = screen.getByRole("table").parentElement?.parentElement
        const toolbar = screen.getByLabelText("Search").parentElement
        const footer = screen.getByTestId("pagination").parentElement

        expect(toolbar).toHaveClass("p-4", "border-b", "border-line")
        expect(footer).toHaveClass("border-t", "border-line")
        expect(shell?.contains(toolbar)).toBe(true)
        expect(shell?.contains(footer)).toBe(true)
    })

    it("omits the toolbar and footer wrappers when the slots are unused", () => {
        render(
            <DataTable columns={["Name"]}>
                <tr>
                    <td>Widget</td>
                </tr>
            </DataTable>,
        )

        const shell = screen.getByRole("table").parentElement?.parentElement
        expect(shell?.querySelectorAll(":scope > div").length).toBe(1)
    })

    it("crossfades from skeleton rows to content when loading resolves", async () => {
        const skeleton = (
            <tr data-slot="table-skeleton-row" aria-hidden="true">
                <td />
            </tr>
        )

        const { rerender, container } = render(
            <DataTable columns={["Name"]} loading>
                {skeleton}
            </DataTable>,
        )

        expect(container.querySelector('[data-slot="table-skeleton-row"]')).toBeInTheDocument()
        expect(screen.queryByText("Widget")).not.toBeInTheDocument()

        rerender(
            <DataTable columns={["Name"]} loading={false}>
                <tr>
                    <td>Widget</td>
                </tr>
            </DataTable>,
        )

        await waitFor(() => expect(screen.getByText("Widget")).toBeInTheDocument())
        expect(container.querySelector('[data-slot="table-skeleton-row"]')).not.toBeInTheDocument()
    })
})
