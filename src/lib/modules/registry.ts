// The module registry lists ERP module *apps* — Organization is intentionally
// NOT a module: it lives in the console (always available, cannot be uninstalled).

export type NavTreeKind = "inventory-categories"

export type NavItem = {
    href: string
    label: string
    icon: string
    permission?: string
    /** When set, the sidebar renders a dynamic tree (e.g. inventory categories) under this item. */
    tree?: NavTreeKind
}

export type ModuleEntry = {
    key: string
    label: string
    icon: string
    accentColor: string
    /** Module home / dashboard route — used by the sidebar logo link. */
    route: string
    nav: NavItem[]
    entitlementKey?: string
    permission?: string
}

export const moduleRegistry: ModuleEntry[] = [
    {
        key: "inventory",
        label: "Inventory",
        icon: "inventory_2",
        accentColor: "#f47b50",
        route: "/inventory/catalogue",
        entitlementKey: "inventory",
        permission: "inventory.view",
        nav: [
            { href: "/inventory/catalogue", label: "Catalogue", icon: "list_alt", tree: "inventory-categories" },
            { href: "/inventory/stock", label: "Stock", icon: "warehouse" },
            { href: "/inventory/pricing", label: "Pricing", icon: "sell" },
            { href: "/inventory/promotions", label: "Promotions", icon: "percent" },
        ],
    },
    {
        key: "finance",
        label: "Finance",
        icon: "payments",
        accentColor: "#fbbe57",
        route: "/finance",
        entitlementKey: "finance",
        permission: "finance.view",
        nav: [
            { href: "/finance", label: "Cash Flow", icon: "trending_up" },
        ],
    },
    {
        key: "pos",
        label: "Point of Sale",
        icon: "point_of_sale",
        accentColor: "#a37565",
        route: "/pos",
        entitlementKey: "pos",
        permission: "pos.view",
        nav: [
            { href: "/pos", label: "Register", icon: "receipt_long" },
        ],
    },
]

export function getModule(key: string): ModuleEntry | undefined {
    return moduleRegistry.find((m) => m.key === key)
}

/**
 * Resolve the active module from the current pathname.
 *
 * Returns undefined for **console** paths — anything that isn't inside a module
 * workspace (e.g. `/`, `/organization/...`). The shell uses this to switch
 * between console mode (launcher view, no sidebar) and module mode (sidebar).
 */
export function getModuleByPath(pathname: string): ModuleEntry | undefined {
    return moduleRegistry.find((m) => {
        const baseRoute = "/" + m.route.split("/")[1]
        return pathname === baseRoute || pathname.startsWith(`${baseRoute}/`)
    })
}
