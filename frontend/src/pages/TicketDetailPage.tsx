import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import {
  StarIcon,
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  Laptop,
  UserCog,
  Clock,
  MessageSquare,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import { adminFeedbackResponseSchema, ticketRemarkSchema as remarkSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddRemark,
  useTicketDetail,
  useUpdateAdminFeedbackResponse,
  useUpdateTicketStatus,
} from "@/hooks/useTickets";
import { useAddToInventory } from "@/hooks/useInventory";
import type { TicketStatus } from "@/types/ticket";
import {
  STATUS_FLOW,
  STATUS_ICONS,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  isLegalStatusTransition,
} from "@/constants/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { InstallationReport } from "@/components/InstallationReport";
import { Field, InfoPill, SectionCard } from "@/components/DetailCard";
import { RoutineChecksTable } from "@/components/RoutineChecksTable";
import {
  formatDate,
  formatDateTime,
  formatDateTimeWithSeconds,
  isOverdue,
  parseIsoDate,
} from "@/lib/ticket-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TicketDetailPage() {
  const { srNo } = useParams<{ srNo: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const ticketSrNo = Number(srNo);

  const { data, isLoading } = useTicketDetail(ticketSrNo);
  const updateStatus = useUpdateTicketStatus(ticketSrNo);
  const updateAdminFeedbackResponse = useUpdateAdminFeedbackResponse(ticketSrNo);
  const addRemarkMutation = useAddRemark(ticketSrNo);
  const addToInventoryMutation = useAddToInventory();

  const [newRemark, setNewRemark] = useState("");
  const [remarkError, setRemarkError] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState<string | null>(null);
  const [adminResponseError, setAdminResponseError] = useState<string | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [callTime, setCallTime] = useState("");
  const [confirmedCallTime, setConfirmedCallTime] = useState("");
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null);
  const [confirmAddToInventoryOpen, setConfirmAddToInventoryOpen] = useState(false);

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
  const overdue = isOverdue(ticket);

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

  function requestStatusChange(status: TicketStatus) {
    if (status === ticket.status) return;
    if (status === "Closed" && ticket.inventoryPending) {
      toast.error(
        "This ticket has a pending inward item that hasn't been dispatched yet. Complete the outward workflow in Inward/Outward before closing."
      );
      return;
    }
    setPendingStatus(status);
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return;
    const status = pendingStatus;
    try {
      await updateStatus.mutateAsync(status);
      toast.success(`Status changed to ${status}`);
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(typeof message === "string" ? message : "Failed to change status");
    } finally {
      setPendingStatus(null);
    }
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

  const engineerName = ticket.assignees.map((a) => a.displayName).join(", ");
  // Team FMS has no access to inward/outward at all — only admins and Team Field.
  // A closed ticket is done — reopen it first if it turns out inward/outward work
  // is needed after all. Routine Checks tickets never involve a physical
  // device changing hands, so they're excluded regardless of role (mirrors
  // the backend check in addToInventory).
  const canAddToInventory =
    canEdit &&
    (user?.role === "admin" || user?.team === "Field") &&
    ticket.status !== "Closed" &&
    ticket.callType !== "Routine Checks";

  async function handleAddToInventory() {
    try {
      await addToInventoryMutation.mutateAsync(ticket.srNo);
      toast.success("Added to Inward/Outward");
    } catch {
      toast.error("Failed to add to Inward/Outward");
    } finally {
      setConfirmAddToInventoryOpen(false);
    }
  }

  // Viewing the inward/outward details is restricted to the same audience
  // as the rest of the Inventory feature — admins and Team Field only (Team
  // FMS/Office never see inventory data anywhere else either).
  const canSeeInventoryDetails =
    (user?.role === "admin" || user?.team === "Field") && ticket.inInventory;
  return (
    <div>
      <div className="hidden print:block">
        <InstallationReport
          title="CALL REPORT"
          companyName={ticket.companyName}
          address={ticket.address}
          userName={ticket.contactName}
          email={ticket.emailId}
          mobileNo={ticket.contactNo}
          modelText={ticket.model ?? ""}
          serialText={ticket.serialNumber ?? ""}
          dateLabel="Date"
          date={formatDate(ticket.ticketDate)}
          time={confirmedCallTime}
          engineerName={engineerName}
          status={ticket.status}
        />
      </div>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Report Time</DialogTitle>
          </DialogHeader>
          <DateTimePicker
            date={parseIsoDate(ticket.ticketDate)}
            onDateChange={() => {}}
            dateDisabled
            time={callTime}
            onTimeChange={setCallTime}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmedCallTime(callTime);
                setPrintDialogOpen(false);
                const prevTitle = document.title;
                document.title = `Call Report - ${ticket.ticketNo}`;
                setTimeout(() => {
                  window.print();
                  document.title = prevTitle;
                }, 0);
              }}
            >
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === "Closed"
                ? "Close this ticket?"
                : `Change status to ${pendingStatus}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === "Closed"
                ? "This marks the ticket as resolved. If the customer hasn't already been notified (e.g. via the inward dispatch email), we'll email them now. You can reopen it later if needed."
                : `This will change the ticket's status from ${ticket.status} to ${pendingStatus}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAddToInventoryOpen} onOpenChange={setConfirmAddToInventoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add this ticket to Inward/Outward?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates an inward entry for ticket {ticket.ticketNo} so its inward/outward repair
              workflow can be tracked. It can't be removed from Inward/Outward once added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddToInventory}
              disabled={addToInventoryMutation.isPending}
            >
              {addToInventoryMutation.isPending ? "Adding..." : "Add to Inward/Outward"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="print:hidden">
        <div className="no-print mb-4">
          <Button onClick={() => navigate("/")}>← Back to dashboard</Button>
        </div>

        <div className="no-print mb-2 flex flex-wrap items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-800">Ticket: {ticket.ticketNo}</h2>
          </div>
          <div className="flex gap-2">
            {ticket.status === "Closed" && ticket.callType !== "Routine Checks" && (
              <Button
                variant="outline"
                onClick={() => {
                  setCallTime(format(new Date(), "HH:mm:ss"));
                  setPrintDialogOpen(true);
                }}
              >
                Print
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => navigate(`/tickets/${ticket.srNo}/edit`)}>Edit</Button>
            )}
          </div>
        </div>

        <Card className="mb-6">
          <CardContent>
            <div className="flex justify-between gap-6 overflow-x-auto">
              <InfoPill icon={Building2} label="Company" value={ticket.companyName} />
              <InfoPill icon={User} label="Contact" value={ticket.contactName} />
              <InfoPill icon={Phone} label="Phone" value={ticket.contactNo} />
              <InfoPill icon={Mail} label="Email" value={ticket.emailId} />
              <InfoPill icon={Calendar} label="Created On" value={formatDate(ticket.ticketDate)} />
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <SectionCard icon={MessageSquare} title="Problem Description">
            <p className="text-sm text-neutral-800 wrap-break-word whitespace-normal">
              {ticket.problem || "-"}
            </p>
          </SectionCard>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SectionCard icon={User} title="Customer Information">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Company Name" value={ticket.companyName} />
                  <Field label="Contact Person" value={ticket.contactName} />
                  <Field label="Phone" value={ticket.contactNo} />
                  <Field label="Email" value={ticket.emailId} />
                  <Field label="Address" value={ticket.address} />
                </div>
              </SectionCard>

              <SectionCard icon={Laptop} title="Device Information">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Model" value={ticket.model} />
                  <Field label="Serial Number(s)" value={ticket.serialNumber} />
                  <Field label="Internal Tag" value={ticket.internalTag} />
                  <Field label="Call Type" value={ticket.callType} />
                  <Field label="Mode" value={ticket.mode} />
                </div>
                {canAddToInventory && (
                  <div className="no-print mt-4">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setConfirmAddToInventoryOpen(true)}
                      disabled={ticket.inInventory || addToInventoryMutation.isPending}
                    >
                      {ticket.inInventory
                        ? "Added to Inward/Outward"
                        : addToInventoryMutation.isPending
                          ? "Adding..."
                          : "Add to Inward/Outward"}
                    </Button>
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard icon={UserCog} title="Assignment">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                {ticket.callType !== "Routine Checks" && (
                  <>
                    <Field label="Assigned By" value={ticket.assignedBy} />
                    <Field label="Account Manager" value={ticket.accountManager} />
                    <Field label="Priority" value={ticket.priority} />
                    <Field
                      label="Deadline"
                      value={ticket.deadlineDate ? formatDate(ticket.deadlineDate) : "-"}
                    />
                  </>
                )}
              </div>

              {canEdit && (
                <div className="no-print mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <span className="mb-2 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Change Status
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {STATUS_FLOW.map((s, idx) => {
                      const StatusIcon = STATUS_ICONS[s];
                      const isCurrent = idx === currentStatusIndex;
                      const blockedByInventory = s === "Closed" && ticket.inventoryPending;
                      const blockedByTransition =
                        !isCurrent && !isLegalStatusTransition(ticket.status, s);
                      const button = (
                        <Button
                          key={s}
                          size="sm"
                          variant={isCurrent ? "secondary" : "outline"}
                          className="gap-1.5"
                          disabled={
                            isCurrent ||
                            blockedByInventory ||
                            blockedByTransition ||
                            updateStatus.isPending
                          }
                          onClick={() => requestStatusChange(s)}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {s}
                        </Button>
                      );
                      if (blockedByInventory) {
                        return (
                          <Tooltip key={s}>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
                            <TooltipContent>
                              Pending inward dispatch — complete the outward workflow in
                              Inward/Outward first.
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      if (blockedByTransition) {
                        return (
                          <Tooltip key={s}>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
                            <TooltipContent>
                              {ticket.status === "Closed"
                                ? "Reopen the ticket to Pending first."
                                : `Move to "${STATUS_FLOW[idx - 1] ?? s}" first.`}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return button;
                    })}
                  </div>
                  {ticket.inventoryPending && ticket.status !== "Closed" && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-amber-700">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        This ticket includes a product inward that has not yet been dispatched back
                        to the customer. The ticket cannot be closed until the product is
                        dispatched.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            {ticket.callType === "Routine Checks" && ticket.routineChecks.length > 0 && (
              <SectionCard icon={CheckCircle2} title="Checklist">
                <RoutineChecksTable routineChecks={ticket.routineChecks} />
              </SectionCard>
            )}

            {ticket.status === "Closed" && ticket.customerFeedbackSubmittedAt && (
              <SectionCard icon={StarIcon} title="Customer Feedback">
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
                  {ticket.adminFeedbackRespondedAt && (
                    <div className="mb-2 text-xs text-neutral-500">
                      {formatDateTimeWithSeconds(ticket.adminFeedbackRespondedAt)}
                      {ticket.adminFeedbackRespondedBy && ` · ${ticket.adminFeedbackRespondedBy}`}
                    </div>
                  )}
                  {user?.role === "admin" ? (
                    <div className="no-print">
                      <Textarea
                        capitalize
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
                      {adminResponseValue !== (ticket.adminFeedbackResponse ?? "") && (
                        <Button
                          variant="outline"
                          onClick={handleAdminResponseSave}
                          disabled={updateAdminFeedbackResponse.isPending}
                          className="mt-2"
                        >
                          {updateAdminFeedbackResponse.isPending
                            ? "Saving..."
                            : ticket.adminFeedbackResponse
                              ? "Update Response"
                              : "Save Response"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-800">{adminResponseValue || "-"}</p>
                  )}
                </div>
              </SectionCard>
            )}
          </div>

          <div className="space-y-6 lg:sticky lg:top-4">
            <SectionCard icon={Clock} title="Status">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Status
                  </span>
                  <StatusBadge ticket={ticket} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Call Type
                  </span>
                  <span className="text-sm text-neutral-800">{ticket.callType}</span>
                </div>
                {ticket.callType !== "Routine Checks" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        Priority
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className={cn("rounded-full", PRIORITY_CLASSES[ticket.priority])}
                          >
                            {ticket.priority}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{PRIORITY_LABELS[ticket.priority]}</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        Deadline
                      </span>
                      <span className="text-sm text-neutral-800">
                        {ticket.deadlineDate ? formatDate(ticket.deadlineDate) : "-"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {overdue && (
                <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-red-700">
                  <span className="text-sm font-medium">Ticket is overdue</span>
                </div>
              )}
            </SectionCard>

            <SectionCard icon={Calendar} title="History">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-neutral-800">{ticket.status}</div>
                  <div className="text-xs text-neutral-500">{formatDateTime(ticket.updatedAt)}</div>
                </div>
                <div className="border-t border-neutral-200 pt-3">
                  <div className="text-sm font-medium text-neutral-800">Ticket created</div>
                  <div className="text-xs text-neutral-500">{formatDateTime(ticket.createdAt)}</div>
                </div>
              </div>

              {canSeeInventoryDetails && (
                <div className="mt-4 border-t border-neutral-200 pt-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    <Laptop className="h-3.5 w-3.5" />
                    Inward / Outward
                  </div>
                  <div className="space-y-3">
                    <Field
                      label="Inward Date"
                      value={
                        ticket.inventory?.inwardDate ? formatDate(ticket.inventory.inwardDate) : "-"
                      }
                    />
                    <Field
                      label="Outward Date"
                      value={
                        ticket.inventory?.outwardDate
                          ? formatDate(ticket.inventory.outwardDate)
                          : "-"
                      }
                    />
                    <Field label="Repair Location" value={ticket.inventory?.repairLocation} />
                    {ticket.inventory?.repairLocation === "Outsourced" && (
                      <>
                        <Field label="Outsource Vendor" value={ticket.inventory?.outsourceVendor} />
                        <Field
                          label="Expected Return Date"
                          value={
                            ticket.inventory?.expectedReturnDate
                              ? formatDate(ticket.inventory.expectedReturnDate)
                              : "-"
                          }
                        />
                        <Field label="Delivery Person" value={ticket.inventory?.deliveryPerson} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        <SectionCard icon={Clock} title="Remarks Timeline">
          <div className="flex flex-col gap-3">
            {remarks.length === 0 && <p className="text-sm text-neutral-400">No remarks yet.</p>}
            {remarks.map((r) => (
              <div
                key={r.id}
                className="rounded-r-md border-l-3 border-cygnus-800 bg-neutral-50 px-3.5 py-2 capitalize"
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
        </SectionCard>
      </div>
    </div>
  );
}
