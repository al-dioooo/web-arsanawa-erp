import { InventoryMasterDataView, type InventoryMasterKind } from "@/features/inventory/master-data-view"

const kindMap: Record<string, InventoryMasterKind> = {
    categories: "categories",
    brands: "brands",
    "units-of-measure": "units",
    products: "products",
    "product-units": "product-units",
    "variant-groups": "variant-groups",
    variants: "variants",
}

export default async function InventoryMasterPage({
    params,
}: {
    params: Promise<{ kind: string; slug?: string[] }>
}) {
    const { kind: rawKind, slug = [] } = await params
    const kind = kindMap[rawKind] ?? "products"

    if (slug[0] === "new") {
        return <InventoryMasterDataView kind={kind} mode="create" />
    }

    if (slug[0] && slug[1] === "edit") {
        return <InventoryMasterDataView kind={kind} mode="edit" id={slug[0]} />
    }

    if (slug[0]) {
        return <InventoryMasterDataView kind={kind} mode="detail" id={slug[0]} />
    }

    return <InventoryMasterDataView kind={kind} mode="list" />
}
