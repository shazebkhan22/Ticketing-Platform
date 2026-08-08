import { Link } from "react-router-dom";
import { useRoutineChecksToday } from "@/hooks/useTickets";
import { formatDateTime } from "@/lib/ticket-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeletonRows, TableEmptyRow } from "@/components/TableListStates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function RoutineChecksStatusPage() {
  const { data, isLoading } = useRoutineChecksToday();
  const employees = data?.employees ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">Routine Checks</h2>
        <p className="text-sm text-neutral-500">
          Daily submission status for Team FMS's routine system-health checklist.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ticket No</TableHead>
                <TableHead>Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows colSpan={4} />
              ) : employees.length === 0 ? (
                <TableEmptyRow colSpan={4} message="No Team FMS employees to display." />
              ) : (
                employees.map((e) => (
                  <TableRow key={e.userId}>
                    <TableCell className="text-sm font-medium">{e.displayName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          e.taken ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }
                      >
                        {e.taken ? "Submitted" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.ticketSrNo && e.ticketNo ? (
                        <Link
                          to={`/tickets/${e.ticketSrNo}`}
                          className="text-blue-800 hover:underline"
                        >
                          {e.ticketNo}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {e.submittedAt ? formatDateTime(e.submittedAt) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
