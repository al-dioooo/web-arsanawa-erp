"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { setUserLocale } from "@/actions/locale"
import { useSession } from "@/features/auth/session-provider"
import { Menu, MenuItem, MenuSection, MenuSeparator, usePopover } from "@/components/ui/menu"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const LANGUAGES = [
    { code: "id", label: "Indonesia" },
    { code: "en", label: "English" },
] as const

/**
 * Profile dropdown — account header, organization switching, appearance
 * (theme), language, console/profile/platform links, and sign out.
 */
export function ProfileMenu() {
    const router = useRouter()
    const pathname = usePathname() || ""
    const locale = useLocale()
    const t = useTranslations()
    const { user, profile, companies, activeCompanyId, selectCompany, logout } = useSession()
    const { open, setOpen, triggerProps, containerRef } = usePopover()
    const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null)

    const accountDisplayName = profile?.profile.display_name?.trim() || user?.name || ""
    const accountInitial = accountDisplayName.charAt(0).toUpperCase()
    const avatarUrl = profile?.profile.avatar?.trim()
    const showAvatar = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl)

    const handleSignOut = async () => {
        await logout()
        router.push("/login")
    }

    const handleSwitchCompany = async (companyId: number) => {
        await selectCompany(companyId)
        // Drop back to the console — the previous module may not be enabled
        // for the newly active company.
        router.push("/")
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                {...triggerProps}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-bold text-white transition-transform outline-none select-none hover:scale-102 active:scale-98 motion-reduce:transition-none"
                aria-label={t("shell.accountMenu")}
            >
                {showAvatar ? (
                    <img
                        src={avatarUrl}
                        alt={accountDisplayName}
                        className="h-full w-full object-cover"
                        onError={() => setFailedAvatarUrl(avatarUrl ?? null)}
                    />
                ) : (
                    accountInitial
                )}
            </button>

            <Menu open={open} onClose={() => setOpen(false)} align="end" aria-label={t("shell.accountMenu")} className="w-64">
                <div className="mb-1.5 border-b border-line px-4 pt-1 pb-2.5">
                    <p className="truncate text-xs leading-tight font-bold text-ink">{accountDisplayName}</p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-ink-muted">{user?.email}</p>
                </div>

                {/* Switch Organization — when the user belongs to more than one */}
                {companies.length > 1 && (
                    <>
                        <MenuSection label={t("shell.switchOrganization")}>
                            <div className="max-h-44 overflow-y-auto">
                                {companies.map((entry) => (
                                    <MenuItem
                                        key={entry.company.id}
                                        selected={entry.company.id === activeCompanyId}
                                        onSelect={() => {
                                            void handleSwitchCompany(entry.company.id)
                                        }}
                                    >
                                        {entry.company.name}
                                    </MenuItem>
                                ))}
                            </div>
                        </MenuSection>
                        <MenuSeparator />
                    </>
                )}

                {/* Appearance — Light / System / Dark */}
                <MenuSection label={t("shell.appearance")}>
                    <div className="px-3 pb-1.5">
                        <ThemeToggle />
                    </div>
                </MenuSection>

                {/* Language */}
                <MenuSection label={t("shell.language")}>
                    <div className="px-3 pb-1.5">
                        <div className="flex gap-1 rounded-md bg-surface-muted p-1">
                            {LANGUAGES.map(({ code, label }) => (
                                <button
                                    key={code}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={locale === code}
                                    onClick={async () => {
                                        await setUserLocale(code)
                                        router.refresh()
                                    }}
                                    className={`min-h-8 flex-1 cursor-pointer rounded-sm px-2 text-xs font-bold transition-colors ${
                                        locale === code
                                            ? "bg-surface text-brand-ink shadow-card"
                                            : "text-ink-muted hover:text-ink-secondary"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </MenuSection>
                <MenuSeparator />

                <MenuItem href="/" icon="grid_view" selected={pathname === "/"}>
                    {t("shell.goToConsole")}
                </MenuItem>
                <MenuItem href="/profile" icon="manage_accounts" selected={pathname === "/profile"}>
                    {t("shell.profileSettings")}
                </MenuItem>
                <MenuItem href="/platform/settings" icon="tune" selected={pathname === "/platform/settings"}>
                    {t("shell.platformSettings")}
                </MenuItem>
                <MenuItem
                    icon="logout"
                    destructive
                    onSelect={() => {
                        void handleSignOut()
                    }}
                >
                    {t("shell.signOut")}
                </MenuItem>
            </Menu>
        </div>
    )
}
