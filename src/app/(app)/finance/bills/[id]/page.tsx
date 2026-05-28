"use client"

import { use, useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { useBill, usePostBill, useVoidBill, type Bill } from "@/features/finance/api-bills"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { formatIDR, formatDateID } from "@/lib/format"
import { toast } from "sonner"
import { useSession } from "@/features/auth/session-provider"
import { useSubmitBillApproval, useActOnApproval, useApprovalMatrices, useCompanyMembers, type ApprovalRequest } from "@/features/finance/api-approvals"
import { Icon } from "@/components/ui/icon"
import { Field } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, activeCompanyId } = useSession()
    
    const { data: bill, isLoading } = useBill(id)
    const postBill = usePostBill()
    const voidBill = useVoidBill()
    const submitApproval = useSubmitBillApproval()
    const actApproval = useActOnApproval()
    const { data: matrices = [] } = useApprovalMatrices(activeCompanyId)
    const { data: memberships = [] } = useCompanyMembers(activeCompanyId)
    
    const [remark, setRemark] = useState("")

    if (isLoading) {
        return <div className="p-8 text-center text-navy-500">Loading bill...</div>
    }

    if (!bill) {
        return <div className="p-8 text-center text-rose-500">Bill not found.</div>
    }

    const request = (bill as Bill & { approval_request?: ApprovalRequest }).approval_request
    const isDraft = bill.status === 'draft'

    // Check if the bill total falls into any configured matrix rule bands
    const requiresApproval = matrices.some(
        rule => rule.document_type === 'bill'
            && parseFloat(bill.total) >= parseFloat(rule.min_amount)
            && parseFloat(bill.total) <= parseFloat(rule.max_amount)
    )

    const isApproved = request && request.status === 'approved'
    const isPending = request && request.status === 'pending'
    const isRejected = request && request.status === 'rejected'

    const activeLevel = request?.current_level

    const matchingRule = isPending && matrices.find(
        rule => rule.document_type === 'bill'
            && rule.level === activeLevel
            && parseFloat(bill.total) >= parseFloat(rule.min_amount)
            && parseFloat(bill.total) <= parseFloat(rule.max_amount)
    )

    const isCurrentUserApprover = matchingRule && matchingRule.approver_user_id === user?.id
    const activeApproverName = matchingRule 
        ? (memberships.find(m => m.user_id === matchingRule.approver_user_id)?.user?.name || `User ID #${matchingRule.approver_user_id}`)
        : "Unknown Approver"

    const handlePost = () => {
        if (confirm("Are you sure you want to post this bill? This action will generate an accounts payable journal entry and cannot be easily undone.")) {
            postBill.mutate(bill.id, {
                onSuccess: () => toast.success("Bill posted successfully"),
                onError: (err: Error) => toast.error(err?.message || "Failed to post bill")
            })
        }
    }

    const handleVoid = () => {
        if (confirm("Are you sure you want to void this bill? This will cancel any pending payables.")) {
            voidBill.mutate(bill.id, {
                onSuccess: () => toast.success("Bill voided successfully"),
                onError: (err: Error) => toast.error(err?.message || "Failed to void bill")
            })
        }
    }

    const handleSubmitApproval = () => {
        submitApproval.mutate(bill.id, {
            onSuccess: () => toast.success("Bill submitted for approval successfully"),
            onError: (err: Error) => toast.error(err?.message || "Failed to submit for approval")
        })
    }

    const handleAct = (action: 'approved' | 'rejected') => {
        if (!request) return
        actApproval.mutate({ id: request.id, action, remark }, {
            onSuccess: () => {
                toast.success(`Bill approval request ${action} successfully`)
                setRemark("")
            },
            onError: (err: Error) => {
                toast.error(err?.message || `Failed to ${action} bill`)
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
                    label: postBill.isPending ? "Posting..." : "Post Bill",
                    onClick: handlePost,
                    disabled: postBill.isPending || voidBill.isPending
                }
            }
        } else {
            primaryAction = {
                label: postBill.isPending ? "Posting..." : "Post Bill",
                onClick: handlePost,
                disabled: postBill.isPending || voidBill.isPending
            }
        }
    }

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                title={`Bill ${bill.bill_number}`}
                primaryAction={primaryAction}
                secondaryAction={isDraft || bill.status === 'posted' ? {
                    label: voidBill.isPending ? "Voiding..." : "Void Bill",
                    onClick: handleVoid,
                    disabled: postBill.isPending || voidBill.isPending || submitApproval.isPending
                } : undefined}
            />

            <div className="grid gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-navy-900 mb-1">{formatIDR(parseFloat(bill.total))}</h2>
                        <div className="text-navy-500 text-sm">
                            Billed from <span className="font-semibold text-navy-700">{bill.partner?.name || `Vendor #${bill.partner_id}`}</span>
                        </div>
                    </div>
                    <div className="flex gap-4 text-right">
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Status</div>
                            <StatusBadge status={bill.status} />
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Bill Date</div>
                            <div className="text-navy-900 font-medium">{formatDateID(bill.bill_date)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Due Date</div>
                            <div className="text-navy-900 font-medium">{formatDateID(bill.due_date)}</div>
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
                                                        placeholder="e.g. Budget approved, looks good"
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
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-navy-50/80 border-b border-navy-100 text-sm text-navy-500">
                                <th className="px-6 py-4 font-semibold">Description</th>
                                <th className="px-6 py-4 font-semibold text-right">Qty</th>
                                <th className="px-6 py-4 font-semibold text-right">Unit Price</th>
                                <th className="px-6 py-4 font-semibold text-right">Tax (PPN)</th>
                                <th className="px-6 py-4 font-semibold text-right">PPh (WHT)</th>
                                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bill.lines?.map((line, idx) => (
                                <tr key={idx} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 transition-colors">
                                    <td className="px-6 py-4 text-navy-900">{line.description}</td>
                                    <td className="px-6 py-4 text-navy-700 text-right">{parseFloat(line.quantity)}</td>
                                    <td className="px-6 py-4 text-navy-700 text-right">{formatIDR(parseFloat(line.unit_price))}</td>
                                    <td className="px-6 py-4 text-teal-600 text-right">{parseFloat(line.tax_amount) > 0 ? formatIDR(parseFloat(line.tax_amount)) : '-'}</td>
                                    <td className="px-6 py-4 text-rose-600 text-right">{parseFloat(line.withholding_amount) > 0 ? formatIDR(parseFloat(line.withholding_amount)) : '-'}</td>
                                    <td className="px-6 py-4 text-navy-900 font-semibold text-right">{formatIDR(parseFloat(line.line_total))}</td>
                                </tr>
                            ))}
                            {(!bill.lines || bill.lines.length === 0) && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-navy-400 italic">No line items found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                        <h3 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Notes</h3>
                        <p className="text-navy-700 whitespace-pre-wrap">{bill.notes || "No notes provided."}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col gap-3">
                        <div className="flex justify-between text-navy-500 font-semibold">
                            <span>Subtotal</span>
                            <span>{formatIDR(parseFloat(bill.subtotal))}</span>
                        </div>
                        {parseFloat(bill.tax_total) > 0 && (
                            <div className="flex justify-between text-navy-500 font-semibold">
                                <span>PPN (Value Added Tax)</span>
                                <span className="text-teal-600">+{formatIDR(parseFloat(bill.tax_total))}</span>
                            </div>
                        )}
                        {parseFloat(bill.withholding_total) > 0 && (
                            <div className="flex justify-between text-navy-500 font-semibold">
                                <span>PPh (Withholding Tax)</span>
                                <span className="text-rose-600">-{formatIDR(parseFloat(bill.withholding_total))}</span>
                            </div>
                        )}
                        <div className="border-t border-navy-100 my-1" />
                        <div className="flex justify-between text-navy-900 font-bold text-xl">
                            <span>Total</span>
                            <span>{formatIDR(parseFloat(bill.total))}</span>
                        </div>
                        <div className="flex justify-between text-teal-600 font-semibold mt-2">
                            <span>Amount Paid</span>
                            <span>{formatIDR(parseFloat(bill.amount_paid))}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 font-semibold">
                            <span>Balance Due</span>
                            <span>{formatIDR(parseFloat(bill.total) - parseFloat(bill.amount_paid))}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
