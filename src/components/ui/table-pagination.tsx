"use client"

import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

/**
 * Pagination footer for DataTable: a "from–to of total" range readout on the
 * start side and previous/next icon buttons on the end side. Pages are
 * 1-indexed. Pass it to DataTable's `footer` slot.
 */
export function TablePagination({
    page,
    pageSize,
    total,
    onPageChange,
    className,
    label,
}: {
    /** Current page, 1-indexed. */
    page: number
    pageSize: number
    /** Total row count across all pages. */
    total: number
    onPageChange: (page: number) => void
    className?: string
    /** i18n hook for the range readout. Defaults to "from–to of total". */
    label?: (info: { from: number; to: number; total: number }) => ReactNode
}) {
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, total)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))

    const iconButtonClasses = "size-9 rounded-sm border border-line bg-surface"

    return (
        <div className={cn("flex items-center justify-between gap-3 px-4 py-3", className)}>
            <p className="text-xs text-ink-muted">
                {label ? label({ from, to, total }) : `${from}–${to} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className={iconButtonClasses}
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <Icon name="chevron_left" size={18} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className={iconButtonClasses}
                    aria-label="Next page"
                    disabled={page >= pageCount}
                    onClick={() => onPageChange(page + 1)}
                >
                    <Icon name="chevron_right" size={18} />
                </Button>
            </div>
        </div>
    )
}
