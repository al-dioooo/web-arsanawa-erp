"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { EnterTransition } from "@/components/ui/enter"
import { Icon } from "@/components/ui/icon"

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",")

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
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        // Remember what had focus, so it can be restored when the dialog closes.
        const previouslyFocused = document.activeElement as HTMLElement | null

        // Lock background scroll while the modal is open.
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        // Move focus onto the dialog panel so screen readers announce it and
        // keyboard focus starts inside the modal.
        const panel = panelRef.current
        panel?.focus()

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose()
                return
            }

            if (event.key !== "Tab" || !panel) return

            const focusable = Array.from(
                panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            ).filter((element) => element.offsetParent !== null || element === document.activeElement)

            if (focusable.length === 0) {
                event.preventDefault()
                panel.focus()
                return
            }

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            const activeElement = document.activeElement

            if (event.shiftKey && (activeElement === first || activeElement === panel)) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener("keydown", handleKey)

        return () => {
            document.removeEventListener("keydown", handleKey)
            document.body.style.overflow = previousOverflow
            previouslyFocused?.focus?.()
        }
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
            <EnterTransition
                ref={panelRef}
                tabIndex={-1}
                from="none"
                scale={0.95}
                className={`relative w-full ${widthClassName} max-h-[90vh] overflow-y-auto rounded-2xl border border-navy-100 bg-white p-6 shadow-xl outline-none`}
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
            </EnterTransition>
        </div>
    )
}
