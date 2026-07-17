import type { Transition, Variants } from "motion/react"

/*
 * Motion tokens — the JS mirror of the CSS motion vars in globals.css.
 *
 * When to use what:
 * - CSS (Tailwind `transition-*`) for state changes on already-mounted
 *   elements driven by class/pseudo-class toggles: hover colors, focus
 *   rings, shadow elevation, the mobile sidebar translate.
 * - Motion components for mount/unmount (AnimatePresence), orchestration
 *   (variants/stagger), position-tracking indicators (Highlight), gesture
 *   physics (button press), and JS-driven values (count-up, pathLength).
 * - Never both on the same property of the same element: a motion element
 *   may carry `transition-colors`, never `transition-all`/`transition-transform`.
 */

/** Duration scale in seconds (CSS vars use ms). */
export const DUR = {
    instant: 0.1,
    fast: 0.15,
    base: 0.2,
    slow: 0.3,
    slower: 0.5,
} as const

type Bezier = [number, number, number, number]

export const EASE: Record<"out" | "in" | "standard", Bezier> = {
    /** Entrances and movement — easeOutQuad. */
    out: [0.25, 0.46, 0.45, 0.94],
    /** Exits — accelerate away. */
    in: [0.4, 0, 1, 1],
    /** Color/opacity/backdrop fades. */
    standard: [0.4, 0, 0.2, 1],
}

/**
 * Named springs. Every entry is ~critically damped (damping ratio
 * ζ = damping / 2√(stiffness·mass) ≥ 0.99) — zero overshoot, matching the
 * design-system rule "gentle, non-bouncy". Guarded by a ζ-invariant test.
 */
export const SPRING = {
    /** Button/gesture micro-interactions. */
    press: { type: "spring", stiffness: 520, damping: 34, mass: 0.55 },
    /** Card/link hover lift. */
    hover: { type: "spring", stiffness: 420, damping: 32, mass: 0.6 },
    /** Highlight pill sliding between nav items. */
    marker: { type: "spring", stiffness: 380, damping: 30, mass: 0.6 },
    /** Command palette / centered panels. */
    panel: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
} as const satisfies Record<string, Transition>

export const transitions = {
    enter: { duration: DUR.base, ease: EASE.out },
    exit: { duration: DUR.fast, ease: EASE.in },
    backdrop: { duration: 0.18, ease: EASE.standard },
    drawer: { duration: DUR.slow, ease: EASE.out },
    drawerExit: { duration: 0.25, ease: EASE.in },
} as const satisfies Record<string, Transition>

/* ─── Shared variants ──────────────────────────────────────────────── */

export const fade: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: transitions.enter },
}

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE.out } },
}

export function staggerContainer(stagger = 0.05, delayChildren = 0.05): Variants {
    return {
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren } },
    }
}

/* Modal / drawer presence variants (used by the Modal primitive). */

export const modalBackdropVariants: Variants = {
    hidden: { opacity: 0, transition: transitions.exit },
    show: { opacity: 1, transition: transitions.backdrop },
}

export const modalPanelVariants: Variants = {
    hidden: { opacity: 0, scale: 0.98, transition: transitions.exit },
    show: { opacity: 1, scale: 1, y: 0, transition: transitions.enter },
    initial: { opacity: 0, scale: 0.96, y: 8 },
}

export const drawerPanelVariants: Variants = {
    hidden: { x: "100%", transition: transitions.drawerExit },
    show: { x: 0, transition: transitions.drawer },
    initial: { x: "100%" },
}
