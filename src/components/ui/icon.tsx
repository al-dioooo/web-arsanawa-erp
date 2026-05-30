import type { ComponentPropsWithoutRef, ComponentType } from "react"
import * as OutlineIcons from "@/components/icons/outline"
import * as SolidIcons from "@/components/icons/solid"

export type IconName = string

type IconSvgProps = ComponentPropsWithoutRef<"svg"> & {
    size?: number | string
    strokeWidth?: number | string
}
type IconComponent = ComponentType<IconSvgProps>

const icons: Record<string, IconComponent> = {
    account_balance: OutlineIcons.BuildingBankIcon,
    account_balance_wallet: OutlineIcons.WalletIcon,
    account_tree: OutlineIcons.HierarchyIcon,
    add: OutlineIcons.PlusIcon,
    apps: OutlineIcons.AppsIcon,
    arrow_drop_down: OutlineIcons.ChevronDownIcon,
    attach_money: OutlineIcons.CurrencyDollarIcon,
    balance: OutlineIcons.ScaleIcon,
    bar_chart: OutlineIcons.ChartBarIcon,
    block: OutlineIcons.ShieldXIcon,
    bolt: OutlineIcons.BoltIcon,
    business: OutlineIcons.BuildingIcon,
    calendar_month: OutlineIcons.CalendarMonthIcon,
    calendar_today: OutlineIcons.CalendarIcon,
    cancel: SolidIcons.CircleXFilledIcon,
    card_membership: OutlineIcons.CreditCardIcon,
    category: OutlineIcons.Category2Icon,
    check: OutlineIcons.CheckIcon,
    check_circle: SolidIcons.CircleCheckFilledIcon,
    chevron_left: OutlineIcons.ChevronLeftIcon,
    chevron_right: OutlineIcons.ChevronRightIcon,
    close: OutlineIcons.XIcon,
    corporate_fare: OutlineIcons.BuildingSkyscraperIcon,
    delete: OutlineIcons.TrashIcon,
    delete_forever: OutlineIcons.TrashXIcon,
    description: OutlineIcons.FileTextIcon,
    edit: OutlineIcons.PencilIcon,
    error: SolidIcons.AlertCircleFilledIcon,
    error_outline: OutlineIcons.AlertCircleIcon,
    expand_less: OutlineIcons.ChevronUpIcon,
    expand_more: OutlineIcons.ChevronDownIcon,
    extension: OutlineIcons.PuzzleIcon,
    fact_check: OutlineIcons.ClipboardCheckIcon,
    format_list_bulleted: OutlineIcons.ListDetailsIcon,
    grid_view: OutlineIcons.LayoutGridIcon,
    groups: OutlineIcons.UsersGroupIcon,
    history: OutlineIcons.HistoryIcon,
    hourglass_empty: OutlineIcons.HourglassIcon,
    info: OutlineIcons.InfoCircleIcon,
    insights: OutlineIcons.ChartDotsIcon,
    inventory_2: OutlineIcons.PackageIcon,
    key: OutlineIcons.KeyIcon,
    list_alt: OutlineIcons.ClipboardListIcon,
    local_offer: OutlineIcons.TagIcon,
    lock: OutlineIcons.LockIcon,
    logout: OutlineIcons.LogoutIcon,
    manage_accounts: OutlineIcons.UserCogIcon,
    menu: OutlineIcons.Menu2Icon,
    menu_book: OutlineIcons.Book2Icon,
    money_off: OutlineIcons.CoinOffIcon,
    open_in_new: OutlineIcons.ExternalLinkIcon,
    payments: OutlineIcons.CashBanknoteIcon,
    pending: OutlineIcons.ClockIcon,
    percent: OutlineIcons.PercentageIcon,
    point_of_sale: OutlineIcons.DeviceDesktopDollarIcon,
    pos_terminal: OutlineIcons.CashRegisterIcon,
    print: OutlineIcons.PrinterIcon,
    qr_code_2: OutlineIcons.QrcodeIcon,
    radio_button_unchecked: OutlineIcons.CircleIcon,
    receipt: OutlineIcons.ReceiptIcon,
    receipt_long: OutlineIcons.Receipt2Icon,
    remove_circle: OutlineIcons.CircleMinusIcon,
    reports: OutlineIcons.ReportAnalyticsIcon,
    request_quote: OutlineIcons.FileInvoiceIcon,
    restart_alt: OutlineIcons.RotateClockwiseIcon,
    rule: OutlineIcons.ChecklistIcon,
    savings: OutlineIcons.PigMoneyIcon,
    search: OutlineIcons.SearchIcon,
    search_off: OutlineIcons.SearchOffIcon,
    sell: OutlineIcons.TagsIcon,
    settings: OutlineIcons.SettingsIcon,
    settings_2: OutlineIcons.SettingsCogIcon,
    settings_suggest: OutlineIcons.SettingsAutomationIcon,
    shifts: OutlineIcons.ClockIcon,
    storefront: OutlineIcons.BuildingStoreIcon,
    straighten: OutlineIcons.RulerMeasureIcon,
    swap_horiz: OutlineIcons.ArrowsExchangeIcon,
    sync_alt: OutlineIcons.RefreshIcon,
    trending_up: OutlineIcons.TrendingUpIcon,
    tune: OutlineIcons.AdjustmentsHorizontalIcon,
    warehouse: OutlineIcons.BuildingWarehouseIcon,
    warning: SolidIcons.AlertTriangleFilledIcon,

    inventory_adjustment: OutlineIcons.AdjustmentsHorizontalIcon,
    inventory_brands: OutlineIcons.TagsIcon,
    inventory_categories: OutlineIcons.Hierarchy2Icon,
    inventory_issue: OutlineIcons.PackageExportIcon,
    inventory_movements: OutlineIcons.ArrowsTransferUpDownIcon,
    inventory_pricing: OutlineIcons.TagIcon,
    inventory_product_units: OutlineIcons.QrcodeIcon,
    inventory_products: OutlineIcons.PackageIcon,
    inventory_promotions: OutlineIcons.RosetteDiscountIcon,
    inventory_receipt: OutlineIcons.PackageImportIcon,
    inventory_stock: OutlineIcons.BuildingWarehouseIcon,
    inventory_stock_lots: OutlineIcons.PackagesIcon,
    inventory_transfer: OutlineIcons.TransferIcon,
    inventory_units: OutlineIcons.RulerMeasureIcon,
    inventory_variant_groups: OutlineIcons.Category2Icon,
    inventory_variants: OutlineIcons.AdjustmentsHorizontalIcon,
}

interface IconProps extends IconSvgProps {
    name: IconName
}

export function Icon({ name, size = 24, className = "", ...props }: IconProps) {
    const Component = icons[name] ?? OutlineIcons.HelpCircleIcon

    return <Component {...props} aria-hidden="true" className={`inline-block select-none align-middle ${className}`} size={size} />
}
