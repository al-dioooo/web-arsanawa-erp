"use client"

import * as React from "react"
import Link from "next/link"
import type { HTMLMotionProps } from "motion/react"
import { EnterTransition } from "@/components/ui/enter"
import { Icon } from "@/components/ui/icon"
import { DUR } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Popover state for dropdown menus: open/close state, aria wiring for the
 * trigger, and outside-click + Escape dismissal scoped to `containerRef`.
 *
 * Usage:
 * ```tsx
 * const { open, setOpen, triggerProps, containerRef } = usePopover()
 * <div className="relative" ref={containerRef}>
 *     <button type="button" {...triggerProps}>Open</button>
 *     <Menu open={open} onClose={() => setOpen(false)}>…</Menu>
 * </div>
 * ```
 */
export function usePopover() {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Close on outside click or Escape — listeners only while open.
    React.useEffect(() => {
        if (!open) return

        function handleMouseDown(event: MouseEvent) {
            const target = event.target as Node
            if (containerRef.current && !containerRef.current.contains(target)) {
                setOpen(false)
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", handleMouseDown)
        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("mousedown", handleMouseDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [open])

    const triggerProps = {
        "aria-haspopup": "menu" as const,
        "aria-expanded": open,
        onClick: () => setOpen((prev) => !prev),
    }

    return { open, setOpen, triggerProps, containerRef }
}

const MenuContext = React.createContext<{ onClose: () => void } | null>(null)

type MenuProps = {
    open: boolean
    onClose: () => void
    /** Horizontal anchoring relative to the positioned parent. */
    align?: "start" | "end"
    className?: string
    children: React.ReactNode
} & Omit<HTMLMotionProps<"div">, "children" | "className" | "initial" | "animate" | "exit" | "transition">

/**
 * Dropdown menu panel. Render inside a `relative` container (usually the
 * one holding `containerRef` from `usePopover`); it anchors below it.
 * Items close the menu automatically after their `onSelect` runs.
 */
export function Menu({ open, onClose, align = "start", className, children, ...props }: MenuProps) {
    const context = React.useMemo(() => ({ onClose }), [onClose])

    if (!open) return null

    return (
        <MenuContext.Provider value={context}>
            <EnterTransition
                role="menu"
                from="top"
                distance={6}
                duration={DUR.fast}
                className={cn(
                    "absolute top-full z-50 mt-2 min-w-64 rounded-lg bg-surface-raised py-2 shadow-card-hover",
                    align === "end" ? "end-0" : "start-0",
                    className,
                )}
                {...props}
            >
                {children}
            </EnterTransition>
        </MenuContext.Provider>
    )
}

export function MenuSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div role="group" aria-label={label}>
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-ink-faint uppercase">
                {label}
            </p>
            {children}
        </div>
    )
}

type MenuItemProps = {
    /** Leading icon name (rendered via the shared Icon component). */
    icon?: string
    /** Marks the current choice — brand ink text + trailing check. */
    selected?: boolean
    /** Dangerous actions — error text with a soft error hover. */
    destructive?: boolean
    onSelect?: () => void
    /** When set, renders a next/link instead of a button. */
    href?: string
    className?: string
    children: React.ReactNode
}

export function MenuItem({ icon, selected, destructive, onSelect, href, className, children }: MenuItemProps) {
    const menu = React.useContext(MenuContext)

    const handleClick = () => {
        onSelect?.()
        menu?.onClose()
    }

    const itemClassName = cn(
        "mx-1 flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-start text-sm font-semibold transition-colors outline-none select-none",
        destructive
            ? "text-error hover:bg-error-soft hover:text-error-strong focus-visible:bg-error-soft focus-visible:text-error-strong"
            : selected
              ? "text-brand-ink hover:bg-surface-muted focus-visible:bg-surface-muted"
              : "text-ink-secondary hover:bg-surface-muted hover:text-ink focus-visible:bg-surface-muted focus-visible:text-ink",
        className,
    )

    const content = (
        <>
            {icon && <Icon name={icon} size={16} className="shrink-0" />}
            <span className="min-w-0 flex-1 truncate">{children}</span>
            {selected && <Icon name="check" size={16} className="shrink-0" />}
        </>
    )

    if (href) {
        return (
            <Link href={href} role="menuitem" onClick={handleClick} className={itemClassName}>
                {content}
            </Link>
        )
    }

    return (
        <button type="button" role="menuitem" onClick={handleClick} className={itemClassName}>
            {content}
        </button>
    )
}

export function MenuSeparator() {
    return <div role="separator" className="my-1 border-t border-line" />
}
