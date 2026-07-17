import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Loading placeholder bar. Purely decorative — always aria-hidden; pair
 * with a visually-hidden status message or aria-busy on the region if the
 * loading state needs announcing.
 */
function Skeleton({ className, ...props }: ComponentPropsWithoutRef<"div">) {
    return (
        <div
            data-slot="skeleton"
            aria-hidden="true"
            className={cn("animate-pulse motion-reduce:animate-none rounded-sm bg-skeleton", className)}
            {...props}
        />
    )
}

/* Cycled widths so stacked bars read as ragged text, not a solid block. */
const TEXT_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-full", "w-5/6"] as const

type SkeletonTextProps = {
    /** Number of text bars to stack. */
    lines?: number
    className?: string
}

/** Paragraph placeholder — stacked bars with varying widths, shorter last line. */
function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
    return (
        <div data-slot="skeleton-text" aria-hidden="true" className={cn("space-y-2", className)}>
            {Array.from({ length: lines }, (_, index) => (
                <Skeleton
                    key={index}
                    className={cn(
                        "h-3.5",
                        index === lines - 1 && lines > 1 ? "w-2/3" : TEXT_WIDTHS[index % TEXT_WIDTHS.length],
                    )}
                />
            ))}
        </div>
    )
}

/** Card-shaped placeholder matching the Card primitive's label/value layout. */
function SkeletonCard({ className }: { className?: string }) {
    return (
        <div
            data-slot="skeleton-card"
            aria-hidden="true"
            className={cn("rounded-lg bg-surface p-5 shadow-card", className)}
        >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
        </div>
    )
}

export { Skeleton, SkeletonCard, SkeletonText }
