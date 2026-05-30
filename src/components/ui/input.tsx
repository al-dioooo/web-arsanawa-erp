import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { fieldControlClassName, FormControlShell } from "@/components/ui/form-control"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string
    error?: string
    description?: string
    hideLabel?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, error, description, hideLabel, className, ...props },
    ref,
) {
    return (
        <FormControlShell label={label} error={error} description={description} hideLabel={hideLabel}>
            <input
                {...props}
                ref={ref}
                aria-label={props["aria-label"] ?? label}
                className={cn(fieldControlClassName, className)}
            />
        </FormControlShell>
    )
})
