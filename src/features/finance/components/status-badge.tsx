import { StatusPill } from "@/components/ui/status-pill"

type DocumentStatus = "draft" | "posted" | "partially_paid" | "paid" | "void" | "overdue" | "active" | "closed" | string

export function StatusBadge({ status }: { status: DocumentStatus }) {
    let tone: "amber" | "green" | "neutral" | "red" = "neutral"
    
    switch (status.toLowerCase()) {
        case "draft":
        case "pending":
            tone = "amber"
            break
        case "posted":
        case "paid":
        case "active":
        case "approved":
            tone = "green"
            break
        case "partially_paid":
            tone = "amber"
            break
        case "void":
        case "closed":
            tone = "neutral"
            break
        case "overdue":
        case "rejected":
            tone = "red"
            break
    }
    
    // Capitalize first letter and replace underscores
    const label = status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

    return <StatusPill tone={tone}>{label}</StatusPill>
}
