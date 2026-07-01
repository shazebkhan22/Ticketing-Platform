import { useQuery } from "@tanstack/react-query";
import { fetchCustomer, fetchCustomers } from "@/api/customers";
import type { CustomerFilters } from "@/types/customer";

export function useCustomerList(filters: CustomerFilters) {
  return useQuery({
    queryKey: ["customers", "list", filters],
    queryFn: () => fetchCustomers(filters),
  });
}

export function useCustomerDetail(id: number) {
  return useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => fetchCustomer(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
