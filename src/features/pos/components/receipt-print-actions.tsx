"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

export function ReceiptPrintActions({ saleId }: { saleId: number }) {
    return (
        <div className="print:hidden flex flex-wrap justify-end gap-2">
            <Link href={`/pos/sales/${saleId}`}>
                <Button type="button" variant="outline" size="xl">
                    <Icon name="chevron_left" size={18} />
                    Sale detail
                </Button>
            </Link>
            <Button type="button" size="xl" onClick={() => window.print()} className="bg-teal-700 hover:bg-teal-800 text-white">
                <Icon name="print" size={18} />
                Print
            </Button>
        </div>
    )
}
