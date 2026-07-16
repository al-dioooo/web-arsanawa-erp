"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export type ConfirmOptions = {
    title: string
    /** Explain the consequence, e.g. "This can't be undone." */
    message?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    /** Style the confirm button as destructive. */
    danger?: boolean
}

/**
 * Promise-based confirmation for destructive actions. Returns an `ask` function
 * that resolves to true/false, and the dialog element to render once.
 *
 *   const [confirm, confirmDialog] = useConfirm()
 *   // if (await confirm({ title: "Delete?", danger: true })) doDelete()
 *   // ...render {confirmDialog}
 */
export function useConfirm() {
    const [options, setOptions] = useState<ConfirmOptions | null>(null)
    const resolver = useRef<((value: boolean) => void) | null>(null)

    const confirm = useCallback((next: ConfirmOptions) => {
        setOptions(next)
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve
        })
    }, [])

    const settle = useCallback((result: boolean) => {
        resolver.current?.(result)
        resolver.current = null
        setOptions(null)
    }, [])

    const dialog = options ? (
        <Dialog
            open
            onClose={() => settle(false)}
            title={options.title}
            widthClassName="max-w-md"
            footer={
                <>
                    <Button variant="secondary" onClick={() => settle(false)}>
                        {options.cancelLabel ?? "Cancel"}
                    </Button>
                    <Button
                        variant={options.danger ? "destructive" : "default"}
                        onClick={() => settle(true)}
                    >
                        {options.confirmLabel ?? "Confirm"}
                    </Button>
                </>
            }
        >
            {options.message ? (
                <p className="text-sm leading-relaxed text-navy-600">{options.message}</p>
            ) : (
                <p className="text-sm leading-relaxed text-navy-600">This action cannot be undone.</p>
            )}
        </Dialog>
    ) : null

    return [confirm, dialog] as const
}
