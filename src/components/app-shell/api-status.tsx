"use client"

import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import { useSession } from "@/features/auth/session-provider"
import { Tooltip } from "@/components/ui/tooltip"

type ApiConnectionStatus = "loading" | "inactive" | "offline" | "active"

const apiStatusLabels: Record<ApiConnectionStatus, string> = {
    loading: "Loading",
    inactive: "Inactive",
    offline: "Offline",
    active: "Active and ready",
}

const apiStatusClasses: Record<ApiConnectionStatus, string> = {
    loading: "bg-warning-soft text-warning-strong",
    inactive: "bg-surface-muted text-ink-faint",
    offline: "bg-error-soft text-error-strong",
    active: "bg-success-soft text-success-strong",
}

/**
 * Live API connection indicator — a small status dot that sits in a normal
 * topbar slot (module mode). Reflects network reachability, in-flight
 * queries/mutations, and whether an authenticated company context exists.
 */
export function ApiConnectionStatusDot() {
    const { user, activeCompanyId, isLoading } = useSession()
    const isFetching = useIsFetching()
    const isMutating = useIsMutating()
    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine

    let status: ApiConnectionStatus = "active"

    if (!isOnline) {
        status = "offline"
    } else if (isLoading || isFetching > 0 || isMutating > 0) {
        status = "loading"
    } else if (!user || !activeCompanyId) {
        status = "inactive"
    }

    const label = apiStatusLabels[status]

    return (
        <Tooltip label={label} side="bottom">
            <button
                type="button"
                className={`flex h-3.5 w-3.5 shrink-0 cursor-default items-center justify-center rounded-full ${apiStatusClasses[status]} outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2`}
                aria-label={`API connection status: ${label}`}
            >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </button>
        </Tooltip>
    )
}
