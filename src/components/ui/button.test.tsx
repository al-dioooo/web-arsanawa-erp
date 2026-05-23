import { render, screen, fireEvent } from "@testing-library/react"
import { Button } from "./button"
import { vi } from "vitest"

describe("Button", () => {
    it("renders with children", () => {
        render(<Button>Click me</Button>)
        expect(screen.getByText("Click me")).toBeInTheDocument()
    })

    it("handles click events", () => {
        const handleClick = vi.fn()
        render(<Button onClick={handleClick}>Click me</Button>)
        fireEvent.click(screen.getByText("Click me"))
        expect(handleClick).toHaveBeenCalledTimes(1)
    })
})
