import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreateAccountManager } from "@/hooks/useAccountManagers";
import { createAccountManagerSchema, type CreateAccountManagerValues } from "@/lib/schemas";
import type { AccountManagerDirectoryEntry } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const ADD_NEW_VALUE = "__add_new__";

// Shared by TicketFormPage and ProjectFormPage: a dropdown sourced from the
// account_managers directory, with an inline "+ Add new" option so picking
// an account manager doesn't require leaving the form (or the admin-only
// Employees tab) — see hooks/useAccountManagers.ts.
export function AccountManagerSelect({
  value,
  onChange,
  options,
}: {
  value: number | undefined;
  onChange: (id: number) => void;
  options: AccountManagerDirectoryEntry[];
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const createMutation = useCreateAccountManager();

  const form = useForm<CreateAccountManagerValues>({
    resolver: zodResolver(createAccountManagerSchema),
    defaultValues: { name: "", email: "" },
  });

  async function onSubmit(values: CreateAccountManagerValues) {
    try {
      const created = await createMutation.mutateAsync(values);
      toast.success("Account manager added");
      form.reset();
      setAddDialogOpen(false);
      onChange(created.id);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to add account manager";
      toast.error(typeof message === "string" ? message : "Failed to add account manager");
    }
  }

  return (
    <>
      <Select
        value={value ? String(value) : undefined}
        onValueChange={(v) => {
          if (v === ADD_NEW_VALUE) {
            setAddDialogOpen(true);
            return;
          }
          onChange(Number(v));
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an account manager" />
        </SelectTrigger>
        <SelectContent>
          {options.map((am) => (
            <SelectItem key={am.id} value={String(am.id)}>
              {am.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={ADD_NEW_VALUE}>+ Add new account manager</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account Manager</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@cygnussolutions.co.in" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Adding..." : "Add Account Manager"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
