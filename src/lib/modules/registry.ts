// The module registry lists ERP module *apps* — Organization is intentionally
// NOT a module: it lives in the console (always available, cannot be uninstalled).

export type NavTreeKind = "inventory-categories" | "finance-coa"

export type NavItem = {
    href: string
    label: string
    icon: string
    permission?: string
    /** When set, the sidebar renders a dynamic tree (e.g. inventory categories) under this item. */
    tree?: NavTreeKind
}

export type NavGroup = {
    kind: "group"
    label: string
    items: NavItem[]
}

export function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
    return "kind" in item && item.kind === "group"
}

export type ModuleEntry = {
    key: string
    label: string
    icon: string
    accentColor: string
    /** Module home / dashboard route — used by the sidebar logo link. */
    route: string
    nav: Array<NavItem | NavGroup>
    entitlementKey?: string
    permission?: string
}

export const moduleRegistry: ModuleEntry[] = [
    {
        key: "inventory",
        label: "Inventory",
        icon: "inventory_2",
        accentColor: "#f47b50",
        route: "/inventory/master/products",
        entitlementKey: "inventory",
        permission: "inventory.view",
        nav: [
            {
                kind: "group",
                label: "Product",
                items: [
                    { href: "/inventory/master/products", label: "Products", icon: "inventory_2" },
                    { href: "/inventory/master/categories", label: "Product Categories", icon: "account_tree", tree: "inventory-categories" },
                    { href: "/inventory/master/brands", label: "Product Brands", icon: "sell" },
                    { href: "/inventory/master/units-of-measure", label: "Units of Measure", icon: "straighten" },
                    { href: "/inventory/master/product-units", label: "Product Units", icon: "qr_code_2" },
                ],
            },
            {
                kind: "group",
                label: "Variants",
                items: [
                    { href: "/inventory/master/variant-groups", label: "Variant Group List", icon: "category" },
                    { href: "/inventory/master/variants", label: "Variant List", icon: "tune" },
                ],
            },
            {
                kind: "group",
                label: "Operations",
                items: [
                    { href: "/inventory/stock", label: "Stock", icon: "warehouse" },
                    { href: "/inventory/pricing", label: "Pricing", icon: "sell" },
                    { href: "/inventory/promotions", label: "Promotions", icon: "percent" },
                ],
            },
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
            {
                kind: "group",
                label: "finance.nav.transactions",
                items: [
                    { href: "/finance/goods-receipts", label: "finance.nav.goodsReceipts", icon: "inventory_2" },
                    { href: "/finance/bills", label: "finance.nav.bills", icon: "receipt" },
                    { href: "/finance/invoices", label: "finance.nav.invoices", icon: "request_quote" },
                    { href: "/finance/payments", label: "finance.nav.payments", icon: "account_balance_wallet" },
                    { href: "/finance/receipts", label: "finance.nav.receipts", icon: "savings" },
                    { href: "/finance/approval-requests", label: "finance.nav.approvalRequests", icon: "fact_check" },
                    { href: "/finance/activity", label: "finance.nav.activity", icon: "history" }
                ]
            },
            {
                kind: "group",
                label: "finance.nav.payablesAndReceivables",
                items: [
                    { href: "/finance/ap", label: "finance.nav.ap", icon: "money_off" },
                    { href: "/finance/ar", label: "finance.nav.ar", icon: "attach_money" }
                ]
            },
            {
                kind: "group",
                label: "finance.nav.cashAndBank",
                items: [
                    { href: "/finance/cash-bank", label: "finance.nav.cashBank", icon: "account_balance" }
                ]
            },
            {
                kind: "group",
                label: "finance.nav.reports",
                items: [
                    { href: "/finance/journals", label: "finance.nav.journals", icon: "menu_book" },
                    { href: "/finance/reports/trial-balance", label: "finance.nav.trialBalance", icon: "balance" },
                    { href: "/finance/reports/profit-loss", label: "finance.nav.profitLoss", icon: "trending_up" },
                    { href: "/finance/tax-returns", label: "finance.nav.taxReturns", icon: "description" }
                ]
            },
            {
                kind: "group",
                label: "finance.nav.dataMaster",
                items: [
                    { href: "/finance/coa", label: "finance.nav.coa", icon: "account_tree", tree: "finance-coa" as NavTreeKind },
                    { href: "/finance/periods", label: "finance.nav.periods", icon: "calendar_month" },
                    { href: "/finance/tax-rates", label: "finance.nav.taxRates", icon: "receipt_long" },
                    { href: "/finance/account-mappings", label: "finance.nav.accountMappings", icon: "settings" },
                    { href: "/finance/approval-matrices", label: "finance.nav.approvalMatrices", icon: "rule" }
                ]
            }
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
            { href: "/pos", label: "pos.nav.register", icon: "point_of_sale" },
            { href: "/pos/shifts", label: "pos.nav.shifts", icon: "shifts" },
            { href: "/pos/sales", label: "pos.nav.sales", icon: "receipt_long" },
            { href: "/pos/registers", label: "pos.nav.registers", icon: "pos_terminal" },
            { href: "/pos/reports", label: "pos.nav.reports", icon: "reports" },
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
