import {
    fireEvent,
    render,
    screen,
    waitForElementToBeRemoved,
} from "@testing-library/react"
import { LazyMotion, domAnimation } from "motion/react"
import type { ReactElement, ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { Modal } from "@/components/ui/modal"

// Exit animations need Motion's features loaded — mirror the app's LazyMotion
// setup so AnimatePresence can actually run (and finish) exit transitions.
function MotionWrapper({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    )
}

function renderModal(ui: ReactElement) {
    return render(ui, { wrapper: MotionWrapper })
}

describe("Modal", () => {
    it("locks body scroll while open and restores it on close", () => {
        const { rerender } = renderModal(
            <Modal open onClose={() => {}} title="Confirm">
                <button type="button">Inside</button>
            </Modal>,
        )

        expect(document.body.style.overflow).toBe("hidden")

        rerender(
            <Modal open={false} onClose={() => {}} title="Confirm">
                <button type="button">Inside</button>
            </Modal>,
        )

        expect(document.body.style.overflow).not.toBe("hidden")
    })

    it("moves focus into the dialog when opened", () => {
        renderModal(
            <Modal open onClose={() => {}} title="Confirm">
                <button type="button">First action</button>
            </Modal>,
        )

        const dialog = screen.getByRole("dialog")
        expect(dialog.contains(document.activeElement)).toBe(true)
    })

    it("closes on Escape", () => {
        const onClose = vi.fn()
        renderModal(
            <Modal open onClose={onClose} title="Confirm">
                <button type="button">Inside</button>
            </Modal>,
        )

        fireEvent.keyDown(document, { key: "Escape" })
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes when the backdrop is clicked", () => {
        const onClose = vi.fn()
        renderModal(
            <Modal open onClose={onClose} title="Confirm">
                <button type="button">Inside</button>
            </Modal>,
        )

        const backdrop = document.querySelector("[data-slot='modal-backdrop']")
        expect(backdrop).not.toBeNull()
        fireEvent.click(backdrop!)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("keeps Tab and Shift+Tab focus inside the dialog", () => {
        renderModal(
            <Modal open onClose={() => {}} title="Confirm">
                <button type="button">Only action</button>
            </Modal>,
        )

        const dialog = screen.getByRole("dialog")
        const inside = screen.getByRole("button", { name: "Only action" })
        inside.focus()

        fireEvent.keyDown(document, { key: "Tab" })
        expect(dialog.contains(document.activeElement)).toBe(true)

        fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
        expect(dialog.contains(document.activeElement)).toBe(true)
    })

    it("keeps focus on the panel when nothing inside is focusable", () => {
        renderModal(
            <Modal open onClose={() => {}} title="Confirm">
                <p>Plain text body</p>
            </Modal>,
        )

        const dialog = screen.getByRole("dialog")
        fireEvent.keyDown(document, { key: "Tab" })
        expect(document.activeElement).toBe(dialog)
    })

    it("restores focus to the previously focused element on close", () => {
        function Harness({ open }: { open: boolean }) {
            return (
                <>
                    <button type="button">Trigger</button>
                    <Modal open={open} onClose={() => {}} title="Confirm">
                        <p>Body</p>
                    </Modal>
                </>
            )
        }

        const { rerender } = renderModal(<Harness open={false} />)
        const trigger = screen.getByRole("button", { name: "Trigger" })
        trigger.focus()

        rerender(<Harness open />)
        expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true)

        rerender(<Harness open={false} />)
        expect(document.activeElement).toBe(trigger)
    })

    it("labels the dialog with the title and describes it with the description", () => {
        renderModal(
            <Modal
                open
                onClose={() => {}}
                title="Edit partner"
                description="Update the partner details."
            >
                <p>Body</p>
            </Modal>,
        )

        const dialog = screen.getByRole("dialog", { name: "Edit partner" })
        expect(dialog).toHaveAttribute("aria-modal", "true")
        expect(dialog).toHaveAccessibleDescription("Update the partner details.")
    })

    it("omits aria-describedby when there is no description", () => {
        renderModal(
            <Modal open onClose={() => {}} title="Confirm">
                <p>Body</p>
            </Modal>,
        )

        expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-describedby")
    })

    it("renders the centered panel with the design-system surface classes", () => {
        renderModal(
            <Modal open onClose={() => {}} title="Confirm">
                <p>Body</p>
            </Modal>,
        )

        const dialog = screen.getByRole("dialog")
        expect(dialog).toHaveClass(
            "bg-surface",
            "shadow-card-hover",
            "rounded-lg",
            "p-6",
            "max-w-lg",
        )
        expect(dialog).not.toHaveClass("border")
        expect(dialog.parentElement).toHaveClass("items-center", "justify-center")
    })

    it("maps center sizes to max-width steps and lets widthClassName override them", () => {
        const { rerender } = renderModal(
            <Modal open onClose={() => {}} title="Confirm" size="xl">
                <p>Body</p>
            </Modal>,
        )
        expect(screen.getByRole("dialog")).toHaveClass("max-w-4xl")

        rerender(
            <Modal open onClose={() => {}} title="Confirm" widthClassName="max-w-3xl">
                <p>Body</p>
            </Modal>,
        )
        const dialog = screen.getByRole("dialog")
        expect(dialog).toHaveClass("max-w-3xl")
        expect(dialog).not.toHaveClass("max-w-lg")
    })

    it("renders the drawer variant full-height on the right with left-rounded corners", () => {
        renderModal(
            <Modal open onClose={() => {}} title="Filters" variant="drawer">
                <p>Body</p>
            </Modal>,
        )

        const dialog = screen.getByRole("dialog")
        expect(dialog).toHaveClass("h-full", "rounded-l-lg", "max-w-xl")
        expect(dialog).not.toHaveClass("rounded-lg")
        expect(dialog.parentElement).toHaveClass("justify-end")
    })

    it("keeps the centered panel mounted during exit, then removes it", async () => {
        const { rerender } = renderModal(
            <Modal open onClose={() => {}} title="Confirm">
                <p>Body</p>
            </Modal>,
        )

        rerender(
            <Modal open={false} onClose={() => {}} title="Confirm">
                <p>Body</p>
            </Modal>,
        )

        // Still present right after close — the exit animation is running.
        expect(screen.getByRole("dialog")).toBeInTheDocument()
        await waitForElementToBeRemoved(() => screen.queryByRole("dialog"))
    })

    it("animates the drawer out before removing it", async () => {
        const { rerender } = renderModal(
            <Modal open onClose={() => {}} title="Filters" variant="drawer">
                <p>Body</p>
            </Modal>,
        )

        rerender(
            <Modal open={false} onClose={() => {}} title="Filters" variant="drawer">
                <p>Body</p>
            </Modal>,
        )

        expect(screen.getByRole("dialog")).toBeInTheDocument()
        await waitForElementToBeRemoved(() => screen.queryByRole("dialog"))
    })
})
