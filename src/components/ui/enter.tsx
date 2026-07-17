"use client"

import { m, useReducedMotion, type HTMLMotionProps } from "motion/react"
import type { ElementType } from "react"
import { DUR, EASE } from "@/lib/motion"

const MOTION_TAGS = {
    div: m.div,
    form: m.form,
} as const

type EnterTag = keyof typeof MOTION_TAGS

type EnterFrom = "top" | "bottom" | "right" | "none"

type EnterTransitionProps<T extends EnterTag = "div"> = Omit<
    HTMLMotionProps<T>,
    "initial" | "animate" | "exit" | "transition"
> & {
    /** Element to render. Defaults to a plain div. */
    as?: T
    /** Edge the element enters from. "none" fades/scales in place. */
    from?: EnterFrom
    /**
     * Travel distance. A number is treated as px; strings accept any CSS
     * length (e.g. "100%" for a full-width drawer slide).
     */
    distance?: number | string
    /** Fade in from transparent. Turn off for slide-only drawers. */
    fade?: boolean
    /** Starting scale for a subtle pop (e.g. 0.95 for dialogs). */
    scale?: number
    /** Enter duration in seconds. */
    duration?: number
}

function negate(distance: number | string): number | string {
    return typeof distance === "number" ? -distance : `-${distance}`
}

/**
 * Shared enter transition for popovers, menus, dialog panels, drawers and
 * sections that mount into view.
 *
 * Enter-only by design: it animates on mount and does nothing on unmount,
 * matching the previous tw-animate-css behavior. A deliberate `tween`
 * with easeOut is used instead of Motion's default spring so the timing
 * stays precise and matches the previous ~150ms CSS feel (see the motion
 * skill: tweens for UI transitions with precise timing).
 *
 * Honors `prefers-reduced-motion`: movement and scale are skipped, leaving
 * only the fade (or no animation at all when `fade` is off).
 */
export function EnterTransition<T extends EnterTag = "div">({
    as,
    from = "top",
    distance = 8,
    fade = true,
    scale = 1,
    duration = DUR.fast,
    ...props
}: EnterTransitionProps<T>) {
    const shouldReduceMotion = useReducedMotion()
    const Component = MOTION_TAGS[as ?? "div"] as ElementType

    const offset =
        from === "top"
            ? { y: negate(distance) }
            : from === "bottom"
              ? { y: distance }
              : from === "right"
                ? { x: distance }
                : undefined

    const initial = shouldReduceMotion
        ? fade
            ? { opacity: 0 }
            : false
        : { opacity: fade ? 0 : 1, scale, ...offset }

    return (
        <Component
            initial={initial}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ duration, ease: EASE.out }}
            {...props}
        />
    )
}
