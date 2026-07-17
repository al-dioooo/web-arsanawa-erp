"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { fieldControlClassName } from "@/components/ui/form-control"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, usePeriods, type COAAccount } from "@/features/finance/api"
import { useCreateJournalEntry } from "@/features/finance/api-journals"
import { formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"

type JournalLineForm = {
    account_id: string
    description: string
    debit: number
    credit: number
}

type JournalForm = {
    entry_date: string
    description: string
    lines: JournalLineForm[]
}

export default function NewJournalPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const t = useTranslations("finance.journals.form")
    const tCommon = useTranslations("common")

    // Data dependencies
    const { data: accounts = [] } = useCOA(activeCompanyId)
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const createJournal = useCreateJournalEntry()

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<JournalForm>({
        defaultValues: {
            entry_date: new Date().toISOString().split('T')[0],
            description: "",
            lines: [
                { account_id: "", description: "", debit: 0, credit: 0 },
                { account_id: "", description: "", debit: 0, credit: 0 }
            ]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "lines"
    })

    const watchedLines = watch("lines")
    const watchedDate = watch("entry_date")

    // Traverse COA to get all postable accounts
    const flattenAccounts = (nodes: COAAccount[]): COAAccount[] => {
        const flat: COAAccount[] = []
        function traverse(nodeList: COAAccount[]) {
            for (const node of nodeList) {
                if (node.is_postable) flat.push(node)
                if (node.children) traverse(node.children)
            }
        }
        traverse(nodes)
        return flat
    }
    const postableAccounts = flattenAccounts(accounts)

    // Find period matching selected date
    const matchedPeriod = periods.find(p => {
        const d = new Date(watchedDate)
        const start = new Date(p.start_date)
        const end = new Date(p.end_date)
        return d >= start && d <= end
    })

    // Calculate totals
    const totalDebit = watchedLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    const totalCredit = watchedLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    const isBalanced = totalDebit === totalCredit && totalDebit > 0
    const difference = Math.abs(totalDebit - totalCredit)

    const onSubmit = (data: JournalForm) => {
        if (!matchedPeriod) {
            toast.error(t("noPeriodToast"))
            return
        }

        if (data.lines.length < 2) {
            toast.error(t("minLines"))
            return
        }

        if (data.lines.some(l => !l.account_id)) {
            toast.error(t("accountsMissing"))
            return
        }

        if (totalDebit !== totalCredit) {
            toast.error(t("unbalancedToast", { diff: formatIDR(difference) }))
            return
        }

        if (totalDebit <= 0) {
            toast.error(t("zeroToast"))
            return
        }

        // Format lines for backend API
        const apiLines = data.lines.map(l => ({
            account_id: parseInt(l.account_id),
            description: l.description || null,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            foreign_debit: Number(l.debit) || 0,
            foreign_credit: Number(l.credit) || 0
        }))

        const payload = {
            entry_date: data.entry_date,
            description: data.description,
            currency_id: 1, // IDR
            exchange_rate: 1.0,
            lines: apiLines
        }

        createJournal.mutate(payload, {
            onSuccess: (res) => {
                toast.success(t("success"))
                if (res.data?.journal_entry?.id) {
                    router.push(`/finance/journals/${res.data.journal_entry.id}`)
                } else {
                    router.push("/finance/journals")
                }
            },
            onError: (err: Error) => {
                toast.error(err?.message || t("error"))
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-6xl pb-10">
            <PageHeader
                backHref="/finance/journals"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title")}
            />

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card padding="lg" className="md:col-span-2">
                    <h2 className="type-section mb-4 flex items-center gap-2">
                        <Icon name="description" size={18} className="text-ink-faint" /> {t("detailsTitle")}
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Field label={t("description")} error={errors.description?.message}>
                            <textarea
                                rows={2}
                                className={cn(fieldControlClassName, "resize-none py-2.5")}
                                placeholder={t("descriptionPlaceholder")}
                                {...register("description", { required: t("descriptionRequired"), maxLength: 500 })}
                            />
                        </Field>
                    </div>
                </Card>

                <Card padding="lg" className="flex flex-col justify-between">
                    <div>
                        <h2 className="type-section mb-4 flex items-center gap-2">
                            <Icon name="calendar_today" size={18} className="text-ink-faint" /> {t("dateTitle")}
                        </h2>
                        <InputDate
                            label={t("entryDate")}
                            error={errors.entry_date?.message}
                            {...register("entry_date", { required: t("dateRequired") })}
                        />
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-md bg-surface-muted p-3 text-xs">
                        <Icon name="info" size={16} className="text-brand-ink" />
                        <div>
                            <span className="font-semibold text-ink-muted">{t("periodLabel")}:</span>{" "}
                            <span className="font-bold text-ink-secondary">
                                {matchedPeriod ? matchedPeriod.name : t("noPeriod")}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            <DataTable
                className="mb-6"
                minWidth={700}
                toolbar={
                    <h2 className="type-section flex items-center gap-2">
                        <Icon name="format_list_bulleted" size={18} className="text-ink-faint" /> {t("linesTitle")}
                    </h2>
                }
                columns={[
                    { label: t("account"), className: "w-1/3" },
                    { label: t("lineDescription"), className: "w-1/3" },
                    { label: t("debit"), align: "end", className: "w-28" },
                    { label: t("credit"), align: "end", className: "w-28" },
                    { label: "", className: "w-10" },
                ]}
                footer={
                    <div className="flex items-center justify-between gap-4 p-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => append({ account_id: "", description: "", debit: 0, credit: 0 })}
                        >
                            <Icon name="add" size={16} className="me-1" /> {t("addLine")}
                        </Button>

                        <div className="flex items-center gap-4">
                            <div className="text-end">
                                <span className="type-card-label block">{t("totalDebit")}</span>
                                <span className="text-sm font-bold text-ink tabular-nums">
                                    {formatIDR(totalDebit)}
                                </span>
                            </div>
                            <div className="text-end">
                                <span className="type-card-label block">{t("totalCredit")}</span>
                                <span className="text-sm font-bold text-ink tabular-nums">
                                    {formatIDR(totalCredit)}
                                </span>
                            </div>
                        </div>
                    </div>
                }
            >
                {fields.map((field, index) => (
                    <tr key={field.id} className="group">
                        <td className="py-3">
                            <Controller
                                name={`lines.${index}.account_id` as const}
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <SearchableSelect
                                        value={value}
                                        onChange={(val) => onChange(String(val))}
                                        options={postableAccounts.map(a => ({ label: `${a.code} - ${a.name}`, value: String(a.id) }))}
                                        placeholder={t("accountPlaceholder")}
                                    />
                                )}
                            />
                        </td>
                        <td className="py-3">
                            <Input
                                label={t("lineDescriptionLabel", { number: index + 1 })}
                                hideLabel
                                type="text"
                                placeholder={t("lineDescriptionPlaceholder")}
                                {...register(`lines.${index}.description` as const)}
                            />
                        </td>
                        <td className="py-3">
                            <Input
                                label={t("lineDebitLabel", { number: index + 1 })}
                                hideLabel
                                type="number"
                                min="0"
                                step="any"
                                className="text-end"
                                {...register(`lines.${index}.debit` as const, { valueAsNumber: true })}
                            />
                        </td>
                        <td className="py-3">
                            <Input
                                label={t("lineCreditLabel", { number: index + 1 })}
                                hideLabel
                                type="number"
                                min="0"
                                step="any"
                                className="text-end"
                                {...register(`lines.${index}.credit` as const, { valueAsNumber: true })}
                            />
                        </td>
                        <td className="py-3 text-end">
                            {fields.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    aria-label={t("removeLine", { number: index + 1 })}
                                    className="p-2 text-ink-faint opacity-0 transition-colors group-hover:opacity-100 hover:text-error"
                                    tabIndex={-1}
                                >
                                    <Icon name="delete" size={18} />
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </DataTable>

            <div
                className={cn(
                    "flex items-center justify-between gap-4 rounded-lg p-4 transition-colors",
                    isBalanced
                        ? "bg-success-soft text-success-strong"
                        : "bg-warning-soft text-warning-strong",
                )}
            >
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            "flex size-9 items-center justify-center rounded-md text-white",
                            isBalanced ? "bg-success-strong" : "bg-warning-strong",
                        )}
                    >
                        <Icon name={isBalanced ? "check_circle" : "warning"} size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-bold">
                            {isBalanced ? t("balanced") : t("unbalanced")}
                        </p>
                        <p className="text-xs opacity-90">
                            {isBalanced
                                ? t("balancedHint")
                                : totalDebit === 0
                                    ? t("zeroHint")
                                    : t("differenceHint", { diff: formatIDR(difference) })
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Sticky action footer */}
            <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-end gap-3 border-t border-line bg-surface/80 px-4 py-4 backdrop-blur">
                <Button type="submit" size="lg" disabled={createJournal.isPending}>
                    {createJournal.isPending ? t("creating") : t("saveDraft")}
                </Button>
            </div>
        </form>
    )
}
