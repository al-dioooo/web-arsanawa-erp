import { Button } from "@/components/ui/button"

export function PageHeader({
    title,
    subtitle,
    eyebrow = "Finance",
    primaryAction,
    secondaryAction,
}: {
    title: string
    subtitle?: string
    eyebrow?: string
    primaryAction?: { label: string; onClick: () => void; disabled?: boolean }
    secondaryAction?: { label: string; onClick: () => void; disabled?: boolean }
}) {
    return (
        <header className="mb-6 rounded-2xl border border-navy-100 bg-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    {eyebrow ? (
                        <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className="mt-2 font-brand text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
                    {subtitle && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500">{subtitle}</p>}
                </div>
                <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row">
                    {secondaryAction && (
                        <Button onClick={secondaryAction.onClick} disabled={secondaryAction.disabled} variant="secondary" size="xl" className="w-full sm:w-auto">
                            {secondaryAction.label}
                        </Button>
                    )}
                    {primaryAction && (
                        <Button onClick={primaryAction.onClick} disabled={primaryAction.disabled} size="xl" className="w-full bg-teal-700 text-white shadow-sm hover:bg-teal-800 sm:w-auto">
                            {primaryAction.label}
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )
}
