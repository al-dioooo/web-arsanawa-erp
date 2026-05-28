import { ReactNode } from "react"

export function FilterBar({ children }: { children: ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
            {children}
        </div>
    )
}
