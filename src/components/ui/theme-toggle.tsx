"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import { useTranslations } from "next-intl"
import { Icon } from "@/components/ui/icon"
import { DUR, EASE } from "@/lib/motion"
import { cn } from "@/lib/utils"

const OPTIONS = [
    { value: "light", icon: "light_mode", labelKey: "themeLight" },
    { value: "system", icon: "desktop_windows", labelKey: "themeSystem" },
    { value: "dark", icon: "dark_mode", labelKey: "themeDark" },
] as const

const subscribeNoop = () => () => {}
const getTrue = () => true
const getFalse = () => false

/**
 * Light / System / Dark segmented control for the profile menu.
 *
 * Renders a placeholder until mounted — next-themes resolves the stored
 * theme on the client only, so rendering the active state on the server
 * would cause a hydration mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
    const t = useTranslations("shell")
    const { theme, setTheme } = useTheme()
    const shouldReduceMotion = useReducedMotion()
    // Hydration guard without a setState-in-effect: server snapshot is false,
    // client snapshot is true, so the active state only renders post-hydration.
    const mounted = useSyncExternalStore(subscribeNoop, getTrue, getFalse)

    const active = mounted ? (theme ?? "system") : null

    const applyTheme = (value: string) => {
        // Progressive enhancement: crossfade the whole page via the browser's
        // View Transition when available; instant swap otherwise.
        if (
            !shouldReduceMotion &&
            typeof document !== "undefined" &&
            "startViewTransition" in document
        ) {
            document.startViewTransition(() => setTheme(value))
        } else {
            setTheme(value)
        }
    }

    return (
        <div
            role="radiogroup"
            aria-label={t("appearance")}
            className={cn("flex rounded-md bg-surface-muted p-1", className)}
        >
            {OPTIONS.map((option) => {
                const isActive = active === option.value
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        title={t(option.labelKey)}
                        onClick={() => applyTheme(option.value)}
                        className={cn(
                            "flex min-h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-semibold transition-colors",
                            isActive
                                ? "bg-surface text-brand-ink shadow-card"
                                : "text-ink-muted hover:text-ink-secondary"
                        )}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <m.span
                                key={`${option.value}-${isActive}`}
                                initial={{ rotate: -45, scale: 0.6, opacity: 0 }}
                                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                                transition={{ duration: DUR.base, ease: EASE.out }}
                                className="flex items-center"
                            >
                                <Icon name={option.icon} size={16} />
                            </m.span>
                        </AnimatePresence>
                        <span className="sr-only">{t(option.labelKey)}</span>
                    </button>
                )
            })}
        </div>
    )
}
