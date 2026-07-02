import type { InventoryItem, InventoryFilters, DateTypes } from "@/types/inventory";

export const ALL_FILTER_VALUE = "__all__";

export const STATUS_CLASSES: Record<InventoryItem["derivedStatus"], string> = {
  "Pending Inward": "bg-amber-100 text-amber-800",
  "In-House": "bg-blue-100 text-blue-800",
  Outsourced: "bg-purple-100 text-purple-800",
  "Returned to Customer": "bg-emerald-100 text-emerald-800",
};
export const DEFAULT_FILTERS: InventoryFilters = { page: 1, pageSize: 7 };

export const DATE_TOOLTIPS: Record<DateTypes, string> = {
  "Inward Date": "Set this when the product physically arrives for repair.",
  "Outward Date": "Set this when the product is dispatched back after repair.",
  "Expected Return Date": "Set this to the date the outsourced vendor is expected to return the product.",
};
