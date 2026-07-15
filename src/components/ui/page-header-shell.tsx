import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Canonical page-header shell shared by every module. It owns the card wrapper,
 * eyebrow, brand title, and subtitle so those stop drifting between modules;
 * module-specific actions/status render in the right-hand slot via `children`.
 */
export function PageHeaderShell({
    eyebrow,
    title,
    subtitle,
    children,
    className,
    dataAttribute,
}: {
    eyebrow?: ReactNode
    title: ReactNode
    subtitle?: ReactNode
    /** Right-hand slot for actions / status pills. */
    children?: ReactNode
    className?: string
    /** Optional data-* attribute name to stamp on the wrapper (for test hooks). */
    dataAttribute?: string
}) {
    const dataProps = dataAttribute ? { [dataAttribute]: "" } : {}

    return (
        <header {...dataProps} className={cn("rounded-2xl border border-navy-100 bg-white p-6", className)}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    {eyebrow ? (
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className="mt-2 font-brand text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
                    {subtitle ? (
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500">{subtitle}</p>
                    ) : null}
                </div>
                {children}
            </div>
        </header>
    )
}
