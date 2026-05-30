import { fireEvent, render, screen } from "@testing-library/react"
import type { FormEvent } from "react"
import { describe, expect, it, vi } from "vitest"
import { Button } from "@/components/ui/button"

describe("Button", () => {
    it("preserves native button behavior while exposing motion interactions", () => {
        const handleClick = vi.fn()

        render(
            <Button type="button" onClick={handleClick}>
                Save
            </Button>,
        )

        const button = screen.getByRole("button", { name: "Save" })

        expect(button).toHaveAttribute("type", "button")
        expect(button).toHaveAttribute("data-motion-control", "button")

        fireEvent.click(button)
        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("keeps disabled buttons inert", () => {
        const handleClick = vi.fn()

        render(
            <Button type="button" disabled onClick={handleClick}>
                Disabled
            </Button>,
        )

        const button = screen.getByRole("button", { name: "Disabled" })

        expect(button).toBeDisabled()
        fireEvent.click(button)
        expect(handleClick).not.toHaveBeenCalled()
    })

    it("preserves submit behavior inside forms", () => {
        const handleSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())

        render(
            <form onSubmit={handleSubmit}>
                <Button type="submit">Submit</Button>
            </form>,
        )

        fireEvent.click(screen.getByRole("button", { name: "Submit" }))

        expect(handleSubmit).toHaveBeenCalledTimes(1)
    })
})
