"use client"

import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { Menu, MenuItem, MenuSection, usePopover } from "@/components/ui/menu"
import { Icon } from "@/components/ui/icon"
import { ChevronDownIcon } from "@/components/icons/outline"

/**
 * Branch switcher for branch-scoped operations — module mode only.
 * Built on the shared popover/menu primitives (outside-click + Escape
 * dismissal come from `usePopover`).
 */
export function BranchSwitcher() {
    const t = useTranslations()
    const { activeBranchId, organizationContext, selectBranch } = useSession()
    const { open, setOpen, triggerProps, containerRef } = usePopover()

    const branches = organizationContext?.branches ?? []
    const activeBranch = branches.find((branch) => branch.id === activeBranchId)

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                {...triggerProps}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2 text-sm font-bold text-ink-secondary transition-colors outline-none select-none hover:bg-surface-muted"
            >
                <Icon name="warehouse" size={16} className="shrink-0 text-brand-ink" />
                <span className="max-w-[120px] truncate">
                    {activeBranch ? activeBranch.name : t("shell.selectBranch")}
                </span>
                <ChevronDownIcon className="h-4 w-4 shrink-0 text-ink-faint" />
            </button>

            <Menu open={open} onClose={() => setOpen(false)} align="end" aria-label={t("shell.switchBranch")} className="w-64">
                <MenuSection label={t("shell.switchBranch")}>
                    {branches.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto">
                            {branches.map((branch) => (
                                <MenuItem
                                    key={branch.id}
                                    selected={branch.id === activeBranchId}
                                    onSelect={() => {
                                        void selectBranch(branch.id)
                                    }}
                                >
                                    {branch.name}
                                </MenuItem>
                            ))}
                        </div>
                    ) : (
                        <p className="px-3 py-3 text-center text-xs font-medium text-ink-faint">
                            {t("shell.noBranches")}
                        </p>
                    )}
                </MenuSection>
            </Menu>
        </div>
    )
}
