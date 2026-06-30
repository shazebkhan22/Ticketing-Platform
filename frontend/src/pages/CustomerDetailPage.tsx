import { Link, useParams } from "react-router-dom";
import { useCustomerDetail } from "@/hooks/useCustomers";
import { formatDate } from "@/lib/ticket-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_CLASSES } from "@/constants/ticket";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);
  const { data, isLoading } = useCustomerDetail(customerId);

  if (isLoading) {
    return (
      <div className=" space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-neutral-500">Customer not found.</p>;
  }

  const { customer, tickets } = data;

  return (
    <div className=" space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">{customer.name}</h2>
        <p className="text-sm text-neutral-500">
          {customer.contactName ?? "No contact name"}
          {customer.contactNo ? ` · ${customer.contactNo}` : ""}
          {customer.emailId ? ` · ${customer.emailId}` : ""}
        </p>
        {customer.address && <p className="text-sm text-neutral-500">{customer.address}</p>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Call Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-neutral-500">
                    No tickets logged for this customer yet.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => (
                  <TableRow key={t.srNo}>
                    <TableCell className="text-sm font-medium">
                      <Link to={`/tickets/${t.srNo}`} className="text-blue-800 hover:underline">
                        {t.ticketNo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">{formatDate(t.ticketDate)}</TableCell>
                    <TableCell className="text-sm">{t.callType}</TableCell>
                    <TableCell className="text-sm">{t.priority}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary" className={cn("rounded-full", STATUS_CLASSES[t.status])}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-neutral-500">{t.problem}</TableCell>
                    <TableCell className="text-sm">{t.assignedTo}</TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {t.deadlineDate ? formatDate(t.deadlineDate) : "—"}
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
