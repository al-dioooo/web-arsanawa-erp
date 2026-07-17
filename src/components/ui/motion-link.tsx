"use client"

import Link, { type LinkProps } from "next/link"
import { m, useReducedMotion } from "motion/react"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { Icon } from "@/components/ui/icon"
import { SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

type MotionLinkItemProps = LinkProps &
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
        label: string
        icon?: string
        children?: ReactNode
    }

export function MotionLinkItem({
    label,
    icon,
    children,
    className,
    ...props
}: MotionLinkItemProps) {
    const shouldReduceMotion = useReducedMotion()

    return (
        <m.div
            whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
            whileTap={shouldReduceMotion ? undefined : { y: 0, scale: 0.985 }}
            transition={SPRING.hover}
        >
            <Link
                data-motion-control="link-item"
                className={cn(
                    "group flex min-h-24 flex-col justify-between rounded-lg bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    className,
                )}
                {...props}
            >
                <span className="flex items-center gap-2 text-sm font-bold text-ink">
                    {icon ? <Icon name={icon} className="text-brand-ink" /> : null}
                    {label}
                </span>
                {children ? <span className="mt-3 text-xs leading-relaxed text-ink-muted">{children}</span> : null}
            </Link>
        </m.div>
    )
}
