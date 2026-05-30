import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string
    error?: string
}

export function Field({ label, error, className = "", ...props }: FieldProps) {
    return (
        <label className="grid gap-1.5 text-sm font-medium text-navy-700">
            <span>{label}</span>
            <input
                {...props}
                className={`rounded-md border border-navy-100 bg-white px-2 py-2 text-sm text-navy-900 outline-none transition placeholder:text-navy-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 ${className}`}
            />
            {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
        </label>
    )
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label: string
    error?: string
    children: ReactNode
}

export function SelectField({
    label,
    error,
    className = "",
    children,
    ...props
}: SelectFieldProps) {
    return (
        <label className="grid gap-1.5 text-sm font-medium text-navy-700">
            <span>{label}</span>
            <select
                {...props}
                className={`rounded-md border border-navy-100 bg-white px-2 py-2 text-sm text-navy-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 ${className}`}
            >
                {children}
            </select>
            {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
        </label>
    )
}
