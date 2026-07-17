"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
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
    const [confirm, confirmDialog] = useConfirm()
    const canResume = sale.status === "draft" || sale.status === "confirmed"
    const canCancel = sale.status === "draft" || sale.status === "confirmed"
    const canVoid = sale.status === "completed"

    async function handleCancel() {
        if (!onCancel) return
        const ok = await confirm({
            title: "Cancel this sale?",
            message: "The sale will be cancelled and removed from the active queue.",
            confirmLabel: "Cancel sale",
            cancelLabel: "Keep sale",
            danger: true,
        })
        if (ok) onCancel()
    }

    async function handleVoid() {
        if (!onVoid) return
        const ok = await confirm({
            title: "Void this completed sale?",
            message: "Voiding reverses the sale's revenue, COGS journals, and inventory. This can't be undone.",
            confirmLabel: "Void sale",
            cancelLabel: "Keep sale",
            danger: true,
        })
        if (ok) onVoid()
    }

    return (
        <div className="flex flex-wrap justify-end gap-2">
            {canResume ? (
                <Link href={`/pos?sale_id=${sale.id}`}>
                    <Button type="button" variant="outline" size="xl">
                        <Icon name="point_of_sale" size={18} />
                        Resume checkout
                    </Button>
                </Link>
            ) : null}
            {sale.status === "completed" ? (
                <Link href={`/pos/sales/${sale.id}/receipt`}>
                    <Button type="button" variant="outline" size="xl">
                        <Icon name="receipt_long" size={18} />
                        Receipt
                    </Button>
                </Link>
            ) : null}
            {canCancel && onCancel ? (
                <Button type="button" variant="destructive" size="xl" disabled={isLoading} onClick={handleCancel}>
                    Cancel sale
                </Button>
            ) : null}
            {canVoid && onVoid ? (
                <Button type="button" variant="destructive" size="xl" disabled={isLoading} onClick={handleVoid}>
                    Void completed sale
                </Button>
            ) : null}
            {confirmDialog}
        </div>
    )
}
