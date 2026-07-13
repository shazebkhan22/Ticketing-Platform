import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// The loading-skeleton-rows / empty-state-row pair every paginated table
// page (Activity Log, Inventory, Customers) repeats identically around its
// own data rows: `{isLoading ? <TableSkeletonRows .../> : items.length === 0
// ? <TableEmptyRow .../> : items.map(...)}`.
export function TableSkeletonRows({ colSpan, rows = 6 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan} className="py-3">
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function TableEmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-3 text-center text-sm text-neutral-500">
        {message}
      </TableCell>
    </TableRow>
  );
}
