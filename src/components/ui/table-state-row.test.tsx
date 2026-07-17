import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TableStateRow } from "@/components/ui/table-state-row"

function renderInTable(ui: React.ReactNode) {
    return render(
        <table>
            <tbody>{ui}</tbody>
        </table>,
    )
}

describe("TableStateRow", () => {
    it("renders skeleton cells while loading, not an empty message", () => {
        const { container } = renderInTable(
            <TableStateRow
                isLoading
                count={0}
                columns={3}
                emptyMessage="No records found."
                skeletonRows={4}
            />,
        )

        const skeletonRows = container.querySelectorAll('[data-slot="table-skeleton-row"]')
        expect(skeletonRows.length).toBe(4)
        expect(container.querySelectorAll('[data-slot="table-skeleton-row"] td').length).toBe(12) // 4 rows × 3 columns
        expect(container.textContent).not.toContain("No records found.")
    })

    it("hides skeleton rows from assistive tech", () => {
        const { container } = renderInTable(
            <TableStateRow isLoading count={0} columns={2} emptyMessage="No records found." />,
        )

        for (const row of container.querySelectorAll('[data-slot="table-skeleton-row"]')) {
            expect(row).toHaveAttribute("aria-hidden", "true")
        }
    })

    it("shows the empty message only once loading resolves with no rows", () => {
        const { container, getByText } = renderInTable(
            <TableStateRow isLoading={false} count={0} columns={3} emptyMessage="No records found." />,
        )

        expect(container.querySelectorAll('[data-slot="table-skeleton-row"]').length).toBe(0)
        expect(getByText("No records found.")).toBeInTheDocument()
        expect(getByText("No records found.")).toHaveClass("text-ink-muted", "text-sm", "py-10", "text-center")
    })

    it("shows the error with a retry action", () => {
        const onRetry = vi.fn()
        const { getByText, getByRole } = renderInTable(
            <TableStateRow
                isLoading={false}
                isError
                error={new Error("Boom.")}
                count={0}
                columns={3}
                emptyMessage="No records found."
                onRetry={onRetry}
            />,
        )

        expect(getByText(/Boom\./)).toBeInTheDocument()
        getByRole("button", { name: "Retry" }).click()
        expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("falls back to a generic error message for non-Error values", () => {
        const { getByText } = renderInTable(
            <TableStateRow
                isLoading={false}
                isError
                error="nope"
                count={0}
                columns={3}
                emptyMessage="No records found."
            />,
        )

        expect(getByText(/Something went wrong/)).toBeInTheDocument()
    })

    it("returns nothing once there are rows to render", () => {
        const { container } = renderInTable(
            <TableStateRow isLoading={false} count={5} columns={3} emptyMessage="No records found." />,
        )

        expect(container.querySelector("tbody")?.children.length).toBe(0)
    })
})
