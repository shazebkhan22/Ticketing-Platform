export type RepairLocation = "In-House" | "Outsourced";
export type DateTypes = "Inward Date" | "Outward Date" | "Expected Return Date";

// The inward/outward repair-workflow fields, shared by every shape below —
// defined once so adding/renaming a field (e.g. deliveryPerson) only ever
// touches this one place instead of four copy-pasted interfaces.
interface InventoryRepairFields {
  inwardDate: string | null;
  outwardDate: string | null;
  repairLocation: RepairLocation;
  outsourceVendor: string | null;
  expectedReturnDate: string | null;
  deliveryPerson: string | null;
}

export interface InventoryItem extends InventoryRepairFields {
  srNo: number;
  ticketNo: string;
  companyName: string;
  model: string | null;
  serialNumber: string | null;
  quantity: number;
  derivedStatus: "Pending Inward" | "In-House" | "Outsourced" | "Returned to Customer";
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InventoryFilters {
  search?: string;
  repairLocation?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// Same fields as InventoryRepairFields, but as an update payload: every
// field optional, and the nullable strings become plain optional strings
// (an absent key means "leave unset" rather than "explicitly clear").
export type InventoryUpdateInput = Partial<{
  [K in keyof InventoryRepairFields]: Exclude<InventoryRepairFields[K], null>;
}>;

export interface InventoryUpdateResponse extends InventoryRepairFields {
  srNo: number;
}

// The local edit-dialog form state: same fields again, but every value is a
// plain (non-nullable) string/enum since a controlled <Input>/<Select> always
// has a value — "" stands in for "not set" instead of null.
export type EditFormState = {
  [K in keyof InventoryRepairFields]: InventoryRepairFields[K] extends RepairLocation
    ? RepairLocation
    : string;
};
