"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/features/auth/session-provider"
import { canManageEntitlements } from "@/features/auth/access"
import { moduleRegistry } from "@/lib/modules/registry"
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
    const { modules, organizationContext } = useSession()
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
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen])

    const canManageModules = canManageEntitlements(organizationContext?.membership)
    const enabledSet = new Set(modules?.enabled ?? [])

    const consoleTiles: LauncherTile[] = [
        {
            key: "organization",
            label: "Organization",
            icon: "corporate_fare",
            accentColor: "#0b5c6a",
            route: "/organization/companies",
        },
        {
            key: "profile",
            label: "Profile",
            icon: "manage_accounts",
            accentColor: "#137d90",
            route: "/profile",
        },
        {
            key: "partners",
            label: "Partners",
            icon: "groups",
            accentColor: "#f47b50",
            route: "/partners",
        },
        {
            key: "platform-settings",
            label: "Settings",
            icon: "tune",
            accentColor: "#6f7d90",
            route: "/platform/settings",
        },
        ...(canManageModules
            ? [
                  {
                      key: "module-manager",
                      label: "Module Manager",
                      icon: "settings_suggest",
                      accentColor: "#137d90",
                      route: "/organization/modules",
                  } satisfies LauncherTile,
              ]
            : []),
    ]

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
                className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-100 hover:text-navy-900 transition-all duration-150 outline-none cursor-pointer"
                title="App Launcher"
                aria-label="App Launcher"
            >
                <Icon name="apps" className="text-2xl" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-navy-100 bg-white p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <LauncherSection title="Console" tiles={consoleTiles} pathname={pathname} />
                    {moduleTiles.length > 0 && (
                        <div className="mt-4">
                            <LauncherSection title="Applications" tiles={moduleTiles} pathname={pathname} />
                        </div>
                    )}
                </div>
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">
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
                            className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all duration-150 group outline-none ${active ? "bg-navy-100/50" : "hover:bg-navy-50"}`}
                        >
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
                                style={{
                                    backgroundColor: `${tile.accentColor}15`,
                                    color: tile.accentColor,
                                }}
                            >
                                <Icon name={tile.icon} className="text-2xl" />
                            </div>
                            <span className="mt-2 text-xs font-semibold text-navy-700 group-hover:text-navy-900 truncate w-full px-1">
                                {tile.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
