import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Dialog } from "@/components/ui/dialog"

describe("Dialog", () => {
    it("locks body scroll while open and restores it on close", () => {
        const { rerender } = render(
            <Dialog open onClose={() => {}} title="Confirm">
                <button type="button">Inside</button>
            </Dialog>,
        )

        expect(document.body.style.overflow).toBe("hidden")

        rerender(
            <Dialog open={false} onClose={() => {}} title="Confirm">
                <button type="button">Inside</button>
            </Dialog>,
        )

        expect(document.body.style.overflow).not.toBe("hidden")
    })

    it("moves focus into the dialog when opened", () => {
        render(
            <Dialog open onClose={() => {}} title="Confirm">
                <button type="button">First action</button>
            </Dialog>,
        )

        const dialog = screen.getByRole("dialog")
        expect(dialog.contains(document.activeElement)).toBe(true)
    })

    it("closes on Escape", () => {
        const onClose = vi.fn()
        render(
            <Dialog open onClose={onClose} title="Confirm">
                <button type="button">Inside</button>
            </Dialog>,
        )

        fireEvent.keyDown(document, { key: "Escape" })
        expect(onClose).toHaveBeenCalledTimes(1)
    })
})
