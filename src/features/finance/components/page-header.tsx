import { Button } from "@/components/ui/button"

export function PageHeader({
    title,
    subtitle,
    primaryAction,
    secondaryAction,
}: {
    title: string
    subtitle?: string
    primaryAction?: { label: string; onClick: () => void; disabled?: boolean }
    secondaryAction?: { label: string; onClick: () => void; disabled?: boolean }
}) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {secondaryAction && (
                    <Button onClick={secondaryAction.onClick} disabled={secondaryAction.disabled} variant="secondary" className="font-bold px-6 h-10 rounded-xl transition-all w-full sm:w-auto">
                        {secondaryAction.label}
                    </Button>
                )}
                {primaryAction && (
                    <Button onClick={primaryAction.onClick} disabled={primaryAction.disabled} className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 h-10 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 w-full sm:w-auto">
                        {primaryAction.label}
                    </Button>
                )}
            </div>
        </div>
    )
}
