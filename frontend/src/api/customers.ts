import { apiClient } from "./client";
import type { CustomerDetail, CustomerListResponse } from "@/types/customer";

export async function fetchCustomers(search?: string): Promise<CustomerListResponse> {
  const { data } = await apiClient.get<CustomerListResponse>("/customers", {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function fetchCustomer(id: number): Promise<CustomerDetail> {
  const { data } = await apiClient.get<CustomerDetail>(`/customers/${id}`);
  return data;
}
