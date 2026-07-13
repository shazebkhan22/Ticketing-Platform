import { Link } from "react-router-dom";
import { useCustomerList } from "@/hooks/useCustomers";
import { usePaginatedFilters, getTotalPages } from "@/hooks/usePaginatedFilters";
import { DEFAULT_FILTERS } from "@/constants/customers";
import { formatDate } from "@/lib/ticket-utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function CustomersPage() {
  const { filters, updateFilter, page, pageSize } = usePaginatedFilters(DEFAULT_FILTERS);
  const { data, isLoading } = useCustomerList(filters);
  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const totalPages = getTotalPages(total, pageSize);

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
                <TableSkeletonRows colSpan={6} />
              ) : customers.length === 0 ? (
                <TableEmptyRow colSpan={6} message="No customers found." />
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

      <PaginationFooter
        currentCount={customers.length}
        total={total}
        itemLabel="customers"
        page={page}
        totalPages={totalPages}
        onPrev={() => updateFilter("page", Math.max(page - 1, 1))}
        onNext={() => updateFilter("page", Math.min(page + 1, totalPages))}
      />
    </div>
  );
}
