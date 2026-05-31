"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Tooltip({
    label,
    children,
    side = "top",
}: {
    label: string
    children: ReactNode
    side?: "top" | "bottom"
}) {
    const position = side === "bottom" ? "top-7" : "bottom-7"

    return (
        <span className="group/tooltip relative inline-flex">
            {children}
            <span
                role="tooltip"
                className={cn(
                    "pointer-events-none absolute right-0 z-50 min-w-max rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-semibold text-navy-700 opacity-0 shadow-sm transition group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
                    position,
                )}
            >
                {label}
            </span>
        </span>
    )
}
