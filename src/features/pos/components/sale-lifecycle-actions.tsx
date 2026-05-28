"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import type { Sale } from "@/features/pos/pos-types"

type SaleLifecycleActionsProps = {
    sale: Sale
    isLoading?: boolean
    onCancel?: () => void
    onVoid?: () => void
}

export function SaleLifecycleActions({ sale, isLoading, onCancel, onVoid }: SaleLifecycleActionsProps) {
    const canResume = sale.status === "draft" || sale.status === "confirmed"
    const canCancel = sale.status === "draft" || sale.status === "confirmed"
    const canVoid = sale.status === "completed"

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
                <Button type="button" variant="destructive" size="xl" disabled={isLoading} onClick={onCancel}>
                    Cancel sale
                </Button>
            ) : null}
            {canVoid && onVoid ? (
                <Button type="button" variant="destructive" size="xl" disabled={isLoading} onClick={onVoid}>
                    Void completed sale
                </Button>
            ) : null}
        </div>
    )
}
