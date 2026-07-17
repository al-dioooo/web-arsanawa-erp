"use client"

import { m, type HTMLMotionProps } from "motion/react"
import { Children, type ElementType } from "react"

import { fadeUp, staggerContainer } from "@/lib/motion"

const GROUP_TAGS = {
    div: m.div,
    section: m.section,
    ul: m.ul,
    ol: m.ol,
} as const

const ITEM_TAGS = {
    div: m.div,
    li: m.li,
    article: m.article,
} as const

type GroupTag = keyof typeof GROUP_TAGS
type ItemTag = keyof typeof ITEM_TAGS

const BASE_STAGGER = 0.05
const MAX_TOTAL_STAGGER = 0.35
const CLAMP_THRESHOLD = 8

/**
 * Per-child stagger interval. Above {@link CLAMP_THRESHOLD} children the
 * interval shrinks so the whole cascade never exceeds
 * {@link MAX_TOTAL_STAGGER} seconds.
 */
export function staggerInterval(count: number): number {
    return count > CLAMP_THRESHOLD ? Math.min(BASE_STAGGER, MAX_TOTAL_STAGGER / count) : BASE_STAGGER
}

type StaggerGroupProps<T extends GroupTag = "div"> = Omit<
    HTMLMotionProps<T>,
    "variants" | "initial" | "animate"
> & {
    /** Element to render. Defaults to a plain div. */
    as?: T
}

/**
 * Orchestrates a one-shot staggered entrance for its {@link StaggerItem}
 * children (fade + rise, clamped so long lists don't crawl).
 *
 * Dashboard-only: reserve this for the dashboard KPI/summary grids. List
 * pages, tables and forms mount statically — do not wrap arbitrary page
 * content in a stagger.
 *
 * Reduced motion is handled by the global `MotionConfig reducedMotion="user"`
 * (the y-rise is dropped, leaving only the fade).
 */
function StaggerGroup<T extends GroupTag = "div">({ as, children, ...props }: StaggerGroupProps<T>) {
    const Component = GROUP_TAGS[as ?? "div"] as ElementType
    const interval = staggerInterval(Children.count(children))

    return (
        <Component
            data-slot="stagger-group"
            variants={staggerContainer(interval)}
            initial="hidden"
            animate="show"
            {...props}
        >
            {children}
        </Component>
    )
}

type StaggerItemProps<T extends ItemTag = "div"> = Omit<HTMLMotionProps<T>, "variants"> & {
    /** Element to render. Defaults to a plain div. */
    as?: T
}

/** Child of {@link StaggerGroup} — fades up when the group cascades in. */
function StaggerItem<T extends ItemTag = "div">({ as, ...props }: StaggerItemProps<T>) {
    const Component = ITEM_TAGS[as ?? "div"] as ElementType

    return <Component data-slot="stagger-item" variants={fadeUp} {...props} />
}

export { StaggerGroup, StaggerItem }
