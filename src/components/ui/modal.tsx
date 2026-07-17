"use client"

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react"
import { AnimatePresence, m } from "motion/react"
import { cva } from "class-variance-authority"
import { Icon } from "@/components/ui/icon"
import {
    drawerPanelVariants,
    modalBackdropVariants,
    modalPanelVariants,
} from "@/lib/motion"
import { cn } from "@/lib/utils"

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",")

/**
 * Modal behavior shared by every modal surface: focus trap, Escape-to-close,
 * background scroll lock and focus restore on close.
 *
 * Returns the ref to attach to the panel element (it must be focusable, e.g.
 * `tabIndex={-1}`). While `open` is true, focus moves onto the panel, Tab
 * cycles within it, Escape calls `onClose`, and body scroll is locked. On
 * close, focus returns to whatever was focused before the modal opened.
 */
export function useModalBehavior(
    open: boolean,
    onClose: () => void
): RefObject<HTMLDivElement | null> {
    const panelRef = useRef<HTMLDivElement>(null)

    // Keep the latest onClose in a ref so an inline callback doesn't re-run
    // the whole open effect (which would churn focus) on every parent render.
    const onCloseRef = useRef(onClose)
    useEffect(() => {
        onCloseRef.current = onClose
    })

    useEffect(() => {
        if (!open) return

        // Remember what had focus, so it can be restored when the modal closes.
        const previouslyFocused = document.activeElement as HTMLElement | null

        // Lock background scroll while the modal is open.
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        // Move focus onto the panel so screen readers announce it and
        // keyboard focus starts inside the modal.
        panelRef.current?.focus()

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onCloseRef.current()
                return
            }

            const panel = panelRef.current
            if (event.key !== "Tab" || !panel) return

            const focusable = Array.from(
                panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            ).filter(
                (element) =>
                    element.offsetParent !== null || element === document.activeElement
            )

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
    }, [open])

    return panelRef
}

export type ModalVariant = "center" | "drawer"
export type ModalSize = "sm" | "md" | "lg" | "xl"

const positionerClasses: Record<ModalVariant, string> = {
    center: "pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4",
    drawer: "pointer-events-none fixed inset-0 z-50 flex justify-end",
}

const panelClasses = cva(
    "pointer-events-auto relative w-full overflow-y-auto bg-surface p-6 shadow-card-hover outline-none",
    {
        variants: {
            variant: {
                center: "max-h-full rounded-lg",
                drawer: "h-full rounded-l-lg",
            },
            size: { sm: "", md: "", lg: "", xl: "" },
        },
        compoundVariants: [
            { variant: "center", size: "sm", class: "max-w-sm" },
            { variant: "center", size: "md", class: "max-w-lg" },
            { variant: "center", size: "lg", class: "max-w-2xl" },
            { variant: "center", size: "xl", class: "max-w-4xl" },
            { variant: "drawer", size: "sm", class: "max-w-sm" },
            { variant: "drawer", size: "md", class: "max-w-md" },
            { variant: "drawer", size: "lg", class: "max-w-lg" },
            { variant: "drawer", size: "xl", class: "max-w-xl" },
        ],
    }
)

export type ModalProps = {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: ReactNode
    footer?: ReactNode
    /**
     * Tailwind max-width class overriding the `size` mapping. Legacy Dialog
     * escape hatch — prefer `size` for new call sites.
     */
    widthClassName?: string
    /** "center" pops the panel in the middle; "drawer" slides in from the right edge. */
    variant?: ModalVariant
    /**
     * Panel width step. Defaults per variant: center → "md" (max-w-lg,
     * matching the legacy Dialog), drawer → "xl" (max-w-xl).
     */
    size?: ModalSize
}

/**
 * Modal surface primitive. Renders a scrim + panel with enter AND exit
 * animations (AnimatePresence), focus trap, Escape-to-close, scroll lock and
 * focus restore. Centered dialog by default; `variant="drawer"` slides a
 * full-height panel in from the right.
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    widthClassName,
    variant = "center",
    size,
}: ModalProps) {
    const panelRef = useModalBehavior(open, onClose)
    const titleId = useId()
    const descriptionId = useId()
    const resolvedSize = size ?? (variant === "drawer" ? "xl" : "md")

    return (
        <AnimatePresence>
            {open ? (
                <>
                    <m.div
                        key="modal-backdrop"
                        data-slot="modal-backdrop"
                        variants={modalBackdropVariants}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
                        aria-hidden="true"
                        onClick={onClose}
                    />
                    <div className={positionerClasses[variant]}>
                        <m.div
                            key="modal-panel"
                            data-slot="modal-panel"
                            ref={panelRef}
                            tabIndex={-1}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            aria-describedby={description ? descriptionId : undefined}
                            variants={variant === "drawer" ? drawerPanelVariants : modalPanelVariants}
                            initial="initial"
                            animate="show"
                            exit="hidden"
                            className={cn(
                                panelClasses({ variant, size: resolvedSize }),
                                widthClassName
                            )}
                        >
                            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                                <div>
                                    <h2 id={titleId} className="type-section">
                                        {title}
                                    </h2>
                                    {description ? (
                                        <p id={descriptionId} className="mt-1 text-sm text-ink-secondary">
                                            {description}
                                        </p>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close dialog"
                                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line bg-surface text-ink-muted outline-none transition-colors hover:bg-surface-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    <Icon name="close" size={20} />
                                </button>
                            </div>

                            <div className="mt-4">{children}</div>

                            {footer ? (
                                <div className="mt-6 flex justify-end gap-2">{footer}</div>
                            ) : null}
                        </m.div>
                    </div>
                </>
            ) : null}
        </AnimatePresence>
    )
}
