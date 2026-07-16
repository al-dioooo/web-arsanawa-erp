"use client"

import { use, useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { usePayment, usePostPayment, useVoidPayment, type Payment } from "@/features/finance/api-payments"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { formatIDR, formatDateID } from "@/lib/format"
import { toast } from "sonner"
import { Icon } from "@/components/ui/icon"
import Link from "next/link"
import { useSession } from "@/features/auth/session-provider"
import { useSubmitPaymentApproval, useActOnApproval, useApprovalMatrices, useCompanyMembers, type ApprovalRequest } from "@/features/finance/api-approvals"
import { Field } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, activeCompanyId } = useSession()
    
    const { data: payment, isLoading } = usePayment(id)
    const postPayment = usePostPayment()
    const voidPayment = useVoidPayment()
    const submitApproval = useSubmitPaymentApproval()
    const actApproval = useActOnApproval()
    const { data: matrices = [] } = useApprovalMatrices(activeCompanyId)
    const { data: memberships = [] } = useCompanyMembers(activeCompanyId)

    const [remark, setRemark] = useState("")

    if (isLoading) {
        return <div className="p-8 text-center text-navy-500">Loading payment...</div>
    }

    if (!payment) {
        return <div className="p-8 text-center text-rose-500">Payment not found.</div>
    }

    const isOutgoing = payment.payment_type === 'outbound'
    const docLabel = isOutgoing ? "Payment" : "Receipt"
    const request = (payment as Payment & { approval_request?: ApprovalRequest }).approval_request
    const isDraft = payment.status === 'draft'

    // Check if the payment amount falls into any configured matrix rule bands
    const requiresApproval = matrices.some(
        rule => rule.document_type === 'payment'
            && parseFloat(payment.amount) >= parseFloat(rule.min_amount)
            && parseFloat(payment.amount) <= parseFloat(rule.max_amount)
    )

    const isApproved = request && request.status === 'approved'
    const isPending = request && request.status === 'pending'
    const isRejected = request && request.status === 'rejected'

    const activeLevel = request?.current_level

    const matchingRule = isPending && matrices.find(
        rule => rule.document_type === 'payment'
            && rule.level === activeLevel
            && parseFloat(payment.amount) >= parseFloat(rule.min_amount)
            && parseFloat(payment.amount) <= parseFloat(rule.max_amount)
    )

    const isCurrentUserApprover = matchingRule && matchingRule.approver_user_id === user?.id
    const activeApproverName = matchingRule 
        ? (memberships.find(m => m.user_id === matchingRule.approver_user_id)?.user?.name || `User ID #${matchingRule.approver_user_id}`)
        : "Unknown Approver"

    const handlePost = () => {
        if (confirm(`Are you sure you want to post this ${docLabel.toLowerCase()}? This will generate a journal entry and reduce open payables/receivables.`)) {
            postPayment.mutate(payment.id, {
                onSuccess: () => toast.success(`${docLabel} posted successfully`),
                onError: (err: Error) => toast.error(err?.message || `Failed to post ${docLabel.toLowerCase()}`)
            })
        }
    }

    const handleVoid = () => {
        if (confirm(`Are you sure you want to void this ${docLabel.toLowerCase()}? This will reverse the journal entry and reopen any allocated bills/invoices.`)) {
            voidPayment.mutate(payment.id, {
                onSuccess: () => toast.success(`${docLabel} voided successfully`),
                onError: (err: Error) => toast.error(err?.message || `Failed to void ${docLabel.toLowerCase()}`)
            })
        }
    }

    const handleSubmitApproval = () => {
        submitApproval.mutate(payment.id, {
            onSuccess: () => toast.success(`${docLabel} submitted for approval successfully`),
            onError: (err: Error) => toast.error(err?.message || `Failed to submit ${docLabel.toLowerCase()} for approval`)
        })
    }

    const handleAct = (action: 'approved' | 'rejected') => {
        if (!request) return
        actApproval.mutate({ id: request.id, action, remark }, {
            onSuccess: () => {
                toast.success(`${docLabel} approval request ${action} successfully`)
                setRemark("")
            },
            onError: (err: Error) => {
                toast.error(err?.message || `Failed to ${action} ${docLabel.toLowerCase()}`)
            }
        })
    }

    // Determine the header action configurations
    let primaryAction = undefined
    if (isDraft) {
        if (requiresApproval) {
            if (!request) {
                primaryAction = {
                    label: submitApproval.isPending ? "Submitting..." : "Submit for Approval",
                    onClick: handleSubmitApproval,
                    disabled: submitApproval.isPending
                }
            } else if (isApproved) {
                primaryAction = {
                    label: postPayment.isPending ? "Posting..." : `Post ${docLabel}`,
                    onClick: handlePost,
                    disabled: postPayment.isPending || voidPayment.isPending
                }
            }
        } else {
            primaryAction = {
                label: postPayment.isPending ? "Posting..." : `Post ${docLabel}`,
                onClick: handlePost,
                disabled: postPayment.isPending || voidPayment.isPending
            }
        }
    }

    return (
        <div className="w-full max-w-5xl pb-10">
            <PageHeader
                title={`${docLabel} ${payment.payment_number}`}
                primaryAction={primaryAction}
                secondaryAction={isDraft || payment.status === 'posted' ? {
                    label: voidPayment.isPending ? "Voiding..." : `Void ${docLabel}`,
                    onClick: handleVoid,
                    disabled: postPayment.isPending || voidPayment.isPending || submitApproval.isPending
                } : undefined}
            />

            <div className="grid gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className={`text-3xl font-bold mb-1 ${isOutgoing ? 'text-rose-600' : 'text-teal-600'}`}>
                            {isOutgoing ? '-' : '+'}{formatIDR(parseFloat(payment.amount))}
                        </h2>
                        <div className="text-navy-500 text-sm">
                            {isOutgoing ? 'Paid to ' : 'Received from '} 
                            <span className="font-semibold text-navy-700">{payment.partner?.name || `Partner #${payment.partner_id}`}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-right">
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Status</div>
                            <StatusBadge status={payment.status} />
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Date</div>
                            <div className="text-navy-900 font-medium">{formatDateID(payment.payment_date)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Method</div>
                            <div className="text-navy-900 font-medium capitalize">{payment.payment_method.replace('_', ' ')}</div>
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Bank / Cash</div>
                            <div className="text-navy-900 font-medium">{`Account #${payment.cash_account_id}`}</div>
                        </div>
                    </div>
                </div>

                {/* Approval Workflow Console */}
                {requiresApproval && (
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                        <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Icon name="fact_check" className="text-teal-600 w-5 h-5" />
                                <h3 className="font-bold text-navy-900 font-display">Persetujuan Dokumen (Document Approval)</h3>
                            </div>
                            {request ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-navy-500 font-medium">Status:</span>
                                    <StatusBadge status={request.status} />
                                </div>
                            ) : (
                                <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-lg border border-amber-200">
                                    Persetujuan Diperlukan (Approval Required)
                                </span>
                            )}
                        </div>

                        {!request && (
                            <div className="p-4 bg-navy-50/50 rounded-xl border border-navy-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="text-sm text-navy-600">
                                    This document requires approval before it can be posted to journals.
                                </div>
                                <Button 
                                    onClick={handleSubmitApproval} 
                                    disabled={submitApproval.isPending}
                                    className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 cursor-pointer"
                                >
                                    {submitApproval.isPending ? "Submitting..." : "Submit for Approval"}
                                </Button>
                            </div>
                        )}

                        {request && (
                            <div className="grid gap-6 md:grid-cols-3">
                                {/* Left/Middle: Timeline Trail */}
                                <div className="md:col-span-2 flex flex-col gap-4">
                                    <h4 className="text-xs text-navy-400 font-bold uppercase tracking-wider">Approval Trail</h4>
                                    <div className="flex flex-col gap-4 border-l border-navy-100 pl-4 ml-2 mt-2">
                                        {request.actions?.map((action, idx) => (
                                            <div key={idx} className="relative">
                                                <div className={cn(
                                                    "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-white",
                                                    action.action === 'approved' ? 'bg-teal-500' : 'bg-rose-500'
                                                )} />
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-semibold text-sm text-navy-950">
                                                            {action.user?.name || `User #${action.user_id}`}
                                                        </span>
                                                        <span className={cn(
                                                            "text-xs font-bold px-1.5 py-0.5 rounded",
                                                            action.action === 'approved' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                                                        )}>
                                                            {action.action === 'approved' ? 'Approved' : 'Rejected'} (Lvl {action.level})
                                                        </span>
                                                    </div>
                                                    {action.remark && (
                                                        <p className="text-xs text-navy-600 italic mt-1 bg-navy-50/50 p-2 rounded max-w-xl">
                                                            &quot;{action.remark}&quot;
                                                        </p>
                                                    )}
                                                    <span className="text-xs text-navy-400 block mt-1">
                                                        {formatDateID(action.acted_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!request.actions || request.actions.length === 0) && (
                                            <p className="text-navy-400 text-xs italic">No actions recorded yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Active Action Panel */}
                                <div className="border-t md:border-t-0 md:border-l border-navy-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                                    {isPending && (
                                        <>
                                            {isCurrentUserApprover ? (
                                                <div className="flex flex-col gap-4">
                                                    <h4 className="text-xs text-navy-400 font-bold uppercase tracking-wider">Your Decision (Level {activeLevel})</h4>
                                                    <Field
                                                        label="Remarks"
                                                        placeholder="e.g. Approved, valid payout reference"
                                                        value={remark}
                                                        onChange={(e) => setRemark(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => handleAct('rejected')}
                                                            disabled={actApproval.isPending}
                                                            variant="secondary"
                                                            className="flex-1 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer"
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAct('approved')}
                                                            disabled={actApproval.isPending}
                                                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                                                        >
                                                            {actApproval.isPending ? "Acting..." : "Approve"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 text-sm text-amber-800">
                                                    <Icon name="lock" className="text-amber-500 shrink-0 w-4 h-4 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-xs uppercase tracking-wider text-amber-900">Waiting for Approver</p>
                                                        <p className="text-xs text-amber-700 mt-1">
                                                            Currently waiting for approval from <span className="font-bold">{activeApproverName}</span> at level {activeLevel}.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {isApproved && (
                                        <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex gap-3 text-sm text-teal-800">
                                            <Icon name="check_circle" className="text-teal-600 shrink-0 w-5 h-5" />
                                            <div>
                                                <p className="font-bold text-xs uppercase tracking-wider text-teal-900">Fully Approved</p>
                                                <p className="text-xs text-teal-700 mt-1">
                                                    This document has passed all required approval levels and is ready to post.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {isRejected && (
                                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 text-sm text-rose-800">
                                            <Icon name="cancel" className="text-rose-600 shrink-0 w-5 h-5" />
                                            <div>
                                                <p className="font-bold text-xs uppercase tracking-wider text-rose-900">Rejected</p>
                                                <p className="text-xs text-rose-700 mt-1">
                                                    This document was rejected. You can edit the document details to reset it to a clean draft and re-submit.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 overflow-hidden">
                    <div className="p-4 border-b border-navy-100 bg-navy-50/50 flex items-center gap-2">
                        <Icon name="account_tree" className="text-navy-400" />
                        <h3 className="font-semibold text-navy-900">Allocations</h3>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-navy-50/80 border-b border-navy-100 text-sm text-navy-500">
                                <th className="px-6 py-4 font-semibold">Document</th>
                                <th className="px-6 py-4 font-semibold text-right">Document Total</th>
                                <th className="px-6 py-4 font-semibold text-right">Amount Allocated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payment.allocations?.map((alloc, idx) => {
                                const isBill = Boolean(alloc.bill_id)
                                const documentId = alloc.bill_id ?? alloc.invoice_id
                                const linkPrefix = isBill ? '/finance/bills' : '/finance/invoices'
                                const number = `${isBill ? 'Bill' : 'Invoice'} #${documentId}`
                                
                                return (
                                    <tr key={idx} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link href={`${linkPrefix}/${documentId}`} className="font-medium text-teal-600 hover:underline">
                                                {number}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-navy-700 text-right">
                                            -
                                        </td>
                                        <td className="px-6 py-4 text-navy-900 font-bold text-right text-lg">
                                            {formatIDR(parseFloat(alloc.amount))}
                                        </td>
                                    </tr>
                                )
                            })}
                            {(!payment.allocations || payment.allocations.length === 0) && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-navy-400 italic">No allocations recorded.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    
                    <div className="p-4 bg-navy-50 border-t border-navy-100 flex justify-between items-center text-sm">
                        <div className="font-semibold text-navy-500 uppercase tracking-wider">Unallocated (Prepayment)</div>
                        <div className="font-bold text-navy-900 text-xl">
                            {formatIDR(
                                Math.max(
                                    parseFloat(payment.amount)
                                        - (payment.allocations?.reduce((sum, alloc) => sum + parseFloat(alloc.amount), 0) ?? 0),
                                    0,
                                ),
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h3 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Notes & Reference</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-navy-400 mb-1">Reference Number</div>
                            <div className="font-medium text-navy-900">-</div>
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 mb-1">Notes</div>
                            <div className="text-navy-700 whitespace-pre-wrap">{payment.notes || '-'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
