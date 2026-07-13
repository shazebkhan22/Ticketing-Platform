import { useState } from "react";
import { Link } from "react-router-dom";
import { useActivity } from "@/hooks/useActivity";
import { formatDateTime } from "@/lib/ticket-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityFilters } from "@/types/activity";

const PAGE_SIZE = 10;

export function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const filters: ActivityFilters = { page, pageSize: PAGE_SIZE };
  const { data, isLoading } = useActivity(filters);

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

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
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-neutral-500">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
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

      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          Page {page} of {totalPages} ({total} entries)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
