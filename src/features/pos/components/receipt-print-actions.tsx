"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button, buttonVariants } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

export function ReceiptPrintActions({ saleId }: { saleId: number }) {
    const t = useTranslations("pos.receipt")

    return (
        <div className="print:hidden flex flex-wrap justify-end gap-2">
            <Link
                href={`/pos/sales/${saleId}`}
                className={buttonVariants({ variant: "outline", size: "xl" })}
            >
                <Icon name="chevron_left" size={18} />
                {t("saleDetail")}
            </Link>
            <Button type="button" size="xl" onClick={() => window.print()}>
                <Icon name="print" size={18} />
                {t("print")}
            </Button>
        </div>
    )
}
