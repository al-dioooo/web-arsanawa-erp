import type { ReactNode } from "react"
import { PageHeader } from "@/components/ui/page-header"

/**
 * @deprecated Use {@link PageHeader} from `@/components/ui/page-header`
 * instead. This adapter maps the legacy card-shell props onto the unified
 * title-on-background PageHeader so existing importers keep working
 * unchanged (`children` becomes the `actions` slot).
 */
export function PageHeaderShell({
    eyebrow,
    title,
    subtitle,
    children,
    className,
    dataAttribute,
}: {
    eyebrow?: ReactNode
    title: ReactNode
    subtitle?: ReactNode
    /** Right-hand slot for actions / status pills. */
    children?: ReactNode
    className?: string
    /** Optional data-* attribute name to stamp on the wrapper (for test hooks). */
    dataAttribute?: string
}) {
    return (
        <PageHeader
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            actions={children}
            className={className}
            dataAttribute={dataAttribute}
        />
    )
}
