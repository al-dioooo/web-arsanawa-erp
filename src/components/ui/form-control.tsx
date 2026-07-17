import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export const fieldShellClassName = "grid gap-1.5 text-sm font-medium text-navy-700"
export const fieldLabelClassName = "text-sm font-semibold text-navy-700"
export const fieldControlClassName =
    "min-h-11 rounded-md border border-navy-100 bg-white px-3 text-sm text-navy-900 outline-none transition placeholder:text-navy-300 disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
export const fieldErrorClassName = "text-xs font-medium text-destructive"
export const fieldDescriptionClassName = "text-xs leading-relaxed text-navy-500"

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
