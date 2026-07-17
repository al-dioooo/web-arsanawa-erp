"use client"

import { animate, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { EASE } from "@/lib/motion"

type UseCountUpOptions = {
    /** Animation duration in seconds. */
    duration?: number
    /**
     * Turns the animated number into the displayed string.
     *
     * MUST be referentially stable — pass a memoized `Intl.NumberFormat`
     * bound instance (e.g. `useMemo(() => new Intl.NumberFormat(...))` and
     * `formatter={nf.format.bind(nf)}` memoized together, or a module-level
     * const). A new function identity on every render restarts the effect.
     */
    formatter: (n: number) => string
}

/**
 * Animated count-up for dashboard metrics.
 *
 * - First render returns the final formatted value (SSR-safe — server and
 *   first client paint match; animation only ever starts in an effect).
 * - When `value` changes, animates from the previously displayed value to
 *   the new one — never from 0 — and stops cleanly on unmount.
 * - `prefers-reduced-motion` snaps straight to the final value.
 *
 * The host element should use `tabular-nums` (CardValue already does) so
 * digits don't jitter horizontally while animating.
 */
export function useCountUp(value: number, { duration = 0.7, formatter }: UseCountUpOptions): string {
    const shouldReduceMotion = useReducedMotion()
    /** Last value actually shown — mid-flight interruptions resume from here. */
    const shownRef = useRef(value)
    const [display, setDisplay] = useState(() => formatter(value))

    useEffect(() => {
        const from = shownRef.current

        if (shouldReduceMotion || from === value || !Number.isFinite(value) || !Number.isFinite(from)) {
            shownRef.current = value
            setDisplay(formatter(value))
            return
        }

        const controls = animate(from, value, {
            duration,
            ease: EASE.out,
            onUpdate: (latest) => {
                shownRef.current = latest
                setDisplay(formatter(latest))
            },
            // The last onUpdate frame isn't guaranteed to land exactly on the
            // target — snap to the exact final value when the tween finishes.
            onComplete: () => {
                shownRef.current = value
                setDisplay(formatter(value))
            },
        })

        return () => controls.stop()
    }, [value, duration, formatter, shouldReduceMotion])

    return display
}
