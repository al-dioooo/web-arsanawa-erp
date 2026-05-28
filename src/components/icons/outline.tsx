import { Check, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react"

type IconProps = {
    className?: string
    strokeWidth?: number
}

function makeIcon(Component: LucideIcon) {
    return function OutlineIcon({ className, strokeWidth = 1.5 }: IconProps) {
        return <Component className={className} strokeWidth={strokeWidth} />
    }
}

export const CheckIcon = makeIcon(Check)
export const ChevronDownIcon = makeIcon(ChevronDown)
export const ChevronRightIcon = makeIcon(ChevronRight)
