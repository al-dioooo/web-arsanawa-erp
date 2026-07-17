import { Button } from "@/components/ui/button"
import { Icon, type IconName } from "@/components/ui/icon"
import { PageHeader as UiPageHeader } from "@/components/ui/page-header"

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
    primaryAction?: { label: string; onClick: () => void; disabled?: boolean; icon?: IconName }
    secondaryAction?: { label: string; onClick: () => void; disabled?: boolean }
}) {
    const actions =
        primaryAction || secondaryAction ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                {secondaryAction && (
                    <Button
                        onClick={secondaryAction.onClick}
                        disabled={secondaryAction.disabled}
                        variant="secondary"
                        size="xl"
                        className="w-full sm:w-auto"
                    >
                        {secondaryAction.label}
                    </Button>
                )}
                {primaryAction && (
                    <Button
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                        size="xl"
                        className="w-full sm:w-auto"
                    >
                        {primaryAction.icon ? <Icon name={primaryAction.icon} size={18} /> : null}
                        {primaryAction.label}
                    </Button>
                )}
            </div>
        ) : undefined

    return <UiPageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} />
}
