import { Link } from "react-router-dom";
import { useActivity } from "@/hooks/useActivity";
import { usePaginatedFilters, getTotalPages } from "@/hooks/usePaginatedFilters";
import { formatDateTime } from "@/lib/ticket-utils";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationFooter } from "@/components/PaginationFooter";
import { TableSkeletonRows, TableEmptyRow } from "@/components/TableListStates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityFilters } from "@/types/activity";

const DEFAULT_FILTERS: ActivityFilters = { page: 1, pageSize: 10 };

export function ActivityLogPage() {
  const { filters, updateFilter, page, pageSize } = usePaginatedFilters(DEFAULT_FILTERS);
  const { data, isLoading } = useActivity(filters);

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = getTotalPages(total, pageSize);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">Activity Log</h2>
        <p className="text-sm text-neutral-500">
        A complete timeline of all actions performed within the system.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows colSpan={5} rows={8} />
              ) : entries.length === 0 ? (
                <TableEmptyRow colSpan={5} message="No activity recorded yet." />
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm text-neutral-500">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{entry.actorName}</TableCell>
                    <TableCell className="text-sm">{entry.action}</TableCell>
                    <TableCell className="text-sm">
                      {entry.ticketSrNo ? (
                        <Link
                          to={`/tickets/${entry.ticketSrNo}`}
                          className="text-blue-800 hover:underline font-medium"
                        >
                          {entry.ticketNo}
                        </Link>
                      ) : (
                        entry.ticketNo ?? "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm text-neutral-500">
                      {entry.details ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationFooter
        currentCount={entries.length}
        total={total}
        itemLabel="entries"
        page={page}
        totalPages={totalPages}
        onPrev={() => updateFilter("page", Math.max(page - 1, 1))}
        onNext={() => updateFilter("page", Math.min(page + 1, totalPages))}
      />
    </div>
  );
}
