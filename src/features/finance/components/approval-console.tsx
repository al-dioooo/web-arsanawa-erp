"use client"

import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { StatusPill } from "@/components/ui/status-pill"
import type { ApprovalRequest } from "@/features/finance/api-approvals"
import { formatDateID } from "@/lib/format"
import { cn } from "@/lib/utils"

type ApprovalConsoleProps = {
    /** The approval request attached to the document, if one exists. */
    request?: ApprovalRequest
    submitPending: boolean
    onSubmit: () => void
    remark: string
    onRemarkChange: (value: string) => void
    actPending: boolean
    onAct: (action: "approved" | "rejected") => void
    isCurrentUserApprover: boolean
    activeApproverName: string
    activeLevel?: number
}

/**
 * Approval workflow console shared by the bill and payment detail pages:
 * shows the approval trail, the submit CTA when no request exists yet, and
 * the approve/reject decision panel for the active approver.
 */
export function ApprovalConsole({
    request,
    submitPending,
    onSubmit,
    remark,
    onRemarkChange,
    actPending,
    onAct,
    isCurrentUserApprover,
    activeApproverName,
    activeLevel,
}: ApprovalConsoleProps) {
    const t = useTranslations("finance.approvals")

    const isApproved = request?.status === "approved"
    const isPending = request?.status === "pending"
    const isRejected = request?.status === "rejected"

    return (
        <Card padding="lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div className="flex items-center gap-2">
                    <Icon name="fact_check" size={20} className="text-brand-ink" />
                    <h3 className="type-section">{t("title")}</h3>
                </div>
                {request ? (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ink-muted">{t("statusLabel")}:</span>
                        <StatusBadge status={request.status} />
                    </div>
                ) : (
                    <StatusPill tone="amber">{t("requiredBadge")}</StatusPill>
                )}
            </div>

            {!request && (
                <div className="flex flex-col justify-between gap-4 rounded-md bg-surface-muted p-4 sm:flex-row sm:items-center">
                    <div className="text-sm text-ink-secondary">{t("requiredHint")}</div>
                    <Button onClick={onSubmit} disabled={submitPending} className="shrink-0">
                        {submitPending ? t("submitting") : t("submit")}
                    </Button>
                </div>
            )}

            {request && (
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Left/Middle: Timeline Trail */}
                    <div className="flex flex-col gap-4 md:col-span-2">
                        <h4 className="type-card-label">{t("trail")}</h4>
                        <div className="ms-2 mt-2 flex flex-col gap-4 border-s border-line ps-4">
                            {request.actions?.map((action, idx) => (
                                <div key={idx} className="relative">
                                    <div
                                        className={cn(
                                            "absolute -start-[21px] top-1 size-2.5 rounded-pill ring-4 ring-surface",
                                            action.action === "approved"
                                                ? "bg-success-strong"
                                                : "bg-error-strong",
                                        )}
                                    />
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-ink">
                                                {action.user?.name || t("userFallback", { id: action.user_id })}
                                            </span>
                                            <span
                                                className={cn(
                                                    "rounded-sm px-1.5 py-0.5 text-xs font-bold",
                                                    action.action === "approved"
                                                        ? "bg-success-soft text-success-strong"
                                                        : "bg-error-soft text-error-strong",
                                                )}
                                            >
                                                {action.action === "approved"
                                                    ? t("approvedAtLevel", { level: action.level })
                                                    : t("rejectedAtLevel", { level: action.level })}
                                            </span>
                                        </div>
                                        {action.remark && (
                                            <p className="mt-1 max-w-xl rounded-sm bg-surface-muted p-2 text-xs text-ink-secondary italic">
                                                &quot;{action.remark}&quot;
                                            </p>
                                        )}
                                        <span className="mt-1 block text-xs text-ink-faint">
                                            {formatDateID(action.acted_at)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!request.actions || request.actions.length === 0) && (
                                <p className="text-xs text-ink-faint">{t("trailEmpty")}</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Active Action Panel */}
                    <div className="flex flex-col justify-center border-t border-line pt-4 md:border-s md:border-t-0 md:ps-6 md:pt-0">
                        {isPending &&
                            (isCurrentUserApprover ? (
                                <div className="flex flex-col gap-4">
                                    <h4 className="type-card-label">
                                        {t("yourDecision", { level: activeLevel ?? "-" })}
                                    </h4>
                                    <Field
                                        label={t("remarks")}
                                        placeholder={t("remarksPlaceholder")}
                                        value={remark}
                                        onChange={(event) => onRemarkChange(event.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => onAct("rejected")}
                                            disabled={actPending}
                                            variant="secondary"
                                            className="flex-1 bg-error-soft text-error-strong hover:bg-error-soft/80 hover:text-error-strong"
                                        >
                                            {t("reject")}
                                        </Button>
                                        <Button
                                            onClick={() => onAct("approved")}
                                            disabled={actPending}
                                            className="flex-1"
                                        >
                                            {actPending ? t("acting") : t("approve")}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3 rounded-md bg-warning-soft p-4 text-sm">
                                    <Icon
                                        name="lock"
                                        size={16}
                                        className="mt-0.5 shrink-0 text-warning-strong"
                                    />
                                    <div>
                                        <p className="text-xs font-semibold tracking-wider uppercase text-warning-strong">
                                            {t("waitingTitle")}
                                        </p>
                                        <p className="mt-1 text-xs text-ink-secondary">
                                            {t("waitingHint", {
                                                name: activeApproverName,
                                                level: activeLevel ?? "-",
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}

                        {isApproved && (
                            <div className="flex gap-3 rounded-md bg-success-soft p-4 text-sm">
                                <Icon
                                    name="check_circle"
                                    size={20}
                                    className="shrink-0 text-success-strong"
                                />
                                <div>
                                    <p className="text-xs font-bold tracking-wider uppercase text-success-strong">
                                        {t("approvedTitle")}
                                    </p>
                                    <p className="mt-1 text-xs text-ink-secondary">{t("approvedHint")}</p>
                                </div>
                            </div>
                        )}

                        {isRejected && (
                            <div className="flex gap-3 rounded-md bg-error-soft p-4 text-sm">
                                <Icon name="cancel" size={20} className="shrink-0 text-error-strong" />
                                <div>
                                    <p className="text-xs font-bold tracking-wider uppercase text-error-strong">
                                        {t("rejectedTitle")}
                                    </p>
                                    <p className="mt-1 text-xs text-ink-secondary">{t("rejectedHint")}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Card>
    )
}
