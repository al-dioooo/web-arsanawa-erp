import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TablePagination } from "@/components/ui/table-pagination"

describe("TablePagination", () => {
    it("shows the visible range for a full page", () => {
        render(<TablePagination page={2} pageSize={10} total={45} onPageChange={vi.fn()} />)

        expect(screen.getByText("11–20 of 45")).toBeInTheDocument()
    })

    it("clamps the range on the last partial page", () => {
        render(<TablePagination page={5} pageSize={10} total={45} onPageChange={vi.fn()} />)

        expect(screen.getByText("41–45 of 45")).toBeInTheDocument()
    })

    it("shows an empty range and disables both buttons when there are no rows", () => {
        render(<TablePagination page={1} pageSize={10} total={0} onPageChange={vi.fn()} />)

        expect(screen.getByText("0–0 of 0")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled()
    })

    it("disables previous on the first page and next on the last page", () => {
        const { rerender } = render(
            <TablePagination page={1} pageSize={10} total={45} onPageChange={vi.fn()} />,
        )

        expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled()

        rerender(<TablePagination page={5} pageSize={10} total={45} onPageChange={vi.fn()} />)

        expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled()
        expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled()
    })

    it("calls onPageChange with the adjacent page", () => {
        const onPageChange = vi.fn()
        render(<TablePagination page={3} pageSize={10} total={45} onPageChange={onPageChange} />)

        fireEvent.click(screen.getByRole("button", { name: "Previous page" }))
        expect(onPageChange).toHaveBeenLastCalledWith(2)

        fireEvent.click(screen.getByRole("button", { name: "Next page" }))
        expect(onPageChange).toHaveBeenLastCalledWith(4)
    })

    it("supports a custom range label for i18n", () => {
        render(
            <TablePagination
                page={1}
                pageSize={10}
                total={45}
                onPageChange={vi.fn()}
                label={({ from, to, total }) => `Menampilkan ${from}-${to} dari ${total}`}
            />,
        )

        expect(screen.getByText("Menampilkan 1-10 dari 45")).toBeInTheDocument()
    })

    it("renders bordered 36px icon buttons per the icon-button contract", () => {
        render(<TablePagination page={1} pageSize={10} total={45} onPageChange={vi.fn()} />)

        const next = screen.getByRole("button", { name: "Next page" })
        expect(next).toHaveClass("size-9", "rounded-sm", "border-line", "bg-surface")
    })

    it("merges a custom className onto the layout row", () => {
        const { container } = render(
            <TablePagination
                page={1}
                pageSize={10}
                total={45}
                onPageChange={vi.fn()}
                className="pt-0"
            />,
        )

        expect(container.firstElementChild).toHaveClass("flex", "items-center", "justify-between", "pt-0")
    })
})
