import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchInventory, updateInventory } from "@/api/inventory";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
