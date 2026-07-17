import { ApiError } from "@/lib/api-client"

/**
 * Renders the loading / error / empty <tr>s for a DataTable so a failed
 * request shows a real error (with a retry) instead of a misleading empty
 * state, and a pending request shows shimmer rows instead of a bare word.
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
                    <tr key={row} aria-hidden="true">
                        {Array.from({ length: columns }).map((__, cell) => (
                            <td key={cell} className="px-6 py-4">
                                <div className="h-4 animate-pulse rounded bg-navy-100" />
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
                <td colSpan={columns} className="px-6 py-8 text-center text-error">
                    {message}
                    {onRetry ? (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="ml-2 font-semibold text-teal-700 underline"
                        >
                            Retry
                        </button>
                    ) : null}
                </td>
            </tr>
        )
    }

    if (count === 0) {
        return (
            <tr>
                <td colSpan={columns} className="px-6 py-8 text-center text-navy-500">
                    {emptyMessage}
                </td>
            </tr>
        )
    }

    return null
}
