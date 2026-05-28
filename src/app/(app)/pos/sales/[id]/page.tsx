"use client"

import { use } from "react"
import { SaleDetailView } from "@/features/pos/sale-detail-view"

export default function PosSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    return <SaleDetailView saleId={Number(id)} />
}
