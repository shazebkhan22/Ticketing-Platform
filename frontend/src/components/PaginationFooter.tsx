import { Button } from "@/components/ui/button";

// Identical "Showing X of Y {label} — Prev/Next" footer used by every
// paginated list page (Activity Log, Inventory, Customers).
export function PaginationFooter({
  currentCount,
  total,
  itemLabel,
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  currentCount: number;
  total: number;
  itemLabel: string;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-neutral-500">
      <span>
        Showing {currentCount} of {total} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
          Prev
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
