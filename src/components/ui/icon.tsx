import type { HTMLAttributes } from "react"

export type IconName = string

interface IconProps extends HTMLAttributes<HTMLSpanElement> {
    name: IconName
    size?: number
}

export function Icon({ name, size = 24, className = "", ...props }: IconProps) {
    return (
        <span
            {...props}
            className={`material-symbols-outlined select-none align-middle ${className}`}
            style={{
                fontSize: size,
                width: size,
                height: size,
                ...props.style,
            }}
        >
            {name}
        </span>
    )
}
