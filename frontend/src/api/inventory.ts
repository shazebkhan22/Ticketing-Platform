import { apiClient } from "./client";
import type {
  InventoryFilters,
  InventoryListResponse,
  InventoryUpdateInput,
  InventoryUpdateResponse,
} from "@/types/inventory";

export async function fetchInventory(filters: InventoryFilters): Promise<InventoryListResponse> {
  const { data } = await apiClient.get<InventoryListResponse>("/inventory", {
    params: filters,
  });
  return data;
}

export async function updateInventory(
  srNo: number,
  input: InventoryUpdateInput
): Promise<InventoryUpdateResponse> {
  const { data } = await apiClient.put<InventoryUpdateResponse>(`/inventory/${srNo}`, input);
  return data;
}
