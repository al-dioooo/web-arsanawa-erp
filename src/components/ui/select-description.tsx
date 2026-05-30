import { forwardRef, type SelectHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import {
    fieldControlClassName,
    fieldDescriptionClassName,
    FormControlShell,
} from "@/components/ui/form-control"

export type SelectDescriptionOption = {
    value: string | number
    label: string
    description?: string
}

type SelectDescriptionProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
    label: string
    error?: string
    description?: string
    hideLabel?: boolean
    options: SelectDescriptionOption[]
}

export const SelectDescription = forwardRef<HTMLSelectElement, SelectDescriptionProps>(function SelectDescription(
    {
        label,
        error,
        description,
        hideLabel,
        options,
        className,
        value,
        defaultValue,
        ...props
    },
    ref,
) {
    const currentValue = value ?? defaultValue
    const selectedDescription = options.find((option) => String(option.value) === String(currentValue))?.description

    return (
        <FormControlShell
            label={label}
            error={error}
            description={selectedDescription ?? description}
            hideLabel={hideLabel}
        >
            <select
                {...props}
                ref={ref}
                aria-label={props["aria-label"] ?? label}
                value={value}
                defaultValue={defaultValue}
                className={cn(fieldControlClassName, className)}
            >
                {options.map((option) => (
                    <option key={String(option.value)} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {options.some((option) => option.description) ? (
                <span className={cn(fieldDescriptionClassName, "sr-only")}>
                    {options
                        .filter((option) => option.description)
                        .map((option) => `${option.label}: ${option.description}`)
                        .join(" ")}
                </span>
            ) : null}
        </FormControlShell>
    )
})
