"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "@/features/auth/session-provider"
import { getModuleByPath, type ModuleEntry, type NavItem } from "@/lib/modules/registry"
import { ModuleLauncher } from "@/components/app-shell/launcher"
import { EntitlementGuard } from "@/components/app-shell/guard"
import { CategoryTreeNav } from "@/components/app-shell/category-tree-nav"
import { Icon } from "@/components/ui/icon"
import { CheckIcon, ChevronDownIcon } from "@/components/icons/outline"
import { Highlight, HighlightItem } from "@/components/ui/highlight"
import Logo from "@/components/brands/logo"
import LogoCompact from "@/components/brands/logo-compact"

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
    const pathname = usePathname()
    const router = useRouter()
    const {
        user,
        companies,
        activeCompanyId,
        activeBranchId,
        organizationContext,
        selectCompany,
        selectBranch,
        logout,
    } = useSession()

    const [branchOpen, setBranchOpen] = useState(false)
    const [userOpen, setUserOpen] = useState(false)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

    const branchRef = useRef<HTMLDivElement>(null)
    const userRef = useRef<HTMLDivElement>(null)

    // Close menus on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node
            if (branchRef.current && !branchRef.current.contains(target)) {
                setBranchOpen(false)
            }
            if (userRef.current && !userRef.current.contains(target)) {
                setUserOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Close mobile sidebar on route change (deferred to avoid a cascading render)
    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) setMobileSidebarOpen(false)
        })
        return () => {
            active = false
        }
    }, [pathname])

    const activeCompany = companies.find((c) => c.company.id === activeCompanyId)?.company
    const activeBranch = organizationContext?.branches.find((b) => b.id === activeBranchId)
    const activeModule = getModuleByPath(pathname)
    const inModule = Boolean(activeModule)

    const handleSignOut = async () => {
        setUserOpen(false)
        await logout()
        router.push("/login")
    }

    const handleSwitchCompany = async (companyId: number) => {
        setUserOpen(false)
        await selectCompany(companyId)
        // Drop back to the console — the previous module may not be enabled
        // for the newly active company.
        router.push("/")
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-body">
            {/* ── Mobile sidebar backdrop (module mode only) ─────────────── */}
            {inModule && mobileSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-navy-900/40 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            {/* ── Module sidebar (only in module mode) ───────────────────── */}
            {inModule && activeModule && (
                <ModuleSidebar
                    module={activeModule}
                    pathname={pathname}
                    mobileOpen={mobileSidebarOpen}
                    onCloseMobile={() => setMobileSidebarOpen(false)}
                />
            )}

            {/* ── Main column ────────────────────────────────────────────── */}
            <div className={`flex flex-col min-h-screen ${inModule ? "lg:pl-[290px]" : ""}`}>
                {/* Topbar */}
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-navy-100/50 bg-white/80 px-6 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        {inModule && (
                            <button
                                type="button"
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50 lg:hidden cursor-pointer"
                                onClick={() => setMobileSidebarOpen(true)}
                                aria-label="Open module sidebar"
                            >
                                <Icon name="menu" className="text-2xl" />
                            </button>
                        )}
                        {!inModule && (
                            <Link href="/" className="flex items-center gap-2 select-none outline-none">
                                <Logo className="h-6 w-auto" />
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Branch switcher — only meaningful inside a module */}
                        {inModule && activeCompany && (
                            <div className="relative" ref={branchRef}>
                                <button
                                    type="button"
                                    onClick={() => setBranchOpen(!branchOpen)}
                                    className="flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 hover:bg-navy-50 transition-colors outline-none cursor-pointer"
                                >
                                    <Icon name="warehouse" className="text-sm text-orange-500" />
                                    <span className="max-w-[120px] text-sm truncate">
                                        {activeBranch ? activeBranch.name : "Select Branch"}
                                    </span>
                                    <ChevronDownIcon className="w-4 h-4 text-navy-400" />
                                </button>

                                {branchOpen && (
                                    <div className="absolute right-0 mt-2 z-50 w-64 rounded-lg border border-navy-100 bg-white py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="px-4 py-1.5 border-b border-navy-50 mb-1.5">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-navy-400 font-display">
                                                Switch Branch
                                            </p>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto px-1.5">
                                            {organizationContext?.branches && organizationContext.branches.length > 0 && (
                                                <Highlight
                                                    value={activeBranchId ? String(activeBranchId) : null}
                                                    containerClassName="flex flex-col gap-0.5"
                                                    className="bg-orange-50/70 rounded-md"
                                                    hover={true}
                                                >
                                                    {organizationContext.branches.map((branch) => (
                                                        <HighlightItem key={branch.id} value={String(branch.id)}>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    setBranchOpen(false)
                                                                    await selectBranch(branch.id)
                                                                }}
                                                                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors outline-none cursor-pointer ${branch.id === activeBranchId ? "text-orange-700" : "text-navy-700"}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-100 text-[10px] font-bold text-navy-600">
                                                                        {branch.code || "B"}
                                                                    </div>
                                                                    <span className="truncate text-sm">{branch.name}</span>
                                                                </div>
                                                                {branch.id === activeBranchId && (
                                                                    <div className="rounded-full bg-orange-500 p-1 text-white">
                                                                        <CheckIcon className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        </HighlightItem>
                                                    ))}
                                                </Highlight>
                                            )}
                                            {(!organizationContext?.branches || organizationContext.branches.length === 0) && (
                                                <div className="px-4 py-3 text-xs text-navy-400 text-center font-medium">
                                                    No branches available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Waffle app launcher */}
                        <ModuleLauncher />

                        {/* Profile dropdown — holds Switch Organization + Go to Console + Sign out */}
                        <div className="relative" ref={userRef}>
                            <button
                                type="button"
                                onClick={() => setUserOpen(!userOpen)}
                                className="flex items-center justify-center h-9 w-9 rounded-xl bg-teal-100 text-teal-700 font-bold border border-teal-200 hover:scale-102 active:scale-98 transition-all outline-none cursor-pointer"
                                aria-label="Account menu"
                            >
                                {user?.name.charAt(0).toUpperCase()}
                            </button>

                            {userOpen && (
                                <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-navy-100 bg-white py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="px-4 py-2 border-b border-navy-50 mb-1.5">
                                        <p className="truncate text-xs font-bold text-navy-950 leading-tight">
                                            {user?.name}
                                        </p>
                                        <p className="truncate text-[10px] text-navy-450 font-semibold mt-0.5">
                                            {user?.email}
                                        </p>
                                    </div>

                                    {/* Switch Organization — when the user belongs to more than one */}
                                    {companies.length > 1 && (
                                        <>
                                            <div className="px-4 pt-1.5 pb-1">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-navy-400 font-display">
                                                    Switch Organization
                                                </p>
                                            </div>
                                            <div className="max-h-44 overflow-y-auto px-1.5 mb-1.5">
                                                <Highlight
                                                    value={activeCompanyId ? String(activeCompanyId) : null}
                                                    containerClassName="flex flex-col gap-0.5"
                                                    className="bg-teal-50/70 rounded-md"
                                                    hover={true}
                                                >
                                                    {companies.map((entry) => (
                                                        <HighlightItem key={entry.company.id} value={String(entry.company.id)}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSwitchCompany(entry.company.id)}
                                                                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors outline-none cursor-pointer ${entry.company.id === activeCompanyId ? "text-teal-700" : "text-navy-700"}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-100 text-[10px] font-bold text-navy-600">
                                                                        {entry.company.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="truncate">{entry.company.name}</span>
                                                                </div>
                                                                {entry.company.id === activeCompanyId && (
                                                                    <div className="rounded-full bg-teal-700 p-1 text-white">
                                                                        <CheckIcon className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        </HighlightItem>
                                                    ))}
                                                </Highlight>
                                            </div>
                                            <div className="border-t border-navy-50 mb-1.5" />
                                        </>
                                    )}

                                    <div className="px-1.5 mb-1 flex flex-col gap-0.5">
                                        <Highlight
                                            value={pathname === "/" ? "go-to-console" : null}
                                            containerClassName="flex flex-col gap-0.5"
                                            className="bg-navy-50 rounded-md"
                                            hover={true}
                                        >
                                            <HighlightItem value="go-to-console">
                                                <Link
                                                    href="/"
                                                    onClick={() => setUserOpen(false)}
                                                    className={`flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors outline-none cursor-pointer rounded-md ${pathname === "/" ? "text-navy-950 font-bold" : "text-navy-700"}`}
                                                >
                                                    <Icon name="grid_view" className="text-sm" />
                                                    <span className="text-sm">Go to Console</span>
                                                </Link>
                                            </HighlightItem>

                                            <HighlightItem value="sign-out">
                                                <button
                                                    type="button"
                                                    onClick={handleSignOut}
                                                    className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-rose-600 transition-colors outline-none cursor-pointer rounded-md"
                                                >
                                                    <Icon name="logout" className="text-sm" />
                                                    <span className="text-sm">Sign out</span>
                                                </button>
                                            </HighlightItem>
                                        </Highlight>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Workspace */}
                <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
                    <EntitlementGuard>{children}</EntitlementGuard>
                </main>
            </div>
        </div>
    )
}

/**
 * Per-module sidebar — Arsanawa compact logo + module name (linked to the
 * module dashboard) at the top, then the module's own nav. No active-context
 * block, no console links: it belongs exclusively to the module.
 */
function ModuleSidebar({
    module,
    pathname,
    mobileOpen,
    onCloseMobile,
}: {
    module: ModuleEntry
    pathname: string
    mobileOpen: boolean
    onCloseMobile: () => void
}) {
    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-navy-100 bg-white transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
            {/* Sidebar header: Arsanawa compact mark + module name → module dashboard */}
            <div className="flex h-16 items-center justify-between border-b border-navy-100 px-6">
                <Link
                    href={module.route}
                    className="flex items-center gap-2.5 select-none outline-none group"
                >
                    <LogoCompact className="h-6 w-auto shrink-0" />
                    <span
                        className="text-sm font-bold tracking-tight font-display group-hover:opacity-80 transition-opacity"
                        style={{ color: module.accentColor }}
                    >
                        {module.label}
                    </span>
                </Link>
                <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50 lg:hidden"
                    onClick={onCloseMobile}
                    aria-label="Close sidebar"
                >
                    <Icon name="close" className="text-xl" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
                <Highlight
                    value={module.nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href || null}
                    containerClassName="grid gap-1"
                    className="rounded-xl z-0"
                    style={{ backgroundColor: `${module.accentColor}15` }}
                    hover={true}
                >
                    {module.nav.map((item) => (
                        <SidebarNavItem
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            accentColor={module.accentColor}
                        />
                    ))}
                </Highlight>
            </div>
        </aside>
    )
}

function SidebarNavItem({
    item,
    pathname,
    accentColor,
}: {
    item: NavItem
    pathname: string
    accentColor: string
}) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

    return (
        <div>
            <HighlightItem value={item.href}>
                <Link
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-150 outline-none select-none cursor-pointer"
                    style={{
                        color: active ? accentColor : "var(--color-navy-700)",
                    }}
                >
                    <Icon
                        name={item.icon}
                        className="text-xl transition-transform duration-150 group-hover:scale-105"
                    />
                    <span>{item.label}</span>
                </Link>
            </HighlightItem>
            {item.tree === "inventory-categories" && active && (
                <CategoryTreeNav targetRoute={item.href} accentColor={accentColor} />
            )}
        </div>
    )
}
