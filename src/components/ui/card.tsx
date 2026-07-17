import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentPropsWithoutRef, ElementType } from "react"

import { cn } from "@/lib/utils"

/**
 * Card surface — the Arsanawa DS card: soft 20px radius, elevation via
 * shadow, never a border. `inset` flips the card into a muted well
 * (bg-surface-muted, no shadow) for nested/secondary content.
 */
const cardVariants = cva("rounded-lg text-ink", {
    variants: {
        padding: {
            none: "",
            sm: "p-4",
            md: "p-5",
            lg: "p-6",
        },
        hover: {
            true: "transition-shadow duration-200 hover:shadow-card-hover",
        },
        /* Surface + elevation live on this variant (not the base) so the
           two states never emit conflicting shadow-* classes — twMerge
           can't reconcile shadow-card vs shadow-none. */
        inset: {
            false: "bg-surface shadow-card",
            true: "bg-surface-muted shadow-none",
        },
    },
    defaultVariants: {
        padding: "md",
        inset: false,
    },
})

type CardOwnProps<T extends ElementType> = VariantProps<typeof cardVariants> & {
    /** Element to render. Defaults to a plain div. */
    as?: T
    className?: string
}

type CardProps<T extends ElementType> = CardOwnProps<T> &
    Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>

function Card<T extends ElementType = "div">({
    as,
    padding,
    hover,
    inset,
    className,
    ...props
}: CardProps<T>) {
    const Component = (as ?? "div") as ElementType

    return (
        <Component
            data-slot="card"
            className={cn(cardVariants({ padding, hover, inset, className }))}
            {...props}
        />
    )
}

/** Muted 12px label above a card metric (type-card-label role). */
function CardLabel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
    return <div data-slot="card-label" className={cn("type-card-label", className)} {...props} />
}

type CardValueProps = ComponentPropsWithoutRef<"div"> & {
    /** "lg" bumps the 24px value to 32px for hero metrics. */
    size?: "md" | "lg"
}

/**
 * Prominent card metric (type-card-value role). Uses tabular-nums so
 * animated values (useCountUp) don't jitter horizontally.
 */
function CardValue({ className, size = "md", ...props }: CardValueProps) {
    return (
        <div
            data-slot="card-value"
            className={cn("type-card-value tabular-nums", size === "lg" && "text-[32px]", className)}
            {...props}
        />
    )
}

export { Card, CardLabel, CardValue, cardVariants }
