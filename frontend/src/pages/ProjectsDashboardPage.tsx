import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useDownloadProjectImportTemplate,
  useExportProjects,
  useImportProjects,
  useProjectList,
  useProjectMetaOptions,
  useProjectSummary,
} from "@/hooks/useProjects";
import type { ProjectFilters } from "@/types/project";
import {
  PROJECT_SUMMARY_CARDS,
  ALL_FILTER_VALUE,
  DEFAULT_PROJECT_FILTERS,
  EXPORT_RANGE_OPTIONS,
  exportRangeToDateFrom,
  type ExportRange,
} from "@/constants/dashboard";
import { PRIORITY_CLASSES, PRIORITY_LABELS } from "@/constants/ticket";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, truncateChars } from "@/lib/ticket-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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

export function ProjectsDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_PROJECT_FILTERS);

  const isOverdueView = searchParams.get("overdue") === "true";
  const isMineView = searchParams.get("mine") === "true";

  const effectiveFilters = useMemo<ProjectFilters>(() => {
    if (isOverdueView) {
      return { ...filters, overdue: "true", assigneeUserId: undefined };
    }
    if (isMineView && user) {
      return { ...filters, assigneeUserId: user.id, overdue: undefined };
    }
    return filters;
  }, [filters, isOverdueView, isMineView, user]);

  const { data: summary } = useProjectSummary(isMineView ? user?.id : undefined);
  const { data: options } = useProjectMetaOptions();
  const { data: projectsResponse, isLoading } = useProjectList(effectiveFilters);

  const projects = projectsResponse?.projects ?? [];
  const total = projectsResponse?.total ?? 0;

  const isAdmin = user?.role === "admin";
  const exportMutation = useExportProjects();
  const importMutation = useImportProjects();
  const templateMutation = useDownloadProjectImportTemplate();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exportRange, setExportRange] = useState<ExportRange>("30");
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  async function handleExport() {
    setExportConfirmOpen(false);
    try {
      await exportMutation.mutateAsync({
        ...effectiveFilters,
        dateFrom: exportRangeToDateFrom(exportRange),
        dateTo: undefined,
      });
    } catch {
      toast.error("Failed to export projects");
    }
  }

  async function handleDownloadTemplate() {
    try {
      await templateMutation.mutateAsync();
    } catch {
      toast.error("Failed to download template");
    }
  }

  function handleImportFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingImportFile(file);
  }

  async function handleConfirmImport() {
    const file = pendingImportFile;
    setPendingImportFile(null);
    if (!file) return;
    try {
      const result = await importMutation.mutateAsync(file);
      if (result.failedCount === 0) {
        toast.success(`Imported ${result.created} project(s)`);
      } else if (result.created === 0) {
        toast.error(
          `Import failed for all ${result.failedCount} row(s). First error: ${result.errors[0]?.error}`,
        );
      } else {
        toast.warning(
          `Imported ${result.created} project(s), ${result.failedCount} row(s) failed. First error (row ${result.errors[0]?.row}): ${result.errors[0]?.error}`,
        );
      }
    } catch {
      toast.error("Failed to import file");
    }
  }

  function updateFilter<K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (value as number) : 1,
    }));
  }

  function updateSelectFilter(key: "status" | "accountManager" | "assignedBy" | "priority" | "team") {
    return (value: string) => updateFilter(key, value === ALL_FILTER_VALUE ? undefined : value);
  }

  function updateAssigneeFilter(value: string) {
    updateFilter("assigneeUserId", value === ALL_FILTER_VALUE ? undefined : Number(value));
  }

  const pageSize = filters.pageSize ?? 7;
  const page = filters.page ?? 1;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-neutral-800">Projects</h2>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setExportConfirmOpen(true)}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? "Exporting..." : "Export"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={templateMutation.isPending}
            >
              Download Template
            </Button>
            <Button
              variant="outline"
              onClick={() => importInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleImportFileSelected}
            />
            <Button variant="default" onClick={() => navigate("/projects/new")}>
              + New Project
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export projects to Excel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will download an .xlsx file of every project matching your
              current filters.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mb-2">
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Date Range</label>
            <Select value={exportRange} onValueChange={(v) => setExportRange(v as ExportRange)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExport}>Export</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingImportFile !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImportFile(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import projects from "{pendingImportFile?.name}" ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new project for every valid row in the file.
              Rows that fail validation will be skipped and reported — this
              cannot be undone in bulk, so make sure this is the right file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        {PROJECT_SUMMARY_CARDS.map((card) => (
          <Card key={card.key} className={cn(card.color)}>
            <CardContent>
              <div className="mb-1 text-sm font-semibold tracking-wide uppercase opacity-80">
                {card.label}
              </div>
              <div className="text-3xl font-bold">
                {summary ? summary[card.key] : <Skeleton className="h-7 w-10" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-2">
          <div className="min-w-44 flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Search</label>
            <Input
              placeholder="Company or project no."
              value={filters.search ?? ""}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
          <div className="min-w-14 flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Status</label>
            <Select value={filters.status ?? ALL_FILTER_VALUE} onValueChange={updateSelectFilter("status")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
                {options?.statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-20 flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Priority</label>
            <Select value={filters.priority ?? ALL_FILTER_VALUE} onValueChange={updateSelectFilter("priority")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
                {options?.priorities.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-28 flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Account Manager</label>
            <Select
              value={filters.accountManager ?? ALL_FILTER_VALUE}
              onValueChange={updateSelectFilter("accountManager")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
                {options?.accountManagers.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="min-w-20 flex-1">
              <label className="mb-1 block text-xs font-semibold text-neutral-500">Assigned To</label>
              <Select
                value={filters.assigneeUserId ? String(filters.assigneeUserId) : ALL_FILTER_VALUE}
                onValueChange={updateAssigneeFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
                  {options?.assignedToOptions.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="min-w-20 flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Team</label>
            <Select value={filters.team ?? ALL_FILTER_VALUE} onValueChange={updateSelectFilter("team")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
                {options?.teams.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-500">From</label>
            <DatePicker
              value={filters.dateFrom}
              onChange={(value) => updateFilter("dateFrom", value)}
              placeholder="Any date"
            />
          </div>
          <div className="flex flex-1 items-end">
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                setFilters(DEFAULT_PROJECT_FILTERS);
                if (isOverdueView || isMineView) {
                  navigate("/projects", { replace: true });
                }
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start Date</TableHead>
              <TableHead>Project No</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead>Assigned By</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deadline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="py-6 text-center text-neutral-400">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-6 text-center text-neutral-400">
                  No projects found.
                </TableCell>
              </TableRow>
            )}
            {projects.map((p) => (
              <TableRow
                key={p.srNo}
                className="cursor-pointer"
                onClick={() => navigate(`/projects/${p.srNo}`)}
              >
                <TableCell>{formatDate(p.startDate)}</TableCell>
                <TableCell>{p.projectNo}</TableCell>
                <TableCell>{truncateChars(p.companyName, 13)}</TableCell>
                <TableCell className="max-w-56 truncate whitespace-normal">
                  {truncateChars(p.problem, 15)}
                </TableCell>
                <TableCell>{p.assignedBy}</TableCell>
                <TableCell>
                  {truncateChars(p.assignees.map((a) => a.displayName).join(", "), 18)}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className={cn("rounded-full", PRIORITY_CLASSES[p.priority])}>
                        {p.priority}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{PRIORITY_LABELS[p.priority]}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge project={p} />
                </TableCell>
                <TableCell className="text-neutral-500">{formatDate(p.deadlineDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
        <span>
          Showing {projects.length} of {total} projects
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateFilter("page", page - 1)}
          >
            Prev
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateFilter("page", page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
