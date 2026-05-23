export type NavItem = {
    href: string
    label: string
    icon: string
    permission?: string
}

export type ModuleEntry = {
    key: string
    label: string
    icon: string
    accentColor: string
    route: string
    nav: NavItem[]
    entitlementKey?: string
    permission?: string
}

export const moduleRegistry: ModuleEntry[] = [
    {
        key: "organization",
        label: "Organization",
        icon: "corporate_fare",
        accentColor: "#0b5c6a",
        route: "/organization/companies",
        nav: [
            { href: "/organization/companies", label: "Companies", icon: "business" },
            { href: "/organization/modules", label: "Modules", icon: "apps" }
        ]
    },
    {
        key: "inventory",
        label: "Inventory",
        icon: "inventory_2",
        accentColor: "#f47b50",
        route: "/inventory/catalogue",
        entitlementKey: "inventory",
        permission: "inventory.view",
        nav: [
            { href: "/inventory/catalogue", label: "Catalogue", icon: "list_alt" },
            { href: "/inventory/stock", label: "Stock", icon: "warehouse" },
            { href: "/inventory/pricing", label: "Pricing", icon: "sell" },
            { href: "/inventory/promotions", label: "Promotions", icon: "percent" }
        ]
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
            { href: "/finance", label: "Cash Flow", icon: "trending_up" }
        ]
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
            { href: "/pos", label: "Register", icon: "receipt_long" }
        ]
    }
]

export function getModule(key: string): ModuleEntry | undefined {
    return moduleRegistry.find((m) => m.key === key)
}

export function getModuleByPath(pathname: string): ModuleEntry | undefined {
    return moduleRegistry.find((m) => {
        const baseRoute = "/" + m.route.split("/")[1]
        return pathname.startsWith(baseRoute) || pathname === m.route
    })
}

