import Link from "next/link"
import { Icon } from "@/components/ui/icon"

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
                    <Link key={href} href={href} className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-4 text-sm font-bold text-navy-800 transition hover:border-teal-300 hover:bg-teal-50/40">
                        <Icon name={icon} className="text-teal-700" />
                        <span>{label}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
