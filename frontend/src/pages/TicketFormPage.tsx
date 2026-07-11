import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ticketFormSchema, type TicketFormValues } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateTicket,
  useMetaOptions,
  useTicketDetail,
  useUpdateTicket,
} from "@/hooks/useTickets";
import type { CustomerDirectoryEntry, TicketDetail, TicketFormInput } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { todayLocalDate } from "@/lib/ticket-utils";

const EMPTY_FORM: TicketFormValues = {
  ticketDate: todayLocalDate(),
  mode: "Call",
  companyName: "",
  contactName: "",
  contactNo: "",
  emailId: "",
  address: "",
  model: "",
  serialNumber: "",
  problem: "",
  accountManager: "",
  assignedBy: "",
  callType: "Call",
  assigneeUserIds: [],
  priority: "P3",
  deadlineDate: "",
  internalTag: "External",
};

function ticketToFormValues(ticket: TicketDetail["ticket"]): TicketFormValues {
  return {
    ticketDate: ticket.ticketDate.slice(0, 10),
    mode: ticket.mode,
    companyName: ticket.companyName,
    contactName: ticket.contactName ?? "",
    contactNo: ticket.contactNo ?? "",
    emailId: ticket.emailId ?? "",
    address: ticket.address ?? "",
    model: ticket.model ?? "",
    serialNumber: ticket.serialNumber ?? "",
    problem: ticket.problem,
    accountManager: ticket.accountManager,
    assignedBy: ticket.assignedBy ?? "",
    callType: ticket.callType,
    assigneeUserIds: ticket.assignees.map((a) => a.id),
    priority: ticket.priority,
    deadlineDate: ticket.deadlineDate?.slice(0, 10) ?? "",
    internalTag: ticket.internalTag,
  };
}

export function TicketFormPage() {
  const { srNo } = useParams<{ srNo: string }>();
  const isEdit = Boolean(srNo);
  const ticketSrNo = Number(srNo);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: options, isLoading: optionsLoading } = useMetaOptions();
  const { data: ticketDetail, isLoading: ticketLoading } =
    useTicketDetail(ticketSrNo);
  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicket(ticketSrNo);

  // Keyed by company name so selecting an existing company in the Combobox
  // below can auto-fill its last-known contact details instead of the user
  // re-typing them on every repeat ticket for the same company.
  const customerByName = useMemo(() => {
    const map = new Map<string, CustomerDirectoryEntry>();
    (options?.customers ?? []).forEach((c) => map.set(c.name, c));
    return map;
  }, [options?.customers]);

  // Employees must always include themselves as an assignee (enforced again
  // on the backend) — a new ticket should default to that instead of an
  // empty picker, since it's always part of the final set either way.
  const emptyFormForUser = useMemo(
    () =>
      !isAdmin && user
        ? { ...EMPTY_FORM, assigneeUserIds: [user.id] }
        : EMPTY_FORM,
    [isAdmin, user]
  );

  // Computed once we actually render the form (the loading gate below
  // guarantees ticketDetail is already loaded by then), so Select fields
  // mount with their final value instead of mounting with EMPTY_FORM and
  // being updated afterwards — Radix's Select trigger does not reliably
  // reflect a controlled `value` change that happens after initial mount.
  const defaultValues = useMemo(
    () =>
      ticketDetail ? ticketToFormValues(ticketDetail.ticket) : emptyFormForUser,
    [ticketDetail, emptyFormForUser]
  );

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!ticketDetail) return;
    form.reset(ticketToFormValues(ticketDetail.ticket));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketDetail]);

  async function onSubmit(values: TicketFormValues) {
    try {
      if (isEdit) {
        await updateTicketMutation.mutateAsync(
          values as Partial<TicketFormInput>
        );
        toast.success("Ticket updated");
        navigate(`/tickets/${ticketSrNo}`);
      } else {
        const created = await createTicketMutation.mutateAsync(
          values as TicketFormInput
        );
        toast.success(`Ticket ${created.ticketNo} created`);
        navigate(`/tickets/${created.srNo}`);
      }
    } catch {
      toast.error("Failed to save ticket. Check required fields.");
    }
  }

  if (optionsLoading || !options || (isEdit && ticketLoading)) {
    return (
      <div className="mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const submitting =
    createTicketMutation.isPending || updateTicketMutation.isPending;

  return (
    <div className="">
      <h2 className="mb-2 text-xl font-bold text-neutral-800">
        {isEdit ? "Edit Ticket" : "New Ticket"}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-lg border border-neutral-200 bg-white p-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="ticketDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Received *</FormLabel>
                  <FormControl>
                    <DatePicker
                      disabled
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.modes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value}
                      onChange={(name) => {
                        field.onChange(name);
                        const customer = customerByName.get(name);
                        if (customer) {
                          form.setValue("contactName", customer.contactName ?? "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("contactNo", customer.contactNo ?? "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("emailId", customer.emailId ?? "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("address", customer.address ?? "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                      options={options.companyNames.map((c) => ({
                        value: c,
                        label: c,
                      }))}
                      placeholder="Select or type a company name"
                      searchPlaceholder="Search or type a name..."
                      allowCustomValue
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name *</FormLabel>
                  <FormControl>
                    <Input
                      capitalize
                      {...field}
                      placeholder="Enter your full name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact No *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter your contact number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email ID *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      capitalize
                      placeholder="Enter your full address eg. street, city, state, zip code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input
                      capitalize
                      {...field}
                      placeholder="Enter the model of product ( iPhone 13, Samsung )"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number(s)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Comma-separated if multiple"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="problem"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Problem *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the problem in detail"
                      rows={3}
                      capitalize
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountManager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Manager *</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value}
                      onChange={field.onChange}
                      options={options.accountManagers.map((a) => ({
                        value: a,
                        label: a,
                      }))}
                      placeholder="Person in the office who handles the account"
                      searchPlaceholder="Search or type a name..."
                      allowCustomValue
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned By *</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value}
                      onChange={field.onChange}
                      options={options.assignedBys.map((a) => ({
                        value: a,
                        label: a,
                      }))}
                      placeholder="Person in the company who assigned this ticket"
                      searchPlaceholder="Search or type a name..."
                      allowCustomValue
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="callType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.callTypes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigneeUserIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To *</FormLabel>
                  <FormControl>
                    <MultiSelect
                      value={field.value.map(String)}
                      onChange={(vals) => field.onChange(vals.map(Number))}
                      options={(isAdmin
                        ? options.assignedToOptions
                        : options.assignedToOptions.filter(
                            (emp) =>
                              emp.id === user?.id || emp.role === "employee"
                          )
                      ).map((emp) => ({
                        value: String(emp.id),
                        label: emp.displayName,
                      }))}
                      placeholder="Select employees"
                      searchPlaceholder="Search employees..."
                      emptyText="No employee found."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadlineDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      disabled={isEdit}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="No deadline"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.priorities.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internalTag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Tag</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.internalTags.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-6 flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEdit
                ? "Save Changes"
                : "Create Ticket"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
