import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SearchableSelect } from "@/components/ui/searchable-select"

const options = [
    { value: "1", label: "Alpha" },
    { value: "2", label: "Beta" },
    { value: "3", label: "Gamma" },
]

describe("SearchableSelect", () => {
    it("exposes combobox and listbox semantics", () => {
        render(<SearchableSelect label="Item" value="" onChange={() => {}} options={options} />)

        const combo = screen.getByRole("combobox", { name: "Item" })
        expect(combo).toHaveAttribute("aria-expanded", "false")

        fireEvent.focus(combo)
        expect(combo).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByRole("listbox")).toBeInTheDocument()
        expect(screen.getAllByRole("option")).toHaveLength(3)
    })

    it("navigates with the arrow keys and selects with Enter", () => {
        const onChange = vi.fn()
        render(<SearchableSelect label="Item" value="" onChange={onChange} options={options} />)

        const combo = screen.getByRole("combobox", { name: "Item" })
        fireEvent.focus(combo)
        fireEvent.keyDown(combo, { key: "ArrowDown" })
        fireEvent.keyDown(combo, { key: "Enter" })

        expect(onChange).toHaveBeenCalledWith("2")
    })

    it("closes on Escape", () => {
        render(<SearchableSelect label="Item" value="" onChange={() => {}} options={options} />)

        const combo = screen.getByRole("combobox", { name: "Item" })
        fireEvent.focus(combo)
        expect(screen.getByRole("listbox")).toBeInTheDocument()

        fireEvent.keyDown(combo, { key: "Escape" })
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
})
