import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export const fieldShellClassName = "grid gap-1.5 text-sm font-medium text-ink-secondary"
export const fieldLabelClassName = "text-sm font-semibold text-ink-secondary"
export const fieldControlClassName =
    "min-h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/15"
export const fieldErrorClassName = "text-xs font-medium text-error"
export const fieldDescriptionClassName = "text-xs leading-relaxed text-ink-muted"

export type FormControlShellProps = {
    label?: string
    error?: string
    description?: string
    hideLabel?: boolean
    className?: string
    children: ReactNode
}

type ControlAriaProps = {
    "aria-invalid"?: boolean
    "aria-describedby"?: string
}

export function FormControlShell({
    label,
    error,
    description,
    hideLabel,
    className,
    children,
}: FormControlShellProps) {
    const id = useId()
    const errorId = `${id}-error`
    const descriptionId = `${id}-description`

    const describedBy = [description ? descriptionId : null, error ? errorId : null]
        .filter(Boolean)
        .join(" ")

    // Associate the error/description text with the control so screen readers
    // announce validity and the reason on focus.
    const control = isValidElement(children)
        ? cloneElement(children as ReactElement<ControlAriaProps>, {
              "aria-invalid": error ? true : (children.props as ControlAriaProps)["aria-invalid"],
              "aria-describedby":
                  [(children.props as ControlAriaProps)["aria-describedby"], describedBy]
                      .filter(Boolean)
                      .join(" ") || undefined,
          })
        : children

    return (
        <label className={cn(fieldShellClassName, className)}>
            {label ? <span className={cn(fieldLabelClassName, hideLabel && "sr-only")}>{label}</span> : null}
            {control}
            {description ? <span id={descriptionId} className={fieldDescriptionClassName}>{description}</span> : null}
            {error ? <span id={errorId} className={fieldErrorClassName}>{error}</span> : null}
        </label>
    )
}
