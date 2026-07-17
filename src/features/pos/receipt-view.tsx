"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"
import { ReceiptPreview } from "@/features/pos/components/receipt-preview"
import { ReceiptPrintActions } from "@/features/pos/components/receipt-print-actions"
import { getSale, loadCustomers, listRegisters, type Customer, type PosRequestOptions } from "@/features/pos/pos-api"
import type { Register, Sale } from "@/features/pos/pos-types"

export function ReceiptView({ saleId }: { saleId: number }) {
    const t = useTranslations("pos.receipt")
    const { token, activeCompanyId } = useSession()
    const [sale, setSale] = useState<Sale | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [registers, setRegisters] = useState<Register[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const loadErrorFallback = t("loadError")
    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        try {
            const [loadedSale, loadedCustomers, loadedRegisters] = await Promise.all([
                getSale(requestOptions, saleId),
                loadCustomers(requestOptions).catch(() => [] as Customer[]),
                listRegisters(requestOptions).catch(() => [] as Register[]),
            ])
            setSale(loadedSale)
            setCustomers(loadedCustomers)
            setRegisters(loadedRegisters)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : loadErrorFallback)
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions, saleId, loadErrorFallback])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void refreshData()
        })
        return () => {
            active = false
        }
    }, [refreshData])

    const customerName =
        sale?.customer_name ?? customers.find((customer) => customer.id === sale?.partner_id)?.name ?? null
    const registerName = registers.find((register) => register.id === sale?.register_id)?.name ?? null

    return (
        <div className="grid gap-6 print:block">
            <PosPageHeader
                title={t("title")}
                subtitle={sale?.sale_number ?? undefined}
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                actions={sale ? <ReceiptPrintActions saleId={sale.id} /> : undefined}
            />
            {sale ? <ReceiptPreview sale={sale} customerName={customerName} registerName={registerName} /> : null}
        </div>
    )
}
