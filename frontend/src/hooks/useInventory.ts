import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToInventory, fetchInventory, updateInventory } from "@/api/inventory";
import { ticketKeys } from "@/hooks/useTickets";
import type { InventoryFilters, InventoryUpdateInput } from "@/types/inventory";

export const inventoryKeys = {
  all: ["inventory"] as const,
  list: (filters: InventoryFilters) => [...inventoryKeys.all, "list", filters] as const,
};

export function useInventoryList(filters: InventoryFilters) {
  return useQuery({
    queryKey: inventoryKeys.list(filters),
    queryFn: () => fetchInventory(filters),
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ srNo, input }: { srNo: number; input: InventoryUpdateInput }) =>
      updateInventory(srNo, input),
    onSuccess: (_data, { srNo }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(srNo) });
    },
  });
}

export function useAddToInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (srNo: number) => addToInventory(srNo),
    onSuccess: (_data, srNo) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(srNo) });
    },
  });
}
