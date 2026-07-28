import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { projectRemarkSchema as remarkSchema } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useAddProjectRemark, useProjectDetail, useUpdateProjectStatus } from "@/hooks/useProjects";
import type { TicketStatus } from "@/types/ticket";
import { STATUS_FLOW } from "@/constants/ticket";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { InstallationReportPrint } from "@/components/InstallationReportPrint";
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

export function ProjectDetailPage() {
  const { srNo } = useParams<{ srNo: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const projectSrNo = Number(srNo);

  const { data, isLoading } = useProjectDetail(projectSrNo);
  const updateStatus = useUpdateProjectStatus(projectSrNo);
  const addRemarkMutation = useAddProjectRemark(projectSrNo);

  const [newRemark, setNewRemark] = useState("");
  const [remarkError, setRemarkError] = useState<string | null>(null);

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
  // Edit rights are admin-only for projects (unlike tickets, where assignees
  // can also edit) — see routes/projects.ts.
  const canEdit = user?.role === "admin";

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

  const modelText = project.components.map((c) => `${c.model} (${c.quantity} Qty)`).join("\n");
  const serialText = project.components
    .map((c) => `${c.model} (${c.quantity} Qty): - ${c.serialNumbers || "-"}`)
    .join("\n\n");
  const engineerName = project.assignees.map((a) => a.displayName).join(", ");

  return (
    <div>
      <div className="hidden print:block">
        <InstallationReportPrint
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
          date={formatDate(project.startDate)}
          engineerName={engineerName}
          status={project.status}
        />
      </div>

      <div className="print:hidden">
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <Button onClick={() => navigate("/projects")}>← Back to projects</Button>
          <h2 className="mt-3 text-xl font-bold text-neutral-800 flex items-center gap-2">
            Project: {project.projectNo} <ProjectStatusBadge project={project} />
          </h2>
        </div>
        <div className="flex gap-2">
          {project.status === "Closed" && (
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          )}
          {canEdit && (
            <Button onClick={() => navigate(`/projects/${project.srNo}/edit`)}>Edit</Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent>
          <h3 className="mb-3 text-sm font-bold text-cygnus-700">Project Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Start Date" value={formatDate(project.startDate)} />
            <Field label="Company Name" value={project.companyName} />
            <Field label="Contact Name" value={project.contactName} />
            <Field label="Contact No" value={project.contactNo} />
            <Field label="Email" value={project.emailId} />
            <Field label="Designation" value={project.designation} />
            <Field label="Department" value={project.department} />
            <Field label="PO Number" value={project.poNumber} />
            <Field label="Contract Number" value={project.contractNumber} />
            <div className="md:col-span-2">
              <Field label="Address" value={project.address} />
            </div>
            <div className="md:col-span-3">
              <Field label="Problem" value={project.problem} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Project Components
            </div>
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
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent>
          <h3 className="mb-3 text-sm font-bold text-cygnus-700">Assignment Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Account Manager" value={project.accountManager} />
            <Field label="Assigned By" value={project.assignedBy} />
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
            <Field label="Priority" value={project.priority} />
            <Field label="Time" value={`${project.timeValue} ${project.timeUnit}`} />
            <Field label="Deadline" value={formatDate(project.deadlineDate)} />
            <Field label="Created" value={formatDateTime(project.createdAt)} />
            <Field label="Last Updated" value={formatDateTime(project.updatedAt)} />
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
              <label className="mb-1 block text-xs font-semibold text-neutral-500">Add Update</label>
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
    </div>
  );
}
