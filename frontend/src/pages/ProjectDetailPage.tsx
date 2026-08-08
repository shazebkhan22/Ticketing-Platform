import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { projectRemarkSchema as remarkSchema } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddProjectRemark,
  useProjectDetail,
  useUpdateProjectRemarkHighlight,
  useUpdateProjectStatus,
} from "@/hooks/useProjects";
import {
  StarIcon,
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  Boxes,
  UserCog,
  Clock,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/types/ticket";
import {
  STATUS_FLOW,
  STATUS_ICONS,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  isLegalStatusTransition,
} from "@/constants/ticket";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { InstallationReport } from "@/components/InstallationReport";
import { Field, InfoPill, SectionCard } from "@/components/DetailCard";
import {
  formatDate,
  formatDateTime,
  formatDateTimeWithSeconds,
  parseIsoDate,
} from "@/lib/ticket-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProjectDetailPage() {
  const { srNo } = useParams<{ srNo: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const projectSrNo = Number(srNo);

  const { data, isLoading } = useProjectDetail(projectSrNo);
  const updateStatus = useUpdateProjectStatus(projectSrNo);
  const addRemarkMutation = useAddProjectRemark(projectSrNo);
  const highlightRemarkMutation = useUpdateProjectRemarkHighlight(projectSrNo);

  const [newRemark, setNewRemark] = useState("");
  const [remarkError, setRemarkError] = useState<string | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [installationDateChoice, setInstallationDateChoice] = useState<"deadline" | "custom">(
    "deadline"
  );
  const [customInstallationDate, setCustomInstallationDate] = useState<string | undefined>(
    undefined
  );
  const [confirmedInstallationDate, setConfirmedInstallationDate] = useState<string | undefined>(
    undefined
  );
  const [installationTime, setInstallationTime] = useState("");
  const [confirmedInstallationTime, setConfirmedInstallationTime] = useState("");

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { project, remarks } = data;
  const currentStatusIndex = STATUS_FLOW.indexOf(project.status);
  // Editing and status changes are admin-only for projects (unlike tickets,
  // where assignees can also edit) — see requireAdmin on PUT/PATCH status in
  // routes/projects.ts. Remarks are looser, matching requireProjectAssigneeOrAdmin.
  const isAdmin = user?.role === "admin";
  const canAddRemark = isAdmin || project.assignees.some((a) => a.id === user?.id);

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
    try {
      await updateStatus.mutateAsync(status);
      toast.success(`Status changed to ${status}`);
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(typeof message === "string" ? message : "Failed to change status");
    }
  }

  const modelText = project.components.map((c) => `${c.model} (${c.quantity} Qty)`).join("\n");
  const serialText = project.components
    .map((c) => `${c.model} (${c.quantity} Qty): - ${c.serialNumbers || "-"}`)
    .join("\n\n");
  const engineerName = project.assignees.map((a) => a.displayName).join(", ");

  return (
    <div>
      <div className="hidden print:block">
        <InstallationReport
          title="INSTALLATION REPORT"
          companyName={project.companyName}
          address={project.address}
          userName={project.contactName}
          designation={project.designation}
          department={project.department}
          email={project.emailId}
          mobileNo={project.contactNo}
          poNumber={project.poNumber}
          contractNo={project.contractNumber}
          modelText={modelText}
          serialText={serialText}
          dateLabel="Installation Date"
          date={
            confirmedInstallationDate
              ? formatDate(confirmedInstallationDate)
              : formatDate(project.deadlineDate)
          }
          time={confirmedInstallationTime}
          engineerName={engineerName}
          status={project.status}
        />
      </div>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Installation Date</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input
                type="radio"
                name="installationDateChoice"
                checked={installationDateChoice === "deadline"}
                onChange={() => setInstallationDateChoice("deadline")}
              />
              Use deadline ({formatDate(project.deadlineDate)})
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input
                type="radio"
                name="installationDateChoice"
                checked={installationDateChoice === "custom"}
                onChange={() => setInstallationDateChoice("custom")}
              />
              Custom date
            </label>
            <DateTimePicker
              date={
                installationDateChoice === "custom"
                  ? parseIsoDate(customInstallationDate)
                  : parseIsoDate(project.deadlineDate)
              }
              onDateChange={(d) =>
                setCustomInstallationDate(d ? format(d, "yyyy-MM-dd") : undefined)
              }
              dateDisabled={installationDateChoice === "deadline"}
              time={installationTime}
              onTimeChange={setInstallationTime}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={installationDateChoice === "custom" && !customInstallationDate}
              onClick={() => {
                setConfirmedInstallationDate(
                  installationDateChoice === "custom"
                    ? customInstallationDate
                    : project.deadlineDate
                );
                setConfirmedInstallationTime(installationTime);
                setPrintDialogOpen(false);
                const prevTitle = document.title;
                document.title = `Installation Report - ${project.projectNo}`;
                // Wait a tick so the report re-renders with the chosen date before print().
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

      <div className="print:hidden">
        <div className="no-print mb-4">
          <Button onClick={() => navigate("/projects")}>← Back to projects</Button>
        </div>

        <div className="no-print mb-2 flex flex-wrap items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-800">
              Project: {project.projectNo} <ProjectStatusBadge project={project} />
            </h2>
          </div>
          <div className="flex gap-2">
            {project.status === "Closed" && (
              <Button
                variant="outline"
                onClick={() => {
                  setInstallationDateChoice("deadline");
                  setCustomInstallationDate(undefined);
                  setInstallationTime(format(new Date(), "HH:mm:ss"));
                  setPrintDialogOpen(true);
                }}
              >
                Print
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => navigate(`/projects/${project.srNo}/edit`)}>Edit</Button>
            )}
          </div>
        </div>

        {remarks.some((r) => r.highlighted) && (
          <div className="mb-6">
            <SectionCard icon={StarIcon} title="Roadblocks">
              <div className="flex flex-col gap-1">
                {remarks
                  .filter((r) => r.highlighted)
                  .reverse()
                  .map((r) => (
                    <div
                      key={r.id}
                      className="rounded-r-md border-l-3 border-red-500 bg-red-50 px-3.5 py-2"
                    >
                      <div className="mb-1 text-xs text-neutral-500 capitalize">
                        {formatDateTimeWithSeconds(r.createdAt)} {r.createdBy && `· ${r.createdBy}`}
                      </div>
                      <div className="text-sm font-bold text-neutral-800">{r.body}</div>
                    </div>
                  ))}
              </div>
            </SectionCard>
          </div>
        )}

        <Card className="mb-6">
          <CardContent>
            <div className="flex justify-between gap-6 overflow-x-auto">
              <InfoPill icon={Building2} label="Company" value={project.companyName} />
              <InfoPill icon={User} label="Contact" value={project.contactName} />
              <InfoPill icon={Phone} label="Phone" value={project.contactNo} />
              <InfoPill icon={Mail} label="Email" value={project.emailId} />
              <InfoPill icon={Calendar} label="Start Date" value={formatDate(project.startDate)} />
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <SectionCard icon={MessageSquare} title="Problem Description">
            <p className="text-sm text-neutral-800 wrap-break-word whitespace-normal">
              {project.problem || "-"}
            </p>
          </SectionCard>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SectionCard icon={User} title="Customer Information">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Company Name" value={project.companyName} />
                  <Field label="Contact Name" value={project.contactName} />
                  <Field label="Designation" value={project.designation} />
                  <Field label="Department" value={project.department} />
                  <Field label="Address" value={project.address} />
                </div>
              </SectionCard>

              <SectionCard icon={Boxes} title="Project Components">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="PO Number" value={project.poNumber} />
                  <Field label="Contract Number" value={project.contractNumber} />
                </div>
                <div className="mt-4">
                  {project.components.length === 0 ? (
                    <p className="text-sm text-neutral-800">-</p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border border-neutral-200">
                      <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Model</th>
                            <th className="px-3 py-2 text-left">Qty</th>
                            <th className="px-3 py-2 text-left">Serial Number(s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {project.components.map((c, idx) => (
                            <tr key={idx} className="border-t border-neutral-200">
                              <td className="px-3 py-2 text-neutral-800">{c.model}</td>
                              <td className="px-3 py-2 text-neutral-800">{c.quantity}</td>
                              <td className="px-3 py-2 text-neutral-800 whitespace-normal">
                                {c.serialNumbers || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <SectionCard icon={UserCog} title="Assignment">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Assigned To
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {project.assignees.length > 0 ? (
                      project.assignees.map((a) => (
                        <Badge key={a.id} variant="secondary">
                          {a.displayName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-neutral-800">-</span>
                    )}
                  </div>
                </div>
                <Field label="Assigned By" value={project.assignedBy} />
                <Field label="Account Manager" value={project.accountManager} />
                <Field label="Priority" value={project.priority} />
                <Field label="Time" value={`${project.timeValue} ${project.timeUnit}`} />
                <Field label="Deadline" value={formatDate(project.deadlineDate)} />
              </div>

              {isAdmin && (
                <div className="no-print mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <span className="mb-2 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Change Status
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {STATUS_FLOW.map((s, idx) => {
                      const StatusIcon = STATUS_ICONS[s];
                      const isCurrent = idx === currentStatusIndex;
                      const blockedByTransition =
                        !isCurrent && !isLegalStatusTransition(project.status, s);
                      const button = (
                        <Button
                          key={s}
                          size="sm"
                          variant={isCurrent ? "secondary" : "outline"}
                          className="gap-1.5"
                          disabled={isCurrent || blockedByTransition || updateStatus.isPending}
                          onClick={() => handleStatusChange(s)}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {s}
                        </Button>
                      );
                      if (blockedByTransition) {
                        return (
                          <Tooltip key={s}>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
                            <TooltipContent>
                              {project.status === "Closed"
                                ? "Reopen the project to Pending first."
                                : `Move to "${STATUS_FLOW[idx - 1] ?? s}" first.`}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return button;
                    })}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6 lg:sticky lg:top-4">
            <SectionCard icon={Clock} title="Status">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Status
                  </span>
                  <ProjectStatusBadge project={project} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Priority
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className={cn("rounded-full", PRIORITY_CLASSES[project.priority])}
                      >
                        {project.priority}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{PRIORITY_LABELS[project.priority]}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Deadline
                  </span>
                  <span className="text-sm text-neutral-800">
                    {formatDate(project.deadlineDate)}
                  </span>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Calendar} title="History">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-neutral-800">{project.status}</div>
                  <div className="text-xs text-neutral-500">
                    {formatDateTime(project.updatedAt)}
                  </div>
                </div>
                <div className="border-t border-neutral-200 pt-3">
                  <div className="text-sm font-medium text-neutral-800">Project created</div>
                  <div className="text-xs text-neutral-500">
                    {formatDateTime(project.createdAt)}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard icon={Clock} title="Remarks Timeline">
          <div className="flex flex-col gap-3">
            {remarks.length === 0 && <p className="text-sm text-neutral-400">No remarks yet.</p>}
            {remarks.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-r-md border-l-3 px-3.5 py-2",
                  r.highlighted
                    ? "border-orange-500 bg-orange-50"
                    : "border-cygnus-800 bg-neutral-50"
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2 capitalize">
                  <div className="text-xs text-neutral-500">
                    {formatDateTimeWithSeconds(r.createdAt)} {r.createdBy && `· ${r.createdBy}`}
                  </div>
                  {canAddRemark && (
                    <button
                      type="button"
                      className="no-print shrink-0 text-neutral-400 hover:text-orange-500"
                      disabled={highlightRemarkMutation.isPending}
                      title={r.highlighted ? "Remove highlight" : "Highlight this remark"}
                      onClick={() =>
                        highlightRemarkMutation.mutate({
                          remarkId: r.id,
                          highlighted: !r.highlighted,
                        })
                      }
                    >
                      <StarIcon
                        className={cn(
                          "h-4 w-4",
                          r.highlighted && "fill-orange-500 text-orange-500"
                        )}
                      />
                    </button>
                  )}
                </div>
                <div className={cn("text-sm text-neutral-800", r.highlighted && "font-bold")}>
                  {r.body}
                </div>
              </div>
            ))}
          </div>

          {canAddRemark && (
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
