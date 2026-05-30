import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import {
    fieldControlClassName,
    fieldErrorClassName,
    FormControlShell,
} from "@/components/ui/form-control"

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string
    error?: string
    hideLabel?: boolean
    children?: ReactNode
}

export function Field({ label, error, hideLabel, className, children, ...props }: FieldProps) {
    return (
        <FormControlShell label={label} hideLabel={hideLabel}>
            {children ?? (
                <input
                    {...props}
                    aria-label={props["aria-label"] ?? label}
                    className={cn(fieldControlClassName, className)}
                />
            )}
            {error ? <span className={fieldErrorClassName}>{error}</span> : null}
        </FormControlShell>
    )
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label: string
    error?: string
    hideLabel?: boolean
    children: ReactNode
}

export function SelectField({
    label,
    error,
    hideLabel,
    className = "",
    children,
    ...props
}: SelectFieldProps) {
    return (
        <FormControlShell label={label} hideLabel={hideLabel}>
            <select
                {...props}
                aria-label={props["aria-label"] ?? label}
                className={cn(fieldControlClassName, className)}
            >
                {children}
            </select>
            {error ? <span className={fieldErrorClassName}>{error}</span> : null}
        </FormControlShell>
    )
}
