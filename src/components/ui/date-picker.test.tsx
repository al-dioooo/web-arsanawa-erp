import { render, screen, fireEvent } from "@testing-library/react"
import { DatePicker } from "./date-picker"
import { vi } from "vitest"

describe("DatePicker", () => {
    it("renders with placeholder and labels", () => {
        render(
            <DatePicker
                label="Select Expiry"
                value="2026-01-15"
                onChange={() => {}}
                placeholder="Choose date"
            />
        )
        expect(screen.getByText("Select Expiry")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Choose date")).toBeInTheDocument()
    })

    it("opens calendar popover when clicked", () => {
        render(
            <DatePicker
                value="2026-01-15"
                onChange={() => {}}
                placeholder="Choose date"
            />
        )
        const input = screen.getByPlaceholderText("Choose date")
        expect(screen.queryByText(/January/)).not.toBeInTheDocument()

        fireEvent.click(input)
        expect(screen.getByText(/January/)).toBeInTheDocument()
    })

    it("positions popover at bottom when there is enough space below", () => {
        const originalInnerHeight = window.innerHeight
        window.innerHeight = 800

        const { container } = render(
            <DatePicker
                value="2026-01-15"
                onChange={() => {}}
                placeholder="Choose date"
            />
        )

        const datePickerDiv = container.firstChild as HTMLDivElement
        vi.spyOn(datePickerDiv, "getBoundingClientRect").mockReturnValue({
            bottom: 400,
            top: 350,
            left: 0,
            right: 280,
            width: 280,
            height: 50,
            x: 0,
            y: 350,
            toJSON: () => {}
        })

        const input = screen.getByPlaceholderText("Choose date")
        fireEvent.click(input)

        const popover = screen.getByText(/January/).parentElement?.parentElement
        expect(popover).toHaveClass("top-full")
        expect(popover).not.toHaveClass("bottom-full")

        window.innerHeight = originalInnerHeight
    })

    it("positions popover at top when space below is less than 350px", () => {
        const originalInnerHeight = window.innerHeight
        window.innerHeight = 600

        const { container } = render(
            <DatePicker
                value="2026-01-15"
                onChange={() => {}}
                placeholder="Choose date"
            />
        )

        const datePickerDiv = container.firstChild as HTMLDivElement
        vi.spyOn(datePickerDiv, "getBoundingClientRect").mockReturnValue({
            bottom: 500,
            top: 450,
            left: 0,
            right: 280,
            width: 280,
            height: 50,
            x: 0,
            y: 450,
            toJSON: () => {}
        })

        const input = screen.getByPlaceholderText("Choose date")
        fireEvent.click(input)

        const popover = screen.getByText(/January/).parentElement?.parentElement
        expect(popover).toHaveClass("bottom-full")
        expect(popover).not.toHaveClass("top-full")

        window.innerHeight = originalInnerHeight
    })
})
