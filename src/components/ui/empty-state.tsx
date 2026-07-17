import type { ReactNode } from "react"

import { Icon, type IconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
    /** Icon name rendered inside the muted bubble above the title. */
    icon?: IconName
    title: ReactNode
    description?: ReactNode
    /** Call-to-action slot rendered below the description (e.g. a Button). */
    action?: ReactNode
    /** Tighter vertical padding for use inside cards/panels. */
    compact?: boolean
    className?: string
}

/**
 * Centered empty/zero state for lists, tables and search results.
 */
function EmptyState({ icon, title, description, action, compact = false, className }: EmptyStateProps) {
    return (
        <div
            data-slot="empty-state"
            className={cn(
                "flex flex-col items-center justify-center text-center",
                compact ? "py-8" : "py-12",
                className,
            )}
        >
            {icon ? (
                <div className="mb-4 flex size-12 items-center justify-center rounded-pill bg-surface-muted text-ink-faint">
                    <Icon name={icon} size={24} />
                </div>
            ) : null}
            <h3 className="type-section">{title}</h3>
            {description ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p> : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    )
}

export { EmptyState }
