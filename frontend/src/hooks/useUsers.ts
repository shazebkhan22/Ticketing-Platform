import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, createUser } from "@/api/users";
import type { CreateUserInput } from "@/types/user";

const usersKey = ["users"] as const;

export function useUsers() {
  return useQuery({ queryKey: usersKey, queryFn: fetchUsers });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKey });
    },
  });
}
