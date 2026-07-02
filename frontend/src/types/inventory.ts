export type RepairLocation = "In-House" | "Outsourced";
export type DateTypes = "Inward Date" | "Outward Date" | "Expected Return Date";

export interface InventoryItem {
  srNo: number;
  ticketNo: string;
  companyName: string;
  model: string | null;
  serialNumber: string | null;
  quantity: number;
  inwardDate: string | null;
  outwardDate: string | null;
  repairLocation: RepairLocation;
  outsourceVendor: string | null;
  expectedReturnDate: string | null;
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

export interface InventoryUpdateInput {
  inwardDate?: string;
  outwardDate?: string;
  repairLocation?: RepairLocation;
  outsourceVendor?: string;
  expectedReturnDate?: string;
}

export interface InventoryUpdateResponse {
  srNo: number;
  inwardDate: string | null;
  outwardDate: string | null;
  repairLocation: RepairLocation;
  outsourceVendor: string | null;
  expectedReturnDate: string | null;
}

export interface EditFormState {
  inwardDate: string;
  outwardDate: string;
  repairLocation: RepairLocation;
  outsourceVendor: string;
  expectedReturnDate: string;
}