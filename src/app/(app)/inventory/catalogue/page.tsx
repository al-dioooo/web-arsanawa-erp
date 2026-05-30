"use client"

import { MotionLinkItem } from "@/components/ui/motion-link"
import { useSession } from "@/features/auth/session-provider"
import { InventoryPageHeader } from "@/features/inventory/inventory-layout"

export default function CataloguePage() {
    const { activeCompanyId } = useSession()
    const links = [
        ["Products", "/inventory/master/products", "inventory_2"],
        ["Product Categories", "/inventory/master/categories", "account_tree"],
        ["Product Brands", "/inventory/master/brands", "sell"],
        ["Units of Measure", "/inventory/master/units-of-measure", "straighten"],
        ["Product Units", "/inventory/master/product-units", "qr_code_2"],
        ["Variant Groups", "/inventory/master/variant-groups", "category"],
        ["Variants", "/inventory/master/variants", "tune"],
    ]

    return (
        <div className="grid gap-6">
            <InventoryPageHeader
                title="Catalogue Master Data"
                description="Manage product hierarchy, reusable variants, and sellable SKU records from separated master-data pages."
                isCompanyScoped={Boolean(activeCompanyId)}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {links.map(([label, href, icon]) => (
                    <MotionLinkItem key={href} href={href} icon={icon} label={label} className="min-h-20 rounded-2xl">
                        Open {label}
                    </MotionLinkItem>
                ))}
            </div>
        </div>
    )
}
