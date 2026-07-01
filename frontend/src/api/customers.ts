import { apiClient } from "./client";
import type { CustomerDetail, CustomerFilters, CustomerListResponse } from "@/types/customer";

export async function fetchCustomers(filters: CustomerFilters): Promise<CustomerListResponse> {
  const { data } = await apiClient.get<CustomerListResponse>("/customers", {
    params: filters,
  });
  return data;
}

export async function fetchCustomer(id: number): Promise<CustomerDetail> {
  const { data } = await apiClient.get<CustomerDetail>(`/customers/${id}`);
  return data;
}
