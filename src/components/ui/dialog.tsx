"use client"

import { useEffect, type ReactNode } from "react"
import { Icon } from "@/components/ui/icon"

type DialogProps = {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: ReactNode
    footer?: ReactNode
    /** Tailwind max-width class for the panel. Defaults to a medium dialog. */
    widthClassName?: string
}

export function Dialog({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    widthClassName = "max-w-lg",
}: DialogProps) {
    useEffect(() => {
        if (!open) return

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") onClose()
        }

        document.addEventListener("keydown", handleKey)
        return () => document.removeEventListener("keydown", handleKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className={`relative w-full ${widthClassName} max-h-[90vh] overflow-y-auto rounded-2xl border border-navy-100 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-navy-50 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-navy-900 font-display">{title}</h2>
                        {description ? (
                            <p className="mt-1 text-sm text-navy-500 font-body">{description}</p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors cursor-pointer outline-none"
                    >
                        <Icon name="close" size={20} />
                    </button>
                </div>

                <div className="mt-4">{children}</div>

                {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
            </div>
        </div>
    )
}
