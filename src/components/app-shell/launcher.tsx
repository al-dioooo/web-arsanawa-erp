"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { buildConsoleTiles } from "@/lib/console/tiles"
import { moduleRegistry } from "@/lib/modules/registry"
import { EnterTransition } from "@/components/ui/enter"
import { Icon } from "@/components/ui/icon"

type LauncherTile = {
    key: string
    label: string
    icon: string
    accentColor: string
    route: string
}

/**
 * The waffle app launcher — the quick-access "all apps" menu in the topbar.
 *
 * Always lists the console apps (Organization for everyone, Module Manager
 * for admins) and then every enabled module the user has permission for.
 */
export function ModuleLauncher() {
    const { modules, activeCompanyId, companies, organizationContext, user } = useSession()
    const t = useTranslations()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) setIsOpen(false)
        })
        return () => {
            active = false
        }
    }, [pathname])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
            document.addEventListener("keydown", handleKeyDown)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [isOpen])

    const enabledSet = new Set(modules?.enabled ?? [])
    const activeCompany = companies.find((entry) => entry.company.id === activeCompanyId)?.company
    const consoleTiles: LauncherTile[] = buildConsoleTiles({
        t,
        activeCompany,
        membership: organizationContext?.membership,
        user,
    })

    const moduleTiles: LauncherTile[] = moduleRegistry
        .filter((m) => enabledSet.has(m.key))
        .map((m) => ({
            key: m.key,
            label: m.label,
            icon: m.icon,
            accentColor: m.accentColor,
            route: m.route,
        }))

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink transition-all duration-150 outline-none cursor-pointer"
                title={t("launcher.button")}
                aria-label={t("launcher.button")}
            >
                <Icon name="apps" className="text-2xl" />
            </button>

            {isOpen && (
                <EnterTransition role="dialog" aria-label={t("launcher.button")} duration={0.2} className="absolute right-0 top-12 z-50 w-80 rounded-lg bg-surface-raised p-4 shadow-card-hover">
                    {moduleTiles.length > 0 && (
                        <div>
                            <LauncherSection title={t("launcher.applications")} tiles={moduleTiles} pathname={pathname} />
                        </div>
                    )}
                    <div className={moduleTiles.length > 0 ? "mt-4" : ""}>
                        <LauncherSection title={t("launcher.console")} tiles={consoleTiles} pathname={pathname} />
                    </div>
                </EnterTransition>
            )}
        </div>
    )
}

function LauncherSection({
    title,
    tiles,
    pathname,
}: {
    title: string
    tiles: LauncherTile[]
    pathname: string
}) {
    return (
        <div>
            <div className="mb-3 px-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display">
                    {title}
                </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {tiles.map((tile) => {
                    const active = pathname === tile.route || pathname.startsWith(`${tile.route}/`)
                    return (
                        <Link
                            key={tile.key}
                            href={tile.route}
                            className={`flex flex-col items-center justify-center rounded-md p-3 text-center transition-all duration-150 group outline-none ${active ? "bg-surface-muted" : "hover:bg-surface-muted/70"}`}
                        >
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-md transition-transform duration-150 motion-safe:group-hover:scale-105 motion-safe:group-active:scale-95"
                                style={{
                                    backgroundColor: `${tile.accentColor}15`,
                                    color: tile.accentColor,
                                }}
                            >
                                <Icon name={tile.icon} className="text-2xl" />
                            </div>
                            <span className="mt-2 text-xs font-semibold text-ink-secondary group-hover:text-ink truncate w-full px-1">
                                {tile.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
