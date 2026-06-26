import { useQuery } from "@tanstack/react-query";
import { fetchCustomer, fetchCustomers } from "@/api/customers";

export function useCustomerList(search?: string) {
  return useQuery({
    queryKey: ["customers", "list", search ?? ""],
    queryFn: () => fetchCustomers(search),
  });
}

export function useCustomerDetail(id: number) {
  return useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => fetchCustomer(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
