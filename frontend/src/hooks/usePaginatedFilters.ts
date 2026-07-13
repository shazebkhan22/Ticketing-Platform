import { useState } from "react";

// Shared by every paginated list page (Activity Log, Inventory, Customers,
// Tickets) — they all follow the same shape: a filters object with `page`/
// `pageSize`, where changing any other filter resets back to page 1 but
// changing `page` itself doesn't.
export function usePaginatedFilters<T extends { page?: number; pageSize?: number }>(
  defaultFilters: T
) {
  const [filters, setFilters] = useState<T>(defaultFilters);

  function updateFilter<K extends keyof T>(key: K, value: T[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (value as number) : 1,
    }));
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? defaultFilters.pageSize ?? 10;

  return { filters, updateFilter, page, pageSize };
}

export function getTotalPages(total: number, pageSize: number): number {
  return Math.max(Math.ceil(total / pageSize), 1);
}
