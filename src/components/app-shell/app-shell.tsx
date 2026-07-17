"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, m } from "motion/react"
import { useSession } from "@/features/auth/session-provider"
import { getModuleByPath } from "@/lib/modules/registry"
import { filterModuleForCompany } from "@/components/app-shell/module-filter"
import { EntitlementGuard } from "@/components/app-shell/guard"
import { Sidebar } from "@/components/app-shell/sidebar"
import { Topbar } from "@/components/app-shell/topbar"
import { transitions } from "@/lib/motion"

/**
 * App shell with two modes:
 *
 * - **Console mode** — when the path is not inside a module workspace
 *   (e.g. `/`, `/organization/...`). There is NO sidebar; the topbar has
 *   the app launcher and the profile menu only. The "console" is the
 *   launcher view itself.
 * - **Module mode** — when inside a module (e.g. `/inventory/...`). A
 *   290px sidebar shows the Arsanawa compact logo + the module's name
 *   (clickable → module dashboard) and the module's own nav. No console
 *   links, no active-context block. The topbar additionally shows the
 *   branch switcher for branch-scoped operations.
 *
 * Organization is intentionally NOT a module — it lives in the console and
 * is always available; its screens use console-mode layout.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || ""
    const { companies, activeCompanyId } = useSession()
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

    // Close the mobile sidebar on route change (deferred to avoid a
    // cascading render).
    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) setMobileSidebarOpen(false)
        })
        return () => {
            active = false
        }
    }, [pathname])

    const activeCompany = companies.find((entry) => entry.company.id === activeCompanyId)?.company
    const cateringOnly = activeCompany?.slug === "sekalori"
    const activeModule = getModuleByPath(pathname)
    const filteredModule = activeModule ? filterModuleForCompany(activeModule, cateringOnly) : undefined
    const inModule = Boolean(filteredModule)

    return (
        <div className="min-h-screen bg-background font-body text-foreground">
            {/* ── Mobile sidebar backdrop (module mode only) ─────────────── */}
            <AnimatePresence>
                {inModule && mobileSidebarOpen && (
                    <m.div
                        key="sidebar-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={transitions.backdrop}
                        className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm lg:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Module sidebar (only in module mode) ───────────────────── */}
            {filteredModule && (
                <Sidebar
                    module={filteredModule}
                    pathname={pathname}
                    mobileOpen={mobileSidebarOpen}
                    onCloseMobile={() => setMobileSidebarOpen(false)}
                />
            )}

            {/* ── Main column ────────────────────────────────────────────── */}
            <div className={`flex min-h-screen flex-col ${inModule ? "lg:pl-[290px]" : ""}`}>
                <Topbar inModule={inModule} onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

                {/* Workspace */}
                <main className="mx-auto w-full max-w-7xl flex-1 p-6">
                    <EntitlementGuard>{children}</EntitlementGuard>
                </main>
            </div>
        </div>
    )
}
