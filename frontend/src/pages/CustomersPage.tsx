import { useState } from "react";
import { Link } from "react-router-dom";
import { useCustomerList } from "@/hooks/useCustomers";
import { formatDate } from "@/lib/ticket-utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCustomerList(search);
  const customers = data?.customers ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">Customers</h2>
        <p className="text-sm text-neutral-500">
          Every company tickets have been logged for, with their full service history.
        </p>
      </div>

      <Input
        placeholder="Search by company name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Total Tickets</TableHead>
                <TableHead>Open Tickets</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-neutral-500">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">
                      <Link to={`/customers/${c.id}`} className="text-blue-800 hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {c.contactName ?? "—"}
                      {c.contactNo ? ` · ${c.contactNo}` : ""}
                    </TableCell>
                    <TableCell className="text-sm">{c.ticketCount}</TableCell>
                    <TableCell className="text-sm">
                      {c.openTicketCount > 0 ? (
                        <Badge variant="secondary" className="rounded-full bg-amber-100 text-amber-800">
                          {c.openTicketCount} open
                        </Badge>
                      ) : (
                        <span className="text-neutral-400">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {c.lastTicketDate ? formatDate(c.lastTicketDate) : "—"}
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
