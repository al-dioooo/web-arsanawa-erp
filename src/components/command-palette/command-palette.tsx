"use client"

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { AnimatePresence, m } from "motion/react"
import { Icon } from "@/components/ui/icon"
import { Highlight, HighlightItem } from "@/components/ui/highlight"
import { SPRING, transitions } from "@/lib/motion"
import { useCommandPalette } from "@/lib/search/command-palette-context"
import { searchRegistry, searchGroups, type SearchItem } from "@/lib/search/registry"
import { cn } from "@/lib/utils"

// ── Motion presets (shared tokens) ────────────────────────────────────────────

const BACKDROP_TRANSITION = transitions.backdrop
const PANEL_TRANSITION = SPRING.panel

// ── Filtering ─────────────────────────────────────────────────────────────────

function filterItems(query: string): SearchItem[] {
    if (!query.trim()) return searchRegistry
    const q = query.toLowerCase()
    return searchRegistry.filter(
        (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.includes(q))
    )
}

// ── Group accent colours ──────────────────────────────────────────────────────

const GROUP_ACCENT: Record<string, string> = {
    "Quick Actions":      "text-teal-700",
    "Console":            "text-teal-700",
    "Finance":            "text-amber-600",
    "Finance — Reports":  "text-amber-600",
    "Finance — Settings": "text-amber-600",
    "Inventory":          "text-orange-500",
    "Organization":       "text-navy-500",
}

// ── Result row ────────────────────────────────────────────────────────────────

function ResultRow({ item }: { item: SearchItem }) {
    return (
        <div className="group relative z-10 flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5">
            {/* Icon chip */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100/60 transition-colors group-data-[active=true]:bg-white group-data-[active=true]:shadow-sm group-data-[hovered=true]:bg-white group-data-[hovered=true]:shadow-sm">
                <Icon
                    name={item.icon}
                    size={16}
                    className="text-navy-500 transition-colors group-data-[active=true]:text-teal-700 group-data-[hovered=true]:text-teal-700"
                />
            </div>

            {/* Labels */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-700 transition-colors group-data-[active=true]:text-navy-900 group-data-[hovered=true]:text-navy-900">
                    {item.label}
                </p>
                <p className="truncate text-xs text-navy-400">{item.description}</p>
            </div>

            {/* Enter hint — slides in when active */}
            <kbd className="shrink-0 rounded-md border border-navy-200 bg-white px-1.5 py-0.5 font-display text-[10px] font-bold text-navy-400 shadow-sm opacity-0 transition-opacity group-data-[active=true]:opacity-100">
                ↵
            </kbd>
        </div>
    )
}

// ── Inner panel (rendered when open) ─────────────────────────────────────────

function CommandPalettePanel({ onClose }: { onClose: () => void }) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    // Build flat list preserving group order
    const flatItems = useMemo(() => {
        const filtered = filterItems(query)
        return searchGroups.flatMap((g) => filtered.filter((i) => i.group === g))
    }, [query])

    // Grouped map for rendering
    const grouped = useMemo(() => {
        const map = new Map<string, SearchItem[]>()
        for (const item of flatItems) {
            if (!map.has(item.group)) map.set(item.group, [])
            map.get(item.group)!.push(item)
        }
        return map
    }, [flatItems])

    // Focus input on mount
    useEffect(() => {
        requestAnimationFrame(() => inputRef.current?.focus())
    }, [])

    const selectedIndex = Math.min(activeIndex, Math.max(flatItems.length - 1, 0))

    // Scroll active item into view on keyboard navigation
    useEffect(() => {
        const active = flatItems[selectedIndex]
        if (!active) return
        document.getElementById(`cmd-item-${active.id}`)?.scrollIntoView({ block: "nearest" })
    }, [selectedIndex, flatItems])

    // Update live region
    const liveRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!liveRef.current) return
        liveRef.current.textContent =
            flatItems.length === 0
                ? "No results found."
                : `${flatItems.length} result${flatItems.length === 1 ? "" : "s"}.`
    }, [flatItems.length])

    const navigate = useCallback(
        (item: SearchItem) => {
            router.push(item.href)
            onClose()
        },
        [router, onClose]
    )

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault()
                    setActiveIndex((i) => (i + 1) % Math.max(flatItems.length, 1))
                    break
                case "ArrowUp":
                    e.preventDefault()
                    setActiveIndex((i) =>
                        i <= 0 ? Math.max(flatItems.length - 1, 0) : i - 1
                    )
                    break
                case "Tab":
                    e.preventDefault()
                    if (e.shiftKey) {
                        setActiveIndex((i) => (i <= 0 ? Math.max(flatItems.length - 1, 0) : i - 1))
                    } else {
                        setActiveIndex((i) => (i + 1) % Math.max(flatItems.length, 1))
                    }
                    break
                case "Enter":
                    e.preventDefault()
                    if (flatItems[selectedIndex]) navigate(flatItems[selectedIndex])
                    break
                case "Escape":
                    e.preventDefault()
                    onClose()
                    break
            }
        },
        [flatItems, selectedIndex, navigate, onClose]
    )

    const activeItemId = flatItems[selectedIndex]?.id ?? null

    return (
        <>
            {/* Screen-reader live region */}
            <div ref={liveRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

            {/* ── Search input ─────────────────────────────────────────── */}
            <div className="flex items-center gap-3 border-b border-navy-100 px-4 py-3.5">
                <Icon name="search" size={20} className="shrink-0 text-navy-400" />
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded
                    aria-controls="cmd-listbox"
                    aria-activedescendant={activeItemId ? `cmd-item-${activeItemId}` : undefined}
                    aria-autocomplete="list"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Search pages, actions, reports…"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setActiveIndex(0)
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-sm font-medium text-navy-900 outline-none placeholder:text-navy-300"
                />
                <kbd className="shrink-0 rounded-md border border-navy-200 bg-navy-50 px-1.5 py-0.5 font-display text-[10px] font-bold text-navy-400">
                    ESC
                </kbd>
            </div>

            {/* ── Results ──────────────────────────────────────────────── */}
            <div
                id="cmd-listbox"
                role="listbox"
                aria-label="Search results"
                className="max-h-[360px] overflow-y-auto overscroll-contain"
            >
                {flatItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50">
                            <Icon name="search_off" size={24} className="text-navy-300" />
                        </div>
                        <p className="text-sm font-semibold text-navy-700">
                            No results for &ldquo;{query}&rdquo;
                        </p>
                        <p className="mt-1 text-xs text-navy-400">
                            Try a different keyword or browse the sidebar.
                        </p>
                    </div>
                ) : (
                    /*
                     * Highlight wraps the scrollable content.
                     * It sits INSIDE the scroll container so position tracking
                     * stays correct as results scroll.
                     */
                    <Highlight
                        value={activeItemId}
                        className="rounded-xl bg-teal-50"
                        containerClassName="p-2"
                        hover={true}
                    >
                        {Array.from(grouped.entries()).map(([group, items]) => (
                            <div key={group} className="mb-1 last:mb-0">
                                {/* Group header */}
                                <div className="px-3 pb-1 pt-2">
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest font-display",
                                        GROUP_ACCENT[group] ?? "text-navy-400"
                                    )}>
                                        {group}
                                    </p>
                                </div>

                                {/* Items */}
                                {items.map((item) => {
                                    const flatIdx = flatItems.indexOf(item)
                                    return (
                                        <HighlightItem key={item.id} value={item.id}>
                                            <div
                                                id={`cmd-item-${item.id}`}
                                                role="option"
                                                aria-selected={flatIdx === selectedIndex}
                                                onMouseEnter={() => setActiveIndex(flatIdx)}
                                                onClick={() => navigate(item)}
                                            >
                                                <ResultRow item={item} />
                                            </div>
                                        </HighlightItem>
                                    )
                                })}
                            </div>
                        ))}
                    </Highlight>
                )}
            </div>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 border-t border-navy-100 bg-navy-50/50 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-400">
                    <kbd className="rounded border border-navy-200 bg-white px-1 py-0.5 font-display text-[10px] text-navy-500 shadow-sm">↑</kbd>
                    <kbd className="rounded border border-navy-200 bg-white px-1 py-0.5 font-display text-[10px] text-navy-500 shadow-sm">↓</kbd>
                    Navigate
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-400">
                    <kbd className="rounded border border-navy-200 bg-white px-1 py-0.5 font-display text-[10px] text-navy-500 shadow-sm">↵</kbd>
                    Open
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-400">
                    <kbd className="rounded border border-navy-200 bg-white px-1 py-0.5 font-display text-[10px] text-navy-500 shadow-sm">ESC</kbd>
                    Close
                </span>
                {flatItems.length > 0 && (
                    <span className="ml-auto text-[11px] font-semibold text-navy-300">
                        {flatItems.length} result{flatItems.length === 1 ? "" : "s"}
                    </span>
                )}
            </div>
        </>
    )
}

// ── Root export — only mounts panel DOM when open ─────────────────────────────

export function CommandPalette() {
    const { isOpen, close } = useCommandPalette()

    const content = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <m.div
                        key="cmd-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={BACKDROP_TRANSITION}
                        className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
                        aria-hidden="true"
                        onClick={close}
                    />

                    {/* Positioner */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Global search"
                        className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] pointer-events-none"
                    >
                        {/* Animated panel */}
                        <m.div
                            key="cmd-panel"
                            initial={{ opacity: 0, scale: 0.97, y: -12 }}
                            animate={{ opacity: 1, scale: 1,    y: 0 }}
                            exit={{    opacity: 0, scale: 0.97, y: -12 }}
                            transition={PANEL_TRANSITION}
                            className="w-full max-w-[640px] pointer-events-auto origin-top overflow-hidden rounded-lg bg-surface-raised shadow-card-hover"
                        >
                            <CommandPalettePanel onClose={close} />
                        </m.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )

    if (typeof window === "undefined") return null
    return createPortal(content, document.body)
}
