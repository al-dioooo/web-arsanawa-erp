"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"
import { useSession } from "@/features/auth/session-provider"
import type { Category } from "@/features/inventory/inventory-types"
import { ChevronRightIcon } from "@/components/icons/outline"

type Props = {
    /** Route the categories should link into (`?category=<id>` is appended). */
    targetRoute: string
    accentColor: string
}

type TreeNode = Category & { children: TreeNode[] }

/**
 * Render the company's inventory categories as a nested, expandable nav list
 * — the "product hierarchy as sub-menu" the user asked for. Each leaf links
 * to the catalogue page with the chosen category as a filter.
 */
export function CategoryTreeNav({ targetRoute, accentColor }: Props) {
    const { token, activeCompanyId } = useSession()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const selectedCategoryId = searchParams.get("category")

    const { data, isLoading, isError } = useQuery({
        queryKey: ["inventory", "categories", activeCompanyId],
        enabled: Boolean(token && activeCompanyId),
        queryFn: async () => {
            const response = await apiRequest<{ categories: Category[] }>(
                "/api/v1/inventory/categories",
                {},
                { token: token ?? undefined, companyId: activeCompanyId ?? undefined },
            )
            return response.data.categories
        },
    })

    const tree = useMemo(() => buildTree(data ?? []), [data])
    const inCatalogue = pathname.startsWith(targetRoute)

    if (!token || !activeCompanyId) {
        return null
    }

    if (isLoading) {
        return (
            <div className="mt-1 ml-9 pl-3 text-[11px] text-ink-faint font-medium">
                Loading categories…
            </div>
        )
    }

    if (isError) {
        return (
            <div className="mt-1 ml-9 pl-3 text-[11px] text-error font-medium">
                Failed to load categories
            </div>
        )
    }

    if (tree.length === 0) {
        return (
            <div className="mt-1 ml-9 pl-3 text-[11px] text-ink-faint font-medium">
                No categories yet
            </div>
        )
    }

    return (
        <ul className="mt-1 ml-7 grid gap-0.5 border-l border-line pl-2">
            {tree.map((node) => (
                <CategoryNode
                    key={node.id}
                    node={node}
                    targetRoute={targetRoute}
                    accentColor={accentColor}
                    selectedCategoryId={selectedCategoryId}
                    inCatalogue={inCatalogue}
                />
            ))}
        </ul>
    )
}

type NodeProps = {
    node: TreeNode
    targetRoute: string
    accentColor: string
    selectedCategoryId: string | null
    inCatalogue: boolean
}

function CategoryNode({ node, targetRoute, accentColor, selectedCategoryId, inCatalogue }: NodeProps) {
    const hasChildren = node.children.length > 0
    const isActive = inCatalogue && selectedCategoryId === String(node.id)
    const containsActive = useMemo(
        () => selectedCategoryId !== null && subtreeContains(node, Number(selectedCategoryId)),
        [node, selectedCategoryId],
    )
    const [expanded, setExpanded] = useState<boolean>(containsActive)

    return (
        <li>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-label={expanded ? "Collapse" : "Expand"}
                    onClick={() => setExpanded((prev) => !prev)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-faint transition-transform duration-150 ${hasChildren ? "hover:bg-surface-muted hover:text-ink-secondary" : "invisible"} ${expanded ? "rotate-90" : ""}`}
                >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
                <Link
                    href={`${targetRoute}?category=${node.id}`}
                    className="flex-1 truncate rounded-md px-2 py-1 text-xs font-medium transition-colors"
                    style={{
                        backgroundColor: isActive ? `${accentColor}15` : "transparent",
                        color: isActive ? accentColor : "var(--color-navy-700)",
                    }}
                >
                    {node.name}
                </Link>
            </div>
            {hasChildren && expanded && (
                <ul className="mt-0.5 ml-3 grid gap-0.5 border-l border-line pl-2">
                    {node.children.map((child) => (
                        <CategoryNode
                            key={child.id}
                            node={child}
                            targetRoute={targetRoute}
                            accentColor={accentColor}
                            selectedCategoryId={selectedCategoryId}
                            inCatalogue={inCatalogue}
                        />
                    ))}
                </ul>
            )}
        </li>
    )
}

function buildTree(categories: Category[]): TreeNode[] {
    const byId = new Map<number, TreeNode>()
    for (const c of categories) {
        byId.set(c.id, { ...c, children: [] })
    }
    const roots: TreeNode[] = []
    for (const node of byId.values()) {
        if (node.parent_id !== null && byId.has(node.parent_id)) {
            byId.get(node.parent_id)!.children.push(node)
        } else {
            roots.push(node)
        }
    }
    const byPosition = (a: TreeNode, b: TreeNode) =>
        a.position - b.position || a.name.localeCompare(b.name)
    const sort = (nodes: TreeNode[]) => {
        nodes.sort(byPosition)
        for (const n of nodes) sort(n.children)
    }
    sort(roots)
    return roots
}

function subtreeContains(node: TreeNode, id: number): boolean {
    if (node.id === id) return true
    return node.children.some((c) => subtreeContains(c, id))
}
