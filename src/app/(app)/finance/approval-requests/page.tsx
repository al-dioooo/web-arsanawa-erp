"use client"

import { useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { useApprovalRequests, useActOnApproval, useApprovalMatrices, useCompanyMembers, type ApprovalRequest } from "@/features/finance/api-approvals"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { toast } from "sonner"
import { formatIDR, formatDateID } from "@/lib/format"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function ApprovalRequestsPage() {
    const { activeCompanyId } = useSession()
    const [statusFilter, setStatusFilter] = useState<string>("pending")
    const { data: response, isLoading } = useApprovalRequests(activeCompanyId, {
        status: statusFilter || undefined
    })
    
    const requests = response?.approval_requests || []
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)

    return (
        <div className="w-full">
            <PageHeader title="Permintaan Persetujuan (Approval Requests)" />

            <FilterBar>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm border border-navy-200 rounded-lg px-3 py-1.5 bg-white text-navy-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow cursor-pointer"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </FilterBar>

            <div className="mb-4 border-b border-navy-100 flex gap-4">
                <button
                    onClick={() => setStatusFilter("pending")}
                    className={cn(
                        "py-2 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer",
                        statusFilter === "pending" ? "border-teal-600 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-700"
                    )}
                >
                    Pending Queue
                </button>
                <button
                    onClick={() => setStatusFilter("approved")}
                    className={cn(
                        "py-2 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer",
                        statusFilter === "approved" ? "border-teal-600 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-700"
                    )}
                >
                    Approved Requests
                </button>
                <button
                    onClick={() => setStatusFilter("rejected")}
                    className={cn(
                        "py-2 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer",
                        statusFilter === "rejected" ? "border-teal-600 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-700"
                    )}
                >
                    Rejected Requests
                </button>
            </div>

            <DataTable columns={["Document Type", "Ref Number", "Amount", "Current Level", "Submitted Date", "Status", "Actions"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-navy-500">
                            Loading approval requests...
                        </td>
                    </tr>
                )}
                {!isLoading && requests.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-navy-500">
                            No approval requests found.
                        </td>
                    </tr>
                )}
                {requests.map((request) => {
                    const isBill = request.approvable_type.includes("Bill")
                    const typeLabel = isBill ? "Bill" : "Payment"
                    const refNumber = isBill 
                        ? (request.approvable?.bill_number || `Bill #${request.approvable_id}`)
                        : (request.approvable?.payment_number || `Payment #${request.approvable_id}`)
                    const amount = isBill 
                        ? (request.approvable?.total || "0")
                        : (request.approvable?.amount || "0")
                    const detailLink = isBill 
                        ? `/finance/bills/${request.approvable_id}`
                        : `/finance/payments/${request.approvable_id}`

                    return (
                        <tr key={request.id} className="hover:bg-navy-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-navy-900 capitalize">{typeLabel}</td>
                            <td className="px-6 py-4">
                                <Link href={detailLink} className="font-semibold text-teal-600 hover:underline">
                                    {refNumber}
                                </Link>
                            </td>
                            <td className="px-6 py-4 text-navy-900 font-bold">{formatIDR(parseFloat(amount))}</td>
                            <td className="px-6 py-4 font-mono font-medium text-navy-700">Level {request.current_level}</td>
                            <td className="px-6 py-4 text-navy-500 text-sm">
                                {request.created_at ? formatDateID(request.created_at) : "-"}
                            </td>
                            <td className="px-6 py-4">
                                <StatusBadge status={request.status} />
                            </td>
                            <td className="px-6 py-4">
                                <Button 
                                    size="sm" 
                                    variant="secondary"
                                    onClick={() => setSelectedRequest(request)}
                                    className="cursor-pointer"
                                >
                                    Review
                                </Button>
                            </td>
                        </tr>
                    )
                })}
            </DataTable>

            {selectedRequest && (
                <ApprovalActionDrawer 
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    )
}

function ApprovalActionDrawer({ request, onClose }: { request: ApprovalRequest; onClose: () => void }) {
    const { user: sessionUser, activeCompanyId } = useSession()
    const { data: matrices = [] } = useApprovalMatrices(activeCompanyId)
    const { data: memberships = [] } = useCompanyMembers(activeCompanyId)
    const actMutation = useActOnApproval()
    const [remark, setRemark] = useState("")

    const isBill = request.approvable_type.includes("Bill")
    const docType = isBill ? "bill" : "payment"
    const amount = isBill 
        ? (request.approvable?.total || "0")
        : (request.approvable?.amount || "0")

    const matchingRule = matrices.find(
        rule => rule.document_type === docType
            && rule.level === request.current_level
            && parseFloat(amount) >= parseFloat(rule.min_amount)
            && parseFloat(amount) <= parseFloat(rule.max_amount)
    )

    const isCurrentUserApprover = matchingRule && matchingRule.approver_user_id === sessionUser?.id
    const activeApproverName = matchingRule 
        ? (memberships.find(m => m.user_id === matchingRule.approver_user_id)?.user?.name || `User ID #${matchingRule.approver_user_id}`)
        : "Unknown Approver"

    const handleAction = (action: 'approved' | 'rejected') => {
        actMutation.mutate({ id: request.id, action, remark }, {
            onSuccess: () => {
                toast.success(`Request ${action} successfully`)
                onClose()
            },
            onError: (err: Error) => {
                toast.error(err?.message || `Failed to ${action} request`)
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
                    <h2 className="text-lg font-bold text-navy-900">Review Approval Request</h2>
                    <button onClick={onClose} className="p-2 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-full transition-colors cursor-pointer">
                        <Icon name="close" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {/* Document details box */}
                    <div className="rounded-xl border border-navy-100 p-4 bg-navy-50/20">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-navy-400 font-semibold block mb-0.5">Document Type</span>
                                <span className="font-bold text-navy-900 capitalize">{docType}</span>
                            </div>
                            <div>
                                <span className="text-navy-400 font-semibold block mb-0.5">Reference No</span>
                                <span className="font-bold text-navy-900">
                                    {isBill 
                                        ? (request.approvable?.bill_number || `Bill #${request.approvable_id}`)
                                        : (request.approvable?.payment_number || `Payment #${request.approvable_id}`)}
                                </span>
                            </div>
                            <div>
                                <span className="text-navy-400 font-semibold block mb-0.5">Amount</span>
                                <span className="font-bold text-teal-600">{formatIDR(parseFloat(amount))}</span>
                            </div>
                            <div>
                                <span className="text-navy-400 font-semibold block mb-0.5">Current Level</span>
                                <span className="font-mono font-bold text-navy-900">Level {request.current_level}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline / Actions Trail */}
                    <div>
                        <h3 className="font-bold text-navy-900 text-sm mb-3">Approval Trail</h3>
                        <div className="flex flex-col gap-4 border-l-2 border-navy-100 pl-4 ml-2">
                            {request.actions?.map((action, idx) => (
                                <div key={idx} className="relative">
                                    <div className={cn(
                                        "absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-white",
                                        action.action === 'approved' ? 'bg-teal-500' : 'bg-rose-500'
                                    )} />
                                    <div>
                                        <div className="flex items-center gap-2">
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
                                            <p className="text-sm text-navy-600 italic mt-1 bg-navy-50/50 p-2 rounded">
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

                    {/* Action form */}
                    {request.status === 'pending' && (
                        <div className="border-t border-navy-100 pt-6 mt-auto">
                            {isCurrentUserApprover ? (
                                <div className="flex flex-col gap-4">
                                    <Field
                                        label="Review Remarks"
                                        placeholder="Add comments/reasons for decision..."
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => handleAction('rejected')}
                                            disabled={actMutation.isPending}
                                            className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            onClick={() => handleAction('approved')}
                                            disabled={actMutation.isPending}
                                            className="bg-teal-600 hover:bg-teal-700 text-white"
                                        >
                                            {actMutation.isPending ? "Approving..." : "Approve"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 text-sm text-amber-800">
                                    <Icon name="warning" className="text-amber-500 shrink-0" />
                                    <div>
                                        <p className="font-semibold">Review Locked</p>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            Only the designated approver (<span className="font-semibold">{activeApproverName}</span>) can act on Level {request.current_level} of this request.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
