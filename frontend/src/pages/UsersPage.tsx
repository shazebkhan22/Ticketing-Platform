import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useUsers, useCreateUser, useSetUserActive } from "@/hooks/useUsers";
import { useAccountManagers, useCreateAccountManager, useUpdateAccountManager } from "@/hooks/useAccountManagers";
import { useAuth } from "@/hooks/useAuth";
import type { AccountManager } from "@/types/user";
import {
  createUserSchema,
  type CreateUserValues,
  createAccountManagerSchema,
  type CreateAccountManagerValues,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PlusCircleIcon, PencilIcon } from "lucide-react";

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: accountManagers, isLoading: accountManagersLoading } = useAccountManagers();
  const createMutation = useCreateUser();
  const createAccountManagerMutation = useCreateAccountManager();
  const updateAccountManagerMutation = useUpdateAccountManager();
  const setActiveMutation = useSetUserActive();
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<"employee" | "accountManager">("employee");
  const [editingAccountManager, setEditingAccountManager] = useState<AccountManager | null>(null);

  async function handleToggleActive(id: number, isActive: boolean) {
    try {
      await setActiveMutation.mutateAsync({ id, isActive: !isActive });
      toast.success(!isActive ? "Employee reactivated" : "Employee deactivated");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to update employee status";
      toast.error(typeof message === "string" ? message : "Failed to update employee status");
    }
  }

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "employee",
      displayName: "",
      email: "",
    },
  });

  const accountManagerForm = useForm<CreateAccountManagerValues>({
    resolver: zodResolver(createAccountManagerSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const editAccountManagerForm = useForm<CreateAccountManagerValues>({
    resolver: zodResolver(createAccountManagerSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  async function onSubmit(values: CreateUserValues) {
    try {
      await createMutation.mutateAsync(values);
      toast.success("Employee added");
      form.reset();
      setOpen(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to add employee";
      toast.error(typeof message === "string" ? message : "Failed to add employee");
    }
  }

  async function onSubmitAccountManager(values: CreateAccountManagerValues) {
    try {
      await createAccountManagerMutation.mutateAsync(values);
      toast.success("Account manager added");
      accountManagerForm.reset();
      setOpen(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to add account manager";
      toast.error(typeof message === "string" ? message : "Failed to add account manager");
    }
  }

  function openEditAccountManager(am: AccountManager) {
    setEditingAccountManager(am);
    editAccountManagerForm.reset({ name: am.name, email: am.email });
  }

  async function onSubmitEditAccountManager(values: CreateAccountManagerValues) {
    if (!editingAccountManager) return;
    try {
      await updateAccountManagerMutation.mutateAsync({ id: editingAccountManager.id, input: values });
      toast.success("Account manager updated");
      setEditingAccountManager(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to update account manager";
      toast.error(typeof message === "string" ? message : "Failed to update account manager");
    }
  }

  return (
    <div className=" space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800">Employees</h2>
          <p className="text-sm text-neutral-500 max-w-xl">
            Manage engineer/admin accounts and account managers.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              form.reset();
              accountManagerForm.reset();
              setEntryType("employee");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusCircleIcon />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee/Account Manager</DialogTitle>
            </DialogHeader>

            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-500">Type</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={entryType === "employee" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setEntryType("employee")}
                >
                  Employee
                </Button>
                <Button
                  type="button"
                  variant={entryType === "accountManager" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setEntryType("accountManager")}
                >
                  Account Manager
                </Button>
              </div>
            </div>

            {entryType === "accountManager" ? (
              <Form {...accountManagerForm}>
                <form onSubmit={accountManagerForm.handleSubmit(onSubmitAccountManager)} className="space-y-4">
                  <FormField
                    control={accountManagerForm.control}
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
                    control={accountManagerForm.control}
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
                  <Button type="submit" disabled={createAccountManagerMutation.isPending} className="w-full">
                    {createAccountManagerMutation.isPending ? "Adding..." : "Add Account Manager"}
                  </Button>
                </form>
              </Form>
            ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" placeholder="Enter your username" {...field} />
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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Adding..." : "Add Employee"}
                </Button>
              </form>
            </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-3 text-sm font-bold text-cygnus-700">Employees</h3>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Username</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 text-neutral-800">{u.displayName}</td>
                  <td className="py-2 text-neutral-600">{u.username}</td>
                  <td className="py-2 text-neutral-600">{u.email || "—"}</td>
                  <td className="py-2 capitalize text-neutral-600">{u.role}</td>
                  <td className="py-2">
                    <Badge variant={u.isActive ? "secondary" : "destructive"}>
                      {u.isActive ? "Active" : "Deactivated"}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">
                    {u.id !== currentUser?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setActiveMutation.isPending}
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                      >
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-3 text-sm font-bold text-cygnus-700">Account Managers</h3>
        {accountManagersLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {accountManagers?.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-neutral-400">
                    No account managers yet.
                  </td>
                </tr>
              )}
              {accountManagers?.map((am) => (
                <tr key={am.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 text-neutral-800">{am.name}</td>
                  <td className="py-2 text-neutral-600">{am.email}</td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => openEditAccountManager(am)}>
                      <PencilIcon />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog
        open={editingAccountManager !== null}
        onOpenChange={(o) => {
          if (!o) setEditingAccountManager(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account Manager</DialogTitle>
          </DialogHeader>
          <Form {...editAccountManagerForm}>
            <form
              onSubmit={editAccountManagerForm.handleSubmit(onSubmitEditAccountManager)}
              className="space-y-4"
            >
              <FormField
                control={editAccountManagerForm.control}
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
                control={editAccountManagerForm.control}
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
              <Button type="submit" disabled={updateAccountManagerMutation.isPending} className="w-full">
                {updateAccountManagerMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
