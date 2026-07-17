"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, type COAAccount } from "@/features/finance/api"
import { ChevronRightIcon } from "@/components/icons/outline"

type Props = {
    targetRoute: string
    accentColor: string
}

export function COATreeNav({ targetRoute, accentColor }: Props) {
    const { token, activeCompanyId } = useSession()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const selectedAccountId = searchParams.get("account")

    const { data, isLoading, isError } = useCOA(activeCompanyId)

    const tree = useMemo(() => buildTree(data ?? []), [data])
    const inCOA = pathname.startsWith(targetRoute)

    if (!token || !activeCompanyId) return null

    if (isLoading) {
        return <div className="mt-1 ml-9 pl-3 text-[11px] text-ink-faint font-medium">Loading accounts…</div>
    }

    if (isError) {
        return <div className="mt-1 ml-9 pl-3 text-[11px] text-error font-medium">Failed to load accounts</div>
    }

    if (tree.length === 0) {
        return <div className="mt-1 ml-9 pl-3 text-[11px] text-ink-faint font-medium">No accounts yet</div>
    }

    return (
        <ul className="mt-1 ml-7 grid gap-0.5 border-l border-line pl-2">
            {tree.map((node) => (
                <COANode
                    key={node.id}
                    node={node}
                    targetRoute={targetRoute}
                    accentColor={accentColor}
                    selectedAccountId={selectedAccountId}
                    inCOA={inCOA}
                />
            ))}
        </ul>
    )
}

type NodeProps = {
    node: COAAccount
    targetRoute: string
    accentColor: string
    selectedAccountId: string | null
    inCOA: boolean
}

function COANode({ node, targetRoute, accentColor, selectedAccountId, inCOA }: NodeProps) {
    const hasChildren = node.children && node.children.length > 0
    const isActive = inCOA && selectedAccountId === String(node.id)
    const containsActive = useMemo(
        () => selectedAccountId !== null && subtreeContains(node, Number(selectedAccountId)),
        [node, selectedAccountId],
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
                    href={`${targetRoute}?account=${node.id}`}
                    className="flex-1 truncate rounded-md px-2 py-1 text-xs font-medium transition-colors"
                    style={{
                        backgroundColor: isActive ? `${accentColor}15` : "transparent",
                        color: isActive ? accentColor : "var(--color-navy-700)",
                    }}
                >
                    {node.code} - {node.name}
                </Link>
            </div>
            {hasChildren && expanded && (
                <ul className="mt-0.5 ml-3 grid gap-0.5 border-l border-line pl-2">
                    {node.children!.map((child) => (
                        <COANode
                            key={child.id}
                            node={child}
                            targetRoute={targetRoute}
                            accentColor={accentColor}
                            selectedAccountId={selectedAccountId}
                            inCOA={inCOA}
                        />
                    ))}
                </ul>
            )}
        </li>
    )
}

function buildTree(accounts: COAAccount[]): COAAccount[] {
    const byId = new Map<number, COAAccount>()
    for (const a of accounts) {
        byId.set(a.id, { ...a, children: [] })
    }
    const roots: COAAccount[] = []
    for (const node of byId.values()) {
        if (node.parent_id !== null && byId.has(node.parent_id)) {
            byId.get(node.parent_id)!.children!.push(node)
        } else {
            roots.push(node)
        }
    }
    const sort = (nodes: COAAccount[]) => {
        nodes.sort((a, b) => a.code.localeCompare(b.code))
        for (const n of nodes) {
            if (n.children) sort(n.children)
        }
    }
    sort(roots)
    return roots
}

function subtreeContains(node: COAAccount, id: number): boolean {
    if (node.id === id) return true
    return node.children?.some((c) => subtreeContains(c, id)) ?? false
}
