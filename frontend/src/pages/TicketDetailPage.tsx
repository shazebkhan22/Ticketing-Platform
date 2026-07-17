import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { StarIcon } from "lucide-react";
import {
  adminFeedbackResponseSchema,
  ticketRemarkSchema as remarkSchema,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddRemark,
  useTicketDetail,
  useUpdateAdminFeedbackResponse,
  useUpdateTicketStatus,
} from "@/hooks/useTickets";
import type { TicketStatus } from "@/types/ticket";
import { STATUS_FLOW } from "@/constants/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatDateTimeWithSeconds } from "@/lib/ticket-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{label}</div>
      <div className="mt-0.5 text-sm text-neutral-800 wrap-break-word whitespace-normal">{value || "-"}</div>
    </div>
  );
}

export function TicketDetailPage() {
  const { srNo } = useParams<{ srNo: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const ticketSrNo = Number(srNo);

  const { data, isLoading } = useTicketDetail(ticketSrNo);
  const updateStatus = useUpdateTicketStatus(ticketSrNo);
  const updateAdminFeedbackResponse = useUpdateAdminFeedbackResponse(ticketSrNo);
  const addRemarkMutation = useAddRemark(ticketSrNo);

  const [newRemark, setNewRemark] = useState("");
  const [remarkError, setRemarkError] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState<string | null>(null);
  const [adminResponseError, setAdminResponseError] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { ticket, remarks } = data;
  const adminResponseValue = adminResponse ?? ticket.adminFeedbackResponse ?? "";
  const currentStatusIndex = STATUS_FLOW.indexOf(ticket.status);
  const canEdit = user?.role === "admin" || ticket.assignees.some((a) => a.id === user?.id);

  async function handleAddRemark() {
    const parsed = remarkSchema.safeParse(newRemark);
    if (!parsed.success) {
      setRemarkError(parsed.error.issues[0].message);
      return;
    }
    setRemarkError(null);
    await addRemarkMutation.mutateAsync(parsed.data);
    setNewRemark("");
    toast.success("Remark added");
  }

  async function handleStatusChange(status: TicketStatus) {
    await updateStatus.mutateAsync(status);
    toast.success(`Status changed to ${status}`);
  }

  async function handleAdminResponseSave() {
    const parsed = adminFeedbackResponseSchema.safeParse(adminResponseValue);
    if (!parsed.success) {
      setAdminResponseError(parsed.error.issues[0].message);
      return;
    }
    setAdminResponseError(null);
    await updateAdminFeedbackResponse.mutateAsync(parsed.data);
    toast.success("Response saved");
  }

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <Button
            onClick={() => navigate("/")}
          >
            ← Back to dashboard
          </Button>
          <h2 className="mt-3 text-xl font-bold text-neutral-800 flex items-center gap-2">
            Ticket: {ticket.ticketNo} <StatusBadge ticket={ticket} />
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          {canEdit && (
            <Button onClick={() => navigate(`/tickets/${ticket.srNo}/edit`)}>Edit</Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent>
          <h3 className="mb-3 text-sm font-bold text-cygnus-700">Ticket Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Date Received" value={formatDate(ticket.ticketDate)} />
            <Field label="Mode" value={ticket.mode} />
            <Field label="Company Name" value={ticket.companyName} />
            <Field label="Contact Name" value={ticket.contactName} />
            <Field label="Contact No" value={ticket.contactNo} />
            <Field label="Email" value={ticket.emailId} />
            <Field label="Model" value={ticket.model} />
            <Field label="Serial Number(s)" value={ticket.serialNumber} />
            <Field label="Internal Tag" value={ticket.internalTag} />
            <div className="md:col-span-2">
              <Field label="Address" value={ticket.address} />
            </div>
            <div className="md:col-span-3">
              <Field label="Problem" value={ticket.problem} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent>
          <h3 className="mb-3 text-sm font-bold text-cygnus-700">Assignment Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Account Manager" value={ticket.accountManager} />
            <Field label="Assigned By" value={ticket.assignedBy} />
            <Field label="Call Type" value={ticket.callType} />
            <div>
              <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Assigned To
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {ticket.assignees.length > 0 ? (
                  ticket.assignees.map((a) => (
                    <Badge key={a.id} variant="secondary">
                      {a.displayName}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-neutral-800">-</span>
                )}
              </div>
            </div>
            <Field label="Priority" value={ticket.priority} />
            <Field
              label="Deadline"
              value={ticket.deadlineDate ? formatDate(ticket.deadlineDate) : "-"}
            />
            <Field label="Created" value={formatDateTime(ticket.createdAt)} />
            <Field label="Last Updated" value={formatDateTime(ticket.updatedAt)} />
          </div>

          {canEdit && (
            <div className="no-print mt-6 flex items-center gap-3">
              <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Change Status:
              </span>
              {STATUS_FLOW.map((s, idx) => (
                <Button
                  key={s}
                  size="sm"
                  variant={idx === currentStatusIndex ? "secondary" : "default"}
                  disabled={idx === currentStatusIndex || updateStatus.isPending}
                  onClick={() => handleStatusChange(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {ticket.status === "Closed" && ticket.customerFeedbackSubmittedAt && (
        <Card className="mb-6">
          <CardContent>
            <h3 className="mb-3 text-sm font-bold text-cygnus-700">Customer Feedback</h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <StarIcon
                  key={value}
                  className={cn(
                    "h-6 w-6",
                    value <= (ticket.customerFeedbackRating ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-neutral-300"
                  )}
                />
              ))}
              <span className="ml-2 text-sm text-neutral-500">
                {formatDateTime(ticket.customerFeedbackSubmittedAt)}
              </span>
            </div>
            {ticket.customerFeedbackComment && (
              <p className="mt-2 text-sm text-neutral-800">{ticket.customerFeedbackComment}</p>
            )}

            <div className="mt-5 border-t border-neutral-200 pt-4">
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Admin Response
              </h4>
              {canEdit ? (
                <div className="no-print">
                  <Textarea
                    value={adminResponseValue}
                    onChange={(e) => {
                      setAdminResponse(e.target.value);
                      setAdminResponseError(null);
                    }}
                    rows={3}
                    placeholder="Respond to the customer's feedback..."
                    aria-invalid={Boolean(adminResponseError)}
                  />
                  {adminResponseError && (
                    <p className="mt-1 text-xs text-destructive">{adminResponseError}</p>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleAdminResponseSave}
                    disabled={updateAdminFeedbackResponse.isPending}
                    className="mt-2"
                  >
                    {updateAdminFeedbackResponse.isPending ? "Saving..." : "Save Response"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-neutral-800">{adminResponseValue || "-"}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-bold text-cygnus-700">Remarks Timeline</h3>
          <div className="flex flex-col gap-3">
            {remarks.length === 0 && <p className="text-sm text-neutral-400">No remarks yet.</p>}
            {remarks.map((r) => (
              <div
                key={r.id}
                className="rounded-r-md border-l-3 border-cygnus-600 bg-neutral-50 px-3.5 py-2"
              >
                <div className="mb-1 text-xs text-neutral-500">
                  {formatDateTimeWithSeconds(r.createdAt)} {r.createdBy && `· ${r.createdBy}`}
                </div>
                <div className="text-sm text-neutral-800">{r.body}</div>
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="no-print mt-4 border-t border-neutral-200 pt-4">
              <label className="mb-1 block text-xs font-semibold text-neutral-500">
                Add Update
              </label>
              <Textarea
                capitalize
                value={newRemark}
                onChange={(e) => {
                  setNewRemark(e.target.value);
                  setRemarkError(null);
                }}
                rows={3}
                placeholder="Describe the update..."
                aria-invalid={Boolean(remarkError)}
              />
              {remarkError && <p className="mt-1 text-xs text-destructive">{remarkError}</p>}
              <Button
                disabled={addRemarkMutation.isPending || !newRemark.trim()}
                onClick={handleAddRemark}
                className="mt-2"
              >
                {addRemarkMutation.isPending ? "Adding..." : "Add Update"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
