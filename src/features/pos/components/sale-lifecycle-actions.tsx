"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button, buttonVariants } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { useConfirm } from "@/components/ui/confirm-dialog"
import type { Sale } from "@/features/pos/pos-types"

type SaleLifecycleActionsProps = {
    sale: Sale
    isLoading?: boolean
    onCancel?: () => void
    onVoid?: () => void
}

export function SaleLifecycleActions({ sale, isLoading, onCancel, onVoid }: SaleLifecycleActionsProps) {
    const t = useTranslations("pos.sales.lifecycle")
    const [confirm, confirmDialog] = useConfirm()
    const canResume = sale.status === "draft" || sale.status === "confirmed"
    const canCancel = sale.status === "draft" || sale.status === "confirmed"
    const canVoid = sale.status === "completed"

    async function handleCancel() {
        if (!onCancel) return
        const ok = await confirm({
            title: t("cancelTitle"),
            message: t("cancelMessage"),
            confirmLabel: t("cancelConfirm"),
            cancelLabel: t("keepSale"),
            danger: true,
        })
        if (ok) onCancel()
    }

    async function handleVoid() {
        if (!onVoid) return
        const ok = await confirm({
            title: t("voidTitle"),
            message: t("voidMessage"),
            confirmLabel: t("voidConfirm"),
            cancelLabel: t("keepSale"),
            danger: true,
        })
        if (ok) onVoid()
    }

    return (
        <div className="flex flex-wrap justify-end gap-2">
            {canResume ? (
                <Link
                    href={`/pos?sale_id=${sale.id}`}
                    className={buttonVariants({ variant: "outline", size: "xl" })}
                >
                    <Icon name="point_of_sale" size={18} />
                    {t("resume")}
                </Link>
            ) : null}
            {sale.status === "completed" ? (
                <Link
                    href={`/pos/sales/${sale.id}/receipt`}
                    className={buttonVariants({ variant: "outline", size: "xl" })}
                >
                    <Icon name="receipt_long" size={18} />
                    {t("receipt")}
                </Link>
            ) : null}
            {canCancel && onCancel ? (
                <Button type="button" variant="destructive" size="xl" disabled={isLoading} onClick={handleCancel}>
                    {t("cancelSale")}
                </Button>
            ) : null}
            {canVoid && onVoid ? (
                <Button type="button" variant="destructive" size="xl" disabled={isLoading} onClick={handleVoid}>
                    {t("voidSale")}
                </Button>
            ) : null}
            {confirmDialog}
        </div>
    )
}
