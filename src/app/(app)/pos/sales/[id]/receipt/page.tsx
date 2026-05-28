"use client"

import { use } from "react"
import { ReceiptView } from "@/features/pos/receipt-view"

export default function PosSaleReceiptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    return <ReceiptView saleId={Number(id)} />
}
