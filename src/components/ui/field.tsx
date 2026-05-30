import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string
    error?: string
    children?: ReactNode
}

const fieldShellClassName = "grid gap-1.5 text-sm font-medium text-navy-700"
const controlClassName = "min-h-11 rounded-md border border-navy-100 bg-white px-3 text-sm text-navy-900 outline-none transition placeholder:text-navy-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"

export function Field({ label, error, className, children, ...props }: FieldProps) {
    return (
        <label className={fieldShellClassName}>
            <span>{label}</span>
            {children ?? (
                <input
                    {...props}
                    className={cn(controlClassName, className)}
                />
            )}
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
        <label className={fieldShellClassName}>
            <span>{label}</span>
            <select
                {...props}
                className={cn(controlClassName, className)}
            >
                {children}
            </select>
            {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
        </label>
    )
}
