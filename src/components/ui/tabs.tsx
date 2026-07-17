"use client"

import * as React from "react"
import { Highlight, HighlightItem } from "@/components/ui/highlight"
import { cn } from "@/lib/utils"

type TabsContextValue = {
    value: string
    onValueChange: (value: string) => void
    baseId: string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext(component: string): TabsContextValue {
    const context = React.useContext(TabsContext)
    if (!context) {
        throw new Error(`${component} must be used within <Tabs>`)
    }
    return context
}

type TabListVariant = "underline" | "segmented"

const TabListContext = React.createContext<TabListVariant>("underline")

/**
 * Controlled tabs root — provides value/onValueChange and id wiring to
 * TabList/Tab/TabPanel. Purely contextual; renders no element of its own.
 */
export function Tabs({
    value,
    onValueChange,
    children,
}: {
    value: string
    onValueChange: (value: string) => void
    children: React.ReactNode
}) {
    const baseId = React.useId()
    const context = React.useMemo(
        () => ({ value, onValueChange, baseId }),
        [value, onValueChange, baseId],
    )

    return <TabsContext.Provider value={context}>{children}</TabsContext.Provider>
}

type TabListProps = {
    /**
     * - `underline` (default): items sit on a bottom border with an animated
     *   2px brand underline sliding between them.
     * - `segmented`: pill container with a raised active segment.
     */
    variant?: TabListVariant
    className?: string
    children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "className">

export function TabList({ variant = "underline", className, children, ...props }: TabListProps) {
    const { value, onValueChange } = useTabsContext("TabList")
    const listRef = React.useRef<HTMLDivElement>(null)

    // Roving focus with automatic activation: arrows move between tabs
    // (wrapping), Home/End jump to the edges; the focused tab is selected.
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return

        const tabs = Array.from(
            listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])') ?? [],
        )
        if (tabs.length === 0) return

        const currentIndex = Math.max(
            tabs.findIndex((tab) => tab === document.activeElement),
            0,
        )

        let nextIndex: number
        switch (event.key) {
            case "ArrowRight":
                nextIndex = (currentIndex + 1) % tabs.length
                break
            case "ArrowLeft":
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
                break
            case "Home":
                nextIndex = 0
                break
            default:
                nextIndex = tabs.length - 1
        }

        event.preventDefault()
        const next = tabs[nextIndex]
        next.focus()
        const nextValue = next.dataset.tabValue
        if (nextValue !== undefined) {
            onValueChange(nextValue)
        }
    }

    if (variant === "segmented") {
        return (
            <div
                ref={listRef}
                role="tablist"
                onKeyDown={handleKeyDown}
                className={cn("inline-flex items-center gap-1 rounded-md bg-surface-muted p-1", className)}
                {...props}
            >
                <TabListContext.Provider value="segmented">{children}</TabListContext.Provider>
            </div>
        )
    }

    return (
        <div
            ref={listRef}
            role="tablist"
            onKeyDown={handleKeyDown}
            className={cn("border-b border-line", className)}
            {...props}
        >
            <TabListContext.Provider value="underline">
                <Highlight
                    value={value}
                    hover={false}
                    containerClassName="flex items-center gap-5"
                    className="after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand"
                >
                    {children}
                </Highlight>
            </TabListContext.Provider>
        </div>
    )
}

type TabProps = {
    value: string
    disabled?: boolean
    className?: string
    children: React.ReactNode
}

export function Tab({ value, disabled, className, children }: TabProps) {
    const { value: activeValue, onValueChange, baseId } = useTabsContext("Tab")
    const variant = React.useContext(TabListContext)
    const selected = activeValue === value

    const button = (
        <button
            type="button"
            role="tab"
            id={`${baseId}-tab-${value}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${value}`}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            data-tab-value={value}
            onClick={() => onValueChange(value)}
            className={cn(
                "cursor-pointer text-sm font-semibold transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50",
                variant === "underline"
                    ? cn("px-1 pb-2", selected ? "text-brand-ink" : "text-ink-muted hover:text-ink")
                    : cn(
                          "rounded-sm px-3 py-1.5",
                          selected ? "bg-surface text-brand-ink shadow-card" : "text-ink-muted hover:text-ink",
                      ),
                className,
            )}
        >
            {children}
        </button>
    )

    if (variant === "underline") {
        return <HighlightItem value={value}>{button}</HighlightItem>
    }
    return button
}

type TabPanelProps = {
    value: string
    className?: string
    children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "className">

export function TabPanel({ value, className, children, ...props }: TabPanelProps) {
    const { value: activeValue, baseId } = useTabsContext("TabPanel")
    const active = activeValue === value

    return (
        <div
            role="tabpanel"
            id={`${baseId}-panel-${value}`}
            aria-labelledby={`${baseId}-tab-${value}`}
            hidden={!active}
            tabIndex={0}
            className={className}
            {...props}
        >
            {children}
        </div>
    )
}
