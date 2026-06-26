import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ticketFeedbackSchema as feedbackSchema,
  ticketRemarkSchema as remarkSchema,
} from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddRemark,
  useTicketDetail,
  useUpdateTicketFeedback,
  useUpdateTicketStatus,
} from "@/hooks/useTickets";
import type { TicketStatus } from "@/types/ticket";
import { STATUS_FLOW } from "@/constants/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatDateTimeWithSeconds } from "@/lib/ticket-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</div>
      <div className="mt-0.5 text-sm text-slate-800">{value || "-"}</div>
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
  const updateFeedback = useUpdateTicketFeedback(ticketSrNo);
  const addRemarkMutation = useAddRemark(ticketSrNo);

  const [newRemark, setNewRemark] = useState("");
  const [remarkError, setRemarkError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

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
  const feedbackValue = feedback ?? ticket.feedback ?? "";
  const currentStatusIndex = STATUS_FLOW.indexOf(ticket.status);
  const canEdit = user?.role === "admin" || user?.id === ticket.assignedToUserId;

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

  async function handleFeedbackSave() {
    const parsed = feedbackSchema.safeParse(feedbackValue);
    if (!parsed.success) {
      setFeedbackError(parsed.error.issues[0].message);
      return;
    }
    setFeedbackError(null);
    await updateFeedback.mutateAsync(parsed.data);
    toast.success("Feedback saved");
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
          <h2 className="mt-3 text-xl font-bold text-slate-800 flex items-center gap-2">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Date Received" value={formatDate(ticket.ticketDate)} />
            <Field label="Mode" value={ticket.mode} />
            <Field label="Company Name" value={ticket.companyName} />
            <Field label="Contact Name" value={ticket.contactName} />
            <Field label="Contact No" value={ticket.contactNo} />
            <Field label="Email" value={ticket.emailId} />
            <Field label="Model" value={ticket.model} />
            <Field label="Serial Number(s)" value={ticket.serialNumber} />
            <Field label="Internal Tag" value={ticket.internalTag} />
            <div className="md:col-span-3">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Account Manager" value={ticket.accountManager} />
            <Field label="Assigned By" value={ticket.assignedBy} />
            <Field label="Call Type" value={ticket.callType} />
            <Field label="Assigned To" value={ticket.assignedTo} />
            <div>
              <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Deadline
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-800">
                {ticket.deadlineDate ? formatDate(ticket.deadlineDate) : "-"}
                {ticket.slaBreached && (
                  <Badge variant="secondary" className="rounded-full bg-rose-100 text-rose-800">
                    SLA Breached
                  </Badge>
                )}
              </div>
            </div>
            <Field label="Created" value={formatDateTime(ticket.createdAt)} />
            <Field label="Last Updated" value={formatDateTime(ticket.updatedAt)} />
          </div>

          {canEdit && (
            <div className="no-print mt-4 flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
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

      {ticket.status === "Closed" && (
        <Card className="mb-6">
          <CardContent>
            <h3 className="mb-3 text-sm font-bold text-cygnus-700">Feedback From User</h3>
            {canEdit ? (
              <div className="no-print">
                <div className="flex gap-2">
                  <Input
                    value={feedbackValue}
                    onChange={(e) => {
                      setFeedback(e.target.value);
                      setFeedbackError(null);
                    }}
                    placeholder="e.g. 5/5"
                    className="max-w-xs"
                    aria-invalid={Boolean(feedbackError)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleFeedbackSave}
                    disabled={updateFeedback.isPending}
                  >
                    Save
                  </Button>
                </div>
                {feedbackError && <p className="mt-1 text-xs text-destructive">{feedbackError}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-800">{feedbackValue || "-"}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-bold text-cygnus-700">Remarks Timeline</h3>
          <div className="flex flex-col gap-3">
            {remarks.length === 0 && <p className="text-sm text-slate-400">No remarks yet.</p>}
            {remarks.map((r) => (
              <div
                key={r.id}
                className="rounded-r-md border-l-3 border-cygnus-600 bg-slate-50 px-3.5 py-2"
              >
                <div className="mb-1 text-xs text-slate-500">
                  {formatDateTimeWithSeconds(r.createdAt)} {r.createdBy && `· ${r.createdBy}`}
                </div>
                <div className="text-sm text-slate-800">{r.body}</div>
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="no-print mt-4 border-t border-slate-200 pt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Add Update
              </label>
              <Textarea
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
