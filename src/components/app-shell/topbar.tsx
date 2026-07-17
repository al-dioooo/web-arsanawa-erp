"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { useCommandPalette } from "@/lib/search/command-palette-context"
import { ModuleLauncher } from "@/components/app-shell/launcher"
import { ApiConnectionStatusDot } from "@/components/app-shell/api-status"
import { BranchSwitcher } from "@/components/app-shell/branch-switcher"
import { ProfileMenu } from "@/components/app-shell/profile-menu"
import { Icon } from "@/components/ui/icon"
import Logo from "@/components/brands/logo"

type TopbarProps = {
    inModule: boolean
    onOpenMobileSidebar: () => void
}

/**
 * Slim top bar (h-16, translucent, bottom hairline). Never renders page
 * titles — those belong to the page's own header.
 *
 * - Console mode: full logo · search trigger · launcher · profile.
 * - Module mode: mobile hamburger · search trigger · branch switcher ·
 *   API status dot · launcher · profile.
 *
 * The search trigger is width-capped (`max-w-md`) and the logo is
 * `shrink-0`, so the two can never overlap at narrow desktop widths.
 */
export function Topbar({ inModule, onOpenMobileSidebar }: TopbarProps) {
    const t = useTranslations()
    const { open: openSearch } = useCommandPalette()
    const { companies, activeCompanyId } = useSession()

    const activeCompany = companies.find((entry) => entry.company.id === activeCompanyId)?.company

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-background/80 px-4 backdrop-blur-md sm:px-6">
            {inModule ? (
                <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted lg:hidden"
                    onClick={onOpenMobileSidebar}
                    aria-label={t("shell.openSidebar")}
                >
                    <Icon name="menu" size={24} />
                </button>
            ) : (
                <Link href="/" className="flex shrink-0 items-center gap-2 outline-none select-none">
                    <Logo className="h-6 w-auto" />
                </Link>
            )}

            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                {/* Global search trigger — ⌘K */}
                <button
                    type="button"
                    onClick={openSearch}
                    className="hidden w-full max-w-md min-w-0 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink-faint transition-colors outline-none select-none hover:bg-surface-muted hover:text-ink-muted sm:flex"
                    aria-label={t("shell.openSearch")}
                >
                    <Icon name="search" size={14} className="shrink-0" />
                    <span className="hidden min-w-0 flex-1 truncate text-start text-xs md:inline">
                        {t("shell.search")}
                    </span>
                    <kbd className="rounded bg-surface-muted px-2 py-1 font-display text-[10px] font-bold tracking-wide text-ink-faint">
                        ⌘K
                    </kbd>
                </button>

                {/* Branch switcher — only meaningful inside a module */}
                {inModule && activeCompany && <BranchSwitcher />}

                {inModule && <ApiConnectionStatusDot />}

                <ModuleLauncher />

                <ProfileMenu />
            </div>
        </header>
    )
}
