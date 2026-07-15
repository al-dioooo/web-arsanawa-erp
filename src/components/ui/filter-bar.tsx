import { ReactNode } from "react"

/** Canonical filter-bar shell: a rounded card that lays out filter controls. */
export function FilterBar({ children }: { children: ReactNode }) {
    return (
        <section className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-navy-100 bg-white p-4">
            {children}
        </section>
    )
}
