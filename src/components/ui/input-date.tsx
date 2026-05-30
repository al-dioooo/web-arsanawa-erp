import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { fieldControlClassName, FormControlShell } from "@/components/ui/form-control"

type InputDateProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label: string
    error?: string
    description?: string
    hideLabel?: boolean
}

export const InputDate = forwardRef<HTMLInputElement, InputDateProps>(function InputDate(
    { label, error, description, hideLabel, className, ...props },
    ref,
) {
    return (
        <FormControlShell label={label} error={error} description={description} hideLabel={hideLabel}>
            <input
                {...props}
                ref={ref}
                aria-label={props["aria-label"] ?? label}
                type="date"
                className={cn(fieldControlClassName, className)}
            />
        </FormControlShell>
    )
})
