import { StatusPill } from "@/components/ui/status-pill"

export type StatusTone = "green" | "amber" | "red" | "neutral"

/**
 * Single source of truth for mapping a domain status string to a pill tone,
 * shared across Finance, POS, Inventory, and Organization so the same status
 * never renders a different colour in different modules.
 */
const TONE_BY_STATUS: Record<string, StatusTone> = {
    // In-progress / awaiting action
    draft: "amber",
    pending: "amber",
    partially_paid: "amber",
    confirmed: "amber",
    // Positive / settled
    posted: "green",
    paid: "green",
    active: "green",
    approved: "green",
    completed: "green",
    // Inactive / closed out
    void: "neutral",
    closed: "neutral",
    revoked: "neutral",
    inactive: "neutral",
    // Needs attention
    overdue: "red",
    rejected: "red",
    cancelled: "red",
}

export function statusTone(status: string): StatusTone {
    return TONE_BY_STATUS[status.toLowerCase()] ?? "neutral"
}

/** Turn a snake_case status into a Title Case label (e.g. "partially_paid" -> "Partially Paid"). */
export function formatStatusLabel(status: string): string {
    return status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
}

export function StatusBadge({ status }: { status: string }) {
    return <StatusPill tone={statusTone(status)}>{formatStatusLabel(status)}</StatusPill>
}
