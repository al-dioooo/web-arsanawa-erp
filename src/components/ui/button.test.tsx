import { fireEvent, render, screen } from "@testing-library/react"
import type { FormEvent } from "react"
import { describe, expect, it, vi } from "vitest"
import { Button, buttonVariants } from "@/components/ui/button"

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

    it("renders the DS default variant and size", () => {
        render(<Button type="button">Save</Button>)

        const button = screen.getByRole("button", { name: "Save" })

        expect(button).toHaveClass(
            "rounded-md",
            "font-bold",
            "bg-brand",
            "text-white",
            "hover:bg-brand-hover",
            "h-9",
            "px-4",
        )
    })

    it("renders the accent variant with the sanctioned raw orange shades", () => {
        render(
            <Button type="button" variant="accent">
                Add product
            </Button>,
        )

        const button = screen.getByRole("button", { name: "Add product" })

        expect(button).toHaveClass("bg-orange-500", "text-white", "hover:bg-orange-700")
    })

    it("renders pill shape as rounded-pill, replacing the base radius", () => {
        render(
            <Button type="button" shape="pill">
                Filter
            </Button>,
        )

        const button = screen.getByRole("button", { name: "Filter" })

        expect(button).toHaveClass("rounded-pill")
        expect(button).not.toHaveClass("rounded-md")
    })

    it("uses disabled token colors instead of opacity", () => {
        render(
            <Button type="button" disabled>
                Disabled
            </Button>,
        )

        const button = screen.getByRole("button", { name: "Disabled" })

        expect(button).toHaveClass("disabled:bg-line", "disabled:text-ink-faint", "disabled:pointer-events-none")
        expect(button).not.toHaveClass("disabled:opacity-50")
    })

    it("never emits dark: or raw navy classes for any variant", () => {
        for (const variant of ["default", "outline", "secondary", "ghost", "accent", "destructive", "link"] as const) {
            const classes = buttonVariants({ variant })
            expect(classes).not.toMatch(/dark:/)
            expect(classes).not.toMatch(/navy-/)
        }
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
