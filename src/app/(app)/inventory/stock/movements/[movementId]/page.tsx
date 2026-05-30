import { StockMovementDetailView } from "@/features/inventory/stock-view"

export default async function StockMovementDetailPage({
    params,
}: {
    params: Promise<{ movementId: string }>
}) {
    const { movementId } = await params

    return <StockMovementDetailView movementId={Number(movementId)} />
}
