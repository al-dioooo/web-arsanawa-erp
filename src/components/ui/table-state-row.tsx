"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api-client"

/**
 * Renders the loading / error / empty <tr>s for a DataTable so a failed
 * request shows a real error (with a retry) instead of a misleading empty
 * state, and a pending request shows skeleton rows instead of a bare word.
 * Returns null once there is data to render.
 */
export function TableStateRow({
    isLoading,
    isError = false,
    error,
    count,
    columns,
    emptyMessage,
    skeletonRows = 4,
    onRetry,
}: {
    isLoading: boolean
    isError?: boolean
    error?: unknown
    count: number
    columns: number
    emptyMessage: string
    skeletonRows?: number
    onRetry?: () => void
}) {
    if (isLoading) {
        return (
            <>
                {Array.from({ length: skeletonRows }).map((_, row) => (
                    <tr key={row} data-slot="table-skeleton-row" aria-hidden="true">
                        {Array.from({ length: columns }).map((__, cell) => (
                            <td key={cell}>
                                <Skeleton className="h-4" />
                            </td>
                        ))}
                    </tr>
                ))}
            </>
        )
    }

    if (isError) {
        const message =
            error instanceof ApiError || error instanceof Error
                ? error.message
                : "Something went wrong while loading this list."
        return (
            <tr>
                <td colSpan={columns} className="py-10 text-center text-sm text-error">
                    {message}
                    {onRetry ? (
                        <Button type="button" variant="ghost" size="sm" className="ms-2" onClick={onRetry}>
                            Retry
                        </Button>
                    ) : null}
                </td>
            </tr>
        )
    }

    if (count === 0) {
        return (
            <tr>
                <td colSpan={columns} className="py-10 text-center text-sm text-ink-muted">
                    {emptyMessage}
                </td>
            </tr>
        )
    }

    return null
}
