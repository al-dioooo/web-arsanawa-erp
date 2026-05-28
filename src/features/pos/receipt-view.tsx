"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "@/features/auth/session-provider"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"
import { ReceiptPreview } from "@/features/pos/components/receipt-preview"
import { ReceiptPrintActions } from "@/features/pos/components/receipt-print-actions"
import { getSale, loadCustomers, listRegisters, type Customer, type PosRequestOptions } from "@/features/pos/pos-api"
import type { Register, Sale } from "@/features/pos/pos-types"

export function ReceiptView({ saleId }: { saleId: number }) {
    const { token, activeCompanyId } = useSession()
    const [sale, setSale] = useState<Sale | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [registers, setRegisters] = useState<Register[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        setError(null)
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
            setError(caught instanceof Error ? caught.message : "Unable to load receipt.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions, saleId])

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
                title="Receipt"
                subtitle={sale?.sale_number ?? undefined}
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                error={error}
                actions={sale ? <ReceiptPrintActions saleId={sale.id} /> : undefined}
            />
            {sale ? <ReceiptPreview sale={sale} customerName={customerName} registerName={registerName} /> : null}
        </div>
    )
}
