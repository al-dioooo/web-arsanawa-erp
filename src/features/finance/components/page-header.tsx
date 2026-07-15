import { Button } from "@/components/ui/button"
import { PageHeaderShell } from "@/components/ui/page-header-shell"

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
        <PageHeaderShell eyebrow={eyebrow} title={title} subtitle={subtitle} className="mb-6">
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
        </PageHeaderShell>
    )
}
