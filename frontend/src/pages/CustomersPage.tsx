import { useState } from "react";
import { Link } from "react-router-dom";
import { useCustomerList } from "@/hooks/useCustomers";
import type { CustomerFilters } from "@/types/customer";
import { DEFAULT_FILTERS } from "@/constants/customers";
import { formatDate } from "@/lib/ticket-utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS);
  const { data, isLoading } = useCustomerList(filters);
  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const pageSize = filters.pageSize ?? 7;
  const page = filters.page ?? 1;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function updateFilter<K extends keyof CustomerFilters>(key: K, value: CustomerFilters[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (value as number) : 1,
    }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">Customers</h2>
        <p className="text-sm text-neutral-500">
        Centralize customer information, contacts, and support activity in one dashboard.
        </p>
      </div>

      <Input
        placeholder="Search by company name"
        value={filters.search ?? ""}
        onChange={(e) => updateFilter("search", e.target.value || undefined)}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact Name</TableHead>
                <TableHead>Contact No.</TableHead>
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
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">{c.contactNo ? `${c.contactNo}` : ""}</TableCell>

                    <TableCell className="text-sm text-neutral-500">{c.ticketCount}</TableCell>
                    <TableCell className="text-sm">
                      {c.openTicketCount > 0 ? (
                        <Badge variant="secondary" className="rounded-full bg-amber-100 text-amber-800">
                          {c.openTicketCount} open
                        </Badge>
                      ) : (
                        <span className="text-neutral-500">None</span>
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

      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          Showing {customers.length} of {total} customers
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
