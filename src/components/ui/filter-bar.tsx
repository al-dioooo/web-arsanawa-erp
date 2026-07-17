import { ReactNode } from "react"

/** Canonical filter-bar shell: a DS card (borderless, shadow-elevated) that lays out filter controls. */
export function FilterBar({ children, end }: { children: ReactNode; end?: ReactNode }) {
    return (
        <section className="mb-6 flex flex-wrap items-center gap-3 rounded-lg bg-surface p-4 shadow-card md:p-5">
            {children}
            {end ? <div className="ms-auto flex items-center gap-3">{end}</div> : null}
        </section>
    )
}
