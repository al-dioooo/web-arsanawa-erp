import { ApiError } from "@/lib/api-client"

/**
 * Renders the loading / error / empty <tr> for a finance DataTable so a failed
 * request shows a real error (with a retry) instead of a misleading empty state.
 * Returns null once there is data to render.
 */
export function TableStateRow({
    isLoading,
    isError = false,
    error,
    count,
    columns,
    emptyMessage,
    loadingMessage = "Loading...",
    onRetry,
}: {
    isLoading: boolean
    isError?: boolean
    error?: unknown
    count: number
    columns: number
    emptyMessage: string
    loadingMessage?: string
    onRetry?: () => void
}) {
    if (isLoading) {
        return (
            <tr>
                <td colSpan={columns} className="px-6 py-8 text-center text-navy-500">
                    {loadingMessage}
                </td>
            </tr>
        )
    }

    if (isError) {
        const message =
            error instanceof ApiError || error instanceof Error
                ? error.message
                : "Something went wrong while loading this list."
        return (
            <tr>
                <td colSpan={columns} className="px-6 py-8 text-center text-rose-600">
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
