import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useDownloadImportTemplate,
  useExportTickets,
  useImportTickets,
  useMetaOptions,
  useSummary,
  useTicketList,
} from "@/hooks/useTickets";
import type { TicketFilters } from "@/types/ticket";
import { SUMMARY_CARDS, ALL_FILTER_VALUE, DEFAULT_TICKET_FILTERS } from "@/constants/dashboard";
import { StatusBadge } from "@/components/StatusBadge";
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

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_TICKET_FILTERS);

  const isOverdueView = searchParams.get("overdue") === "true";
  const isMineView = searchParams.get("mine") === "true";
  const currentUserDisplayName = user?.displayName;

  // Sidebar quick-links ("My Tickets" / "Overdue") drive the query via URL
  // search params rather than local state, so switching between them doesn't
  // need an effect — it's derived directly from the URL on every render.
  const effectiveFilters = useMemo<TicketFilters>(() => {
    if (isOverdueView) {
      return { ...filters, overdue: "true", assignedTo: undefined };
    }
    if (isMineView && currentUserDisplayName) {
      return { ...filters, assignedTo: currentUserDisplayName, overdue: undefined };
    }
    return filters;
  }, [filters, isOverdueView, isMineView, currentUserDisplayName]);

  const { data: summary } = useSummary();
  const { data: options } = useMetaOptions();
  const { data: ticketsResponse, isLoading } = useTicketList(effectiveFilters);

  const tickets = ticketsResponse?.tickets ?? [];
  const total = ticketsResponse?.total ?? 0;

  const isAdmin = user?.role === "admin";
  const exportMutation = useExportTickets();
  const importMutation = useImportTickets();
  const templateMutation = useDownloadImportTemplate();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  async function handleExport() {
    setExportConfirmOpen(false);
    try {
      await exportMutation.mutateAsync(effectiveFilters);
    } catch {
      toast.error("Failed to export tickets");
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
        toast.success(`Imported ${result.created} ticket(s)`);
      } else if (result.created === 0) {
        toast.error(`Import failed for all ${result.failedCount} row(s). First error: ${result.errors[0]?.error}`);
      } else {
        toast.warning(
          `Imported ${result.created} ticket(s), ${result.failedCount} row(s) failed. First error (row ${result.errors[0]?.row}): ${result.errors[0]?.error}`
        );
      }
    } catch {
      toast.error("Failed to import file");
    }
  }

  function updateFilter<K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (value as number) : 1,
    }));
  }

  function updateSelectFilter(
    key: "status" | "callType" | "accountManager" | "assignedTo" | "assignedBy"
  ) {
    return (value: string) => updateFilter(key, value === ALL_FILTER_VALUE ? undefined : value);
  }

  const pageSize = filters.pageSize ?? 6;
  const page = filters.page ?? 1;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setExportConfirmOpen(true)}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? "Exporting..." : "Export"}
          </Button>
          {isAdmin && (
            <>
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
            </>
          )}
          <Button variant="default" onClick={() => navigate("/tickets/new")}>+ New Ticket</Button>
        </div>
      </div>

      <AlertDialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export tickets to Excel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will download an .xlsx file of every ticket matching your current filters
              (not just the current page).
            </AlertDialogDescription>
          </AlertDialogHeader>
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
            <AlertDialogTitle>Import tickets from "{pendingImportFile?.name}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new ticket for every valid row in the file. Rows that fail
              validation will be skipped and reported — this cannot be undone in bulk, so make
              sure this is the right file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
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

      <Card className="mb-2">
        <CardContent className="flex flex-wrap gap-3">
          <div className="min-w-40">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Search</label>
            <Input
              placeholder="Company or ticket no."
              value={filters.search ?? ""}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
          <div className="min-w-24">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
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
          <div className="min-w-24">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Call Type</label>
            <Select
              value={filters.callType ?? ALL_FILTER_VALUE}
              onValueChange={updateSelectFilter("callType")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
                {options?.callTypes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32">
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Account Manager
            </label>
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
          <div className="min-w-24">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Assigned To</label>
            <Select
              value={filters.assignedTo ?? ALL_FILTER_VALUE}
              onValueChange={updateSelectFilter("assignedTo")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
                {options?.assignedToOptions.map((emp) => (
                  <SelectItem key={emp.id} value={emp.displayName}>
                    {emp.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32">
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Assigned By
            </label>
            <Select
              value={filters.assignedBy ?? ALL_FILTER_VALUE}
              onValueChange={updateSelectFilter("assignedBy")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
                {options?.assignedBys.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">From</label>
            <DatePicker
              value={filters.dateFrom}
              onChange={(value) => updateFilter("dateFrom", value)}
              placeholder="Any date"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                setFilters(DEFAULT_TICKET_FILTERS);
                if (isOverdueView || isMineView) {
                  navigate("/", { replace: true });
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
              <TableHead>Date</TableHead>
              <TableHead>Ticket No</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead>Assigned By</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-slate-400">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-slate-400">
                  No tickets found.
                </TableCell>
              </TableRow>
            )}
            {tickets.map((t) => (
              <TableRow
                key={t.srNo}
                className="cursor-pointer"
                onClick={() => navigate(`/tickets/${t.srNo}`)}
              >
                <TableCell>{formatDate(t.ticketDate)}</TableCell>
                <TableCell>{t.ticketNo}</TableCell>
                <TableCell>{truncateChars(t.companyName, 13)}</TableCell>
                <TableCell className="max-w-56 truncate whitespace-normal">{truncateChars(t.problem, 15)}</TableCell>
                <TableCell>{t.assignedBy}</TableCell>
                <TableCell>{t.assignedTo}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <StatusBadge ticket={t} />
                    {t.slaBreached && (
                      <Badge variant="secondary" className="rounded-full bg-rose-100 text-rose-800">
                        SLA
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-slate-500">{formatDate(t.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {tickets.length} of {total} tickets
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
