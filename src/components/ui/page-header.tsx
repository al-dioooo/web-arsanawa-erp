import Link from "next/link"
import type { ReactNode } from "react"
import { EnterTransition } from "@/components/ui/enter"
import { Icon } from "@/components/ui/icon"
import { DUR } from "@/lib/motion"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
    /**
     * "page" (default) renders the bold uppercase brand eyebrow used by module
     * pages; "greeting" renders a quiet type-eyebrow line (e.g. a date line or
     * "Hi …") for dashboard-style greetings.
     */
    variant?: "page" | "greeting"
    eyebrow?: ReactNode
    title: ReactNode
    subtitle?: ReactNode
    /** Status pills / meta rendered in a row under the title. */
    status?: ReactNode
    /** Right-hand action slot; wraps under the title block on mobile. */
    actions?: ReactNode
    /** When set, renders a back link above the eyebrow/title. */
    backHref?: string
    /** Label for the back link. Defaults to "Back". */
    backLabel?: ReactNode
    className?: string
    /** Optional data-* attribute name to stamp on the wrapper (for test hooks). */
    dataAttribute?: string
}

/**
 * Unified page header shared by every module. Title-on-background pattern:
 * it sits directly on the canvas with no card chrome, owning the back link,
 * eyebrow, brand title, subtitle, and status row so those stop drifting
 * between modules; module-specific actions render in the right-hand slot.
 */
export function PageHeader({
    variant = "page",
    eyebrow,
    title,
    subtitle,
    status,
    actions,
    backHref,
    backLabel = "Back",
    className,
    dataAttribute,
}: PageHeaderProps) {
    const dataProps = dataAttribute ? { [dataAttribute]: "" } : {}

    return (
        <EnterTransition
            as="header"
            from="top"
            distance={6}
            duration={DUR.base}
            {...dataProps}
            className={cn("mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}
        >
            <div className="min-w-0">
                {backHref ? (
                    <Link
                        href={backHref}
                        className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted transition-colors hover:text-brand-ink"
                    >
                        <Icon name="chevron_left" size={16} />
                        {backLabel}
                    </Link>
                ) : null}
                {eyebrow ? (
                    <p
                        className={cn(
                            "mb-2 flex items-center gap-2",
                            variant === "greeting"
                                ? "type-eyebrow"
                                : "font-display text-xs font-bold uppercase tracking-wider text-brand-ink",
                        )}
                    >
                        {eyebrow}
                    </p>
                ) : null}
                <h1 className="type-page-title">{title}</h1>
                {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{subtitle}</p> : null}
                {status ? <div className="mt-3 flex flex-wrap items-center gap-2">{status}</div> : null}
            </div>
            {actions ? <div className="flex min-h-10 flex-wrap items-center gap-2">{actions}</div> : null}
        </EnterTransition>
    )
}
