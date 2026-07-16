import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useConfirm } from "@/components/ui/confirm-dialog"

function Harness({ onResult }: { onResult: (result: boolean) => void }) {
    const [confirm, confirmDialog] = useConfirm()
    return (
        <>
            <button
                type="button"
                onClick={async () => onResult(await confirm({ title: "Delete partner?", danger: true, confirmLabel: "Delete" }))}
            >
                Trigger
            </button>
            {confirmDialog}
        </>
    )
}

describe("useConfirm", () => {
    it("resolves true when confirmed", async () => {
        const onResult = vi.fn()
        render(<Harness onResult={onResult} />)

        fireEvent.click(screen.getByRole("button", { name: "Trigger" }))
        expect(screen.getByRole("dialog", { name: "Delete partner?" })).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Delete" }))
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(true))
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("resolves false when cancelled", async () => {
        const onResult = vi.fn()
        render(<Harness onResult={onResult} />)

        fireEvent.click(screen.getByRole("button", { name: "Trigger" }))
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

        await waitFor(() => expect(onResult).toHaveBeenCalledWith(false))
    })
})
