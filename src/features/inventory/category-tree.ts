import type { Category } from "@/features/inventory/inventory-types"

export type CategoryTreeNode = Category & {
    breadcrumb: string
    children: CategoryTreeNode[]
    isLeaf: boolean
}

export type CategoryTreeOption = {
    category: Category
    breadcrumb: string
    depth: number
    isLeaf: boolean
    parentBreadcrumb: string
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
    const byId = new Map<number, CategoryTreeNode>()

    categories.forEach((category) => {
        byId.set(category.id, { ...category, breadcrumb: category.name, children: [], isLeaf: true })
    })

    const roots: CategoryTreeNode[] = []

    byId.forEach((node) => {
        if (node.parent_id !== null && byId.has(node.parent_id)) {
            byId.get(node.parent_id)!.children.push(node)
        } else {
            roots.push(node)
        }
    })

    const sortNodes = (nodes: CategoryTreeNode[]) => {
        nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
        nodes.forEach((node) => sortNodes(node.children))
    }

    const annotate = (nodes: CategoryTreeNode[], parentBreadcrumb = "") => {
        nodes.forEach((node) => {
            node.breadcrumb = parentBreadcrumb ? `${parentBreadcrumb} / ${node.name}` : node.name
            node.isLeaf = node.children.length === 0
            annotate(node.children, node.breadcrumb)
        })
    }

    sortNodes(roots)
    annotate(roots)

    return roots
}

export function flattenCategoryTree(categories: Category[]): CategoryTreeOption[] {
    const options: CategoryTreeOption[] = []

    const walk = (nodes: CategoryTreeNode[], parentBreadcrumb = "") => {
        nodes.forEach((node) => {
            options.push({
                category: node,
                breadcrumb: node.breadcrumb,
                depth: node.depth,
                isLeaf: node.isLeaf,
                parentBreadcrumb,
            })
            walk(node.children, node.breadcrumb)
        })
    }

    walk(buildCategoryTree(categories))

    return options
}

export function categoryBreadcrumb(categories: Category[], categoryId: string | number): string {
    return flattenCategoryTree(categories).find((option) => String(option.category.id) === String(categoryId))?.breadcrumb ?? ""
}

export function categoriesWithAncestorsForQuery(categories: Category[], query: string): Category[] {
    const lowered = query.trim().toLowerCase()

    if (!lowered) {
        return categories
    }

    const byId = new Map(categories.map((category) => [category.id, category]))
    const included = new Set<number>()

    flattenCategoryTree(categories).forEach((option) => {
        const haystack = `${option.category.name} ${option.breadcrumb} ${option.category.path}`.toLowerCase()

        if (!haystack.includes(lowered)) {
            return
        }

        let current: Category | undefined = option.category

        while (current) {
            included.add(current.id)
            current = current.parent_id !== null ? byId.get(current.parent_id) : undefined
        }
    })

    return categories.filter((category) => included.has(category.id))
}

export function expandableCategoryIds(categories: Category[]): Set<number> {
    const parentIds = new Set<number>()

    categories.forEach((category) => {
        if (category.parent_id !== null) {
            parentIds.add(category.parent_id)
        }
    })

    return parentIds
}
