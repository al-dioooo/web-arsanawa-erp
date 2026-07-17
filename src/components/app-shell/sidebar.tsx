"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { isNavGroup, type ModuleEntry, type NavItem } from "@/lib/modules/registry"
import { CategoryTreeNav } from "@/components/app-shell/category-tree-nav"
import { COATreeNav } from "@/features/finance/components/coa-tree-nav"
import { Highlight, HighlightItem } from "@/components/ui/highlight"
import { Icon } from "@/components/ui/icon"
import LogoCompact from "@/components/brands/logo-compact"

type SidebarProps = {
    module: ModuleEntry
    pathname: string
    mobileOpen: boolean
    onCloseMobile: () => void
}

/**
 * Per-module sidebar (290px). Top→bottom: brand block (compact logo + module
 * name → module dashboard), user block (→ /profile), grouped module nav with
 * the brand Highlight pill marking the active route, and a pinned footer
 * with Settings + Sign out. Right edge is a soft shadow, not a border.
 *
 * On mobile it slides in as a drawer (CSS transform; the backdrop lives in
 * the shell orchestrator).
 */
export function Sidebar({ module, pathname, mobileOpen, onCloseMobile }: SidebarProps) {
    const t = useTranslations()
    const router = useRouter()
    const { user, profile, organizationContext, logout } = useSession()

    const activeHref = getActiveNavHref(module, pathname)

    const displayName = profile?.profile.display_name?.trim() || user?.name || ""
    const avatarInitial = displayName.charAt(0).toUpperCase()
    const membershipRole = organizationContext?.membership?.role
    const roleLabel = membershipRole
        ? membershipRole.charAt(0).toUpperCase() + membershipRole.slice(1)
        : (user?.email ?? "")

    const handleSignOut = async () => {
        await logout()
        router.push("/login")
    }

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col bg-surface shadow-[4px_0_20px_rgb(163_174_208/0.10)] transition-transform duration-300 ease-[var(--ease-out-soft)] motion-reduce:transition-none lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
            {/* Brand block: compact mark + module name → module dashboard */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
                <Link href={module.route} className="group flex items-center gap-2.5 outline-none select-none">
                    <LogoCompact className="h-6 w-auto shrink-0" />
                    <span
                        className="font-display text-lg font-semibold tracking-tight transition-opacity group-hover:opacity-80"
                        style={{ color: module.accentColor }}
                    >
                        {module.label}
                    </span>
                </Link>
                <button
                    type="button"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted lg:hidden"
                    onClick={onCloseMobile}
                    aria-label={t("shell.closeSidebar")}
                >
                    <Icon name="close" size={20} />
                </button>
            </div>

            {/* User block → profile */}
            <Link
                href="/profile"
                className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-4 transition-colors outline-none select-none hover:bg-surface-muted"
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
                    {avatarInitial}
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{displayName}</span>
                    <span className="block truncate text-xs text-ink-muted">{roleLabel}</span>
                </span>
            </Link>

            {/* Module nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <Highlight
                    value={activeHref}
                    hover={false}
                    containerClassName="grid gap-1"
                    className="rounded-md bg-brand"
                >
                    <div data-module-sidebar-nav>
                        <SidebarNavItem
                            item={{ href: module.route, label: "Dashboard", icon: "grid_view" }}
                            activeHref={activeHref}
                            accentColor={module.accentColor}
                            t={t}
                        />
                    </div>
                    {module.nav.map((item, idx) => {
                        if (isNavGroup(item)) {
                            return (
                                <div key={`group-${idx}`} className="mt-2 mb-2 first:mt-0">
                                    <p className="px-3.5 py-1.5 text-[10px] font-bold tracking-wider text-ink-faint uppercase">
                                        {item.label.includes(".") ? t(item.label) : item.label}
                                    </p>
                                    <div className="grid gap-1">
                                        {item.items.map((subItem) => (
                                            <div key={subItem.href} data-module-sidebar-nav>
                                                <SidebarNavItem
                                                    item={subItem}
                                                    activeHref={activeHref}
                                                    accentColor={module.accentColor}
                                                    t={t}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                        return (
                            <div key={item.href} data-module-sidebar-nav>
                                <SidebarNavItem
                                    item={item}
                                    activeHref={activeHref}
                                    accentColor={module.accentColor}
                                    t={t}
                                />
                            </div>
                        )
                    })}
                </Highlight>
            </nav>

            {/* Pinned footer: Settings + Sign out */}
            <div className="shrink-0 border-t border-line p-3">
                <Link
                    href="/platform/settings"
                    className="flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-semibold text-ink-muted transition-colors outline-none select-none hover:bg-surface-muted hover:text-ink"
                >
                    <Icon name="settings" size={20} className="shrink-0 text-ink-faint" />
                    <span className="truncate">{t("shell.platformSettings")}</span>
                </Link>
                <button
                    type="button"
                    onClick={() => {
                        void handleSignOut()
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-semibold text-error transition-colors outline-none select-none hover:bg-error-soft"
                >
                    <Icon name="logout" size={20} className="shrink-0" />
                    <span className="truncate">{t("shell.signOut")}</span>
                </button>
            </div>
        </aside>
    )
}

function SidebarNavItem({
    item,
    activeHref,
    accentColor,
    t,
}: {
    item: NavItem
    activeHref: string | null
    accentColor: string
    t?: (key: string) => string
}) {
    const active = activeHref === item.href
    const label = t && item.label.includes(".") ? t(item.label) : item.label

    return (
        <div>
            <HighlightItem value={item.href}>
                <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-semibold transition-colors outline-none select-none ${
                        active ? "text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                >
                    <Icon
                        name={item.icon}
                        size={20}
                        className={`shrink-0 ${active ? "text-white" : "text-ink-faint"}`}
                    />
                    <span className="truncate">{label}</span>
                </Link>
            </HighlightItem>
            {item.tree === "inventory-categories" && active && (
                <CategoryTreeNav targetRoute={item.href} accentColor={accentColor} />
            )}
            {item.tree === "finance-coa" && active && (
                <COATreeNav targetRoute={item.href} accentColor={accentColor} />
            )}
        </div>
    )
}

function getActiveNavHref(module: ModuleEntry, pathname: string): string | null {
    if (pathname === module.route) {
        return module.route
    }

    const items = module.nav.flatMap((item) => (isNavGroup(item) ? item.items : [item]))

    const exact = items.find((item) => pathname === item.href)
    if (exact) return exact.href

    return items
        .filter((item) => pathname.startsWith(`${item.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
}
