import { ReactNode } from "react"

export function DataTable({
    columns,
    children,
}: {
    columns: string[]
    children: ReactNode
}) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white">
            <table className="w-full text-left text-sm text-navy-600">
                <thead className="border-b border-navy-100 bg-navy-50/30 text-xs font-bold uppercase tracking-wider text-navy-500">
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i} className="px-6 py-4 font-display uppercase tracking-wider whitespace-nowrap">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                    {children}
                </tbody>
            </table>
        </div>
    )
}
