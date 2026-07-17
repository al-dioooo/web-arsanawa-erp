"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { m, useReducedMotion, type HTMLMotionProps } from "motion/react"

import { SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "group/button cursor-pointer inline-flex shrink-0 items-center justify-center rounded-md font-bold text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:bg-line disabled:text-ink-faint [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default: "bg-brand text-white hover:bg-brand-hover",
                outline:
                    "border-2 border-brand bg-transparent text-brand-ink hover:bg-brand-soft/40",
                secondary:
                    "bg-surface-muted text-ink-secondary hover:bg-brand-soft hover:text-brand-ink",
                ghost: "bg-transparent text-ink-secondary hover:bg-surface-muted hover:text-brand-ink",
                // Raw orange is the sanctioned brand accent shade.
                accent: "bg-orange-500 text-white hover:bg-orange-700",
                destructive: "bg-error text-white hover:bg-error/90",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default:
                    "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
                xs: "h-6 gap-1 rounded-[10px] px-2 text-xs has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "gap-1 py-1 px-3 text-[0.8rem] has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3.5",
                lg: "h-9 gap-2 px-6 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
                xl: "h-11 gap-2 px-6 text-sm rounded-md",
                icon: "size-8",
                "icon-xs": "size-6 rounded-[10px] [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-7",
                "icon-lg": "size-9",
            },
            shape: {
                rounded: "",
                pill: "rounded-pill",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            shape: "rounded",
        },
    }
)

function Button({
    className,
    variant = "default",
    size = "default",
    shape = "rounded",
    disabled,
    ...props
}: HTMLMotionProps<"button"> & VariantProps<typeof buttonVariants>) {
    const shouldReduceMotion = useReducedMotion()
    const interactive = !disabled && !shouldReduceMotion

    return (
        <m.button
            data-slot="button"
            data-motion-control="button"
            disabled={disabled}
            whileHover={interactive ? { y: -1, scale: 1.015 } : undefined}
            whileTap={interactive ? { y: 0, scale: 0.97 } : undefined}
            transition={SPRING.press}
            className={cn(buttonVariants({ variant, size, shape, className }))}
            {...props}
        />
    )
}

export { Button, buttonVariants }
