"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ApiError } from "@/lib/api-client"
import {
    downloadExpenseExport,
    downloadIncomeExport,
    type ExportRange,
} from "@/features/finance/api-exports"

type ExportKind = "income" | "expense"

export function ExportButtons({ range = {} }: { range?: ExportRange }) {
    const t = useTranslations("finance.exports")
    const [busy, setBusy] = useState<ExportKind | null>(null)

    async function run(kind: ExportKind) {
        if (busy) return
        setBusy(kind)
        try {
            await (kind === "income" ? downloadIncomeExport(range) : downloadExpenseExport(range))
            toast.success(t("success", { kind: t(kind) }))
        } catch (error) {
            const message = error instanceof ApiError ? error.message : t("error")
            toast.error(message || t("error"))
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="flex flex-col gap-2 sm:flex-row">
            {(["income", "expense"] as const).map((kind) => (
                <Button
                    key={kind}
                    type="button"
                    variant="outline"
                    onClick={() => run(kind)}
                    disabled={busy !== null}
                    aria-label={t("download", { kind: t(kind) })}
                    className="w-full justify-center sm:w-auto"
                >
                    <Icon
                        name={busy === kind ? "sync_alt" : "description"}
                        className={busy === kind ? "animate-spin" : ""}
                    />
                    {t("download", { kind: t(kind) })}
                </Button>
            ))}
        </div>
    )
}
