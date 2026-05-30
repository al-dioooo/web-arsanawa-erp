import { MotionLinkItem } from "@/components/ui/motion-link"

export default function CataloguePage() {
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
            <header className="border-b border-navy-100 pb-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-700">Inventory</p>
                <h1 className="font-brand text-2xl font-bold text-navy-950">Catalogue Master Data</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500">
                    Manage product hierarchy, reusable variants, and sellable SKU records from separated master-data pages.
                </p>
            </header>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {links.map(([label, href, icon]) => (
                    <MotionLinkItem key={href} href={href} icon={icon} label={label} className="min-h-20">
                        Open {label}
                    </MotionLinkItem>
                ))}
            </div>
        </div>
    )
}
