import { isNavGroup, type ModuleEntry, type NavGroup, type NavItem } from "@/lib/modules/registry"

/**
 * Company-scoped nav restrictions.
 *
 * SEKALORI operates catering-only: no walk-in POS operations and no ad-hoc
 * stock issues/transfers. The affected routes are hidden from the sidebar
 * while the rest of the module (pricing, promotions, catalogue) stays.
 */
export function filterModuleForCompany(module: ModuleEntry, cateringOnly: boolean): ModuleEntry {
    if (!cateringOnly) return module

    const restrictedHrefs = new Set([
        "/pos/shifts",
        "/pos/registers",
        "/pos/reports",
        "/inventory/stock/issues/new",
        "/inventory/stock/transfers/new",
    ])

    return {
        ...module,
        nav: module.nav
            .map((item) => {
                if (!isNavGroup(item)) {
                    return restrictedHrefs.has(item.href) ? null : item
                }

                const items = item.items.filter((child) => !restrictedHrefs.has(child.href))
                return items.length > 0 ? { ...item, items } : null
            })
            .filter((item): item is NavItem | NavGroup => item !== null),
    }
}
