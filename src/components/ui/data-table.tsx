"use client"

import { AnimatePresence, m, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"

import { DUR, EASE } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Column definition for the object form of the `columns` prop. Plain strings
 * remain supported and behave like `{ label: string }`.
 */
export interface DataTableColumn {
    label: ReactNode
    /** Text alignment for the header cell. Defaults to "start". */
    align?: "start" | "end"
    /** Extra classes for the header cell (e.g. width constraints). */
    className?: string
}

/**
 * Canonical table shell shared across modules: a rounded card with a
 * consistent header row, optional toolbar/footer slots, and a subtle
 * skeleton -> content crossfade driven by the `loading` prop. Rows are
 * passed as children so callers keep full control of cell content.
 *
 * Cell defaults (px-6 py-4) are applied through zero-specificity
 * `:where()` selectors so any explicit class on a caller's `<td>` wins.
 */
export function DataTable({
    columns,
    children,
    loading = false,
    minWidth,
    toolbar,
    footer,
    className,
}: {
    columns: ReadonlyArray<string | DataTableColumn>
    children: ReactNode
    /**
     * When provided, flipping from true to false crossfades the skeleton
     * rows out and the content rows in.
     */
    loading?: boolean
    /** Minimum width (px) applied to the table inside the scroll wrapper. */
    minWidth?: number
    /** Rendered inside the card above the table (filters, search, actions). */
    toolbar?: ReactNode
    /** Rendered inside the card below the table (e.g. TablePagination). */
    footer?: ReactNode
    className?: string
}) {
    const shouldReduceMotion = useReducedMotion()

    return (
        <div className={cn("rounded-lg bg-surface shadow-card overflow-hidden", className)}>
            {toolbar ? <div className="border-b border-line p-4">{toolbar}</div> : null}
            <div className="overflow-x-auto">
                <table
                    className="w-full text-sm text-ink-secondary"
                    style={minWidth !== undefined ? { minWidth } : undefined}
                >
                    <thead className="border-b border-line bg-surface-muted/50">
                        <tr>
                            {columns.map((col, i) => {
                                const column: DataTableColumn =
                                    typeof col === "string" ? { label: col } : col
                                return (
                                    <th
                                        key={i}
                                        className={cn(
                                            "px-6 py-3 text-start type-card-label uppercase tracking-wider whitespace-nowrap",
                                            column.align === "end" && "text-end",
                                            column.className,
                                        )}
                                    >
                                        {column.label}
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <AnimatePresence mode="wait" initial={false}>
                        <m.tbody
                            key={loading ? "loading" : "content"}
                            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, transition: { duration: DUR.instant, ease: EASE.standard } }}
                            transition={{ duration: DUR.base, ease: EASE.out }}
                            className={cn(
                                "divide-y divide-line",
                                "[:where(&>tr)]:transition-colors [:where(&>tr:hover)]:bg-surface-muted/60",
                                "[:where(&>tr>td)]:px-6 [:where(&>tr>td)]:py-4",
                            )}
                        >
                            {children}
                        </m.tbody>
                    </AnimatePresence>
                </table>
            </div>
            {footer ? <div className="border-t border-line">{footer}</div> : null}
        </div>
    )
}
