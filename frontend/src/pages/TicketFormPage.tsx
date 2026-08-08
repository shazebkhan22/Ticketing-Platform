import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
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
import { AccountManagerSelect } from "@/components/AccountManagerSelect";
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
import { ROUTINE_CHECK_TASKS } from "@/constants/ticket";
import type { RoutineCheckItem, RoutineCheckStatus } from "@/types/ticket";

const EMPTY_ROUTINE_CHECKS: RoutineCheckItem[] = ROUTINE_CHECK_TASKS.map((t) => ({
  section: t.section,
  task: t.task,
  detail: t.detail,
  status: "N/A" as RoutineCheckStatus,
  note: "",
}));

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
  accountManagerId: undefined,
  assignedBy: "",
  callType: "Call",
  assigneeUserIds: [],
  priority: "P3",
  deadlineDate: "",
  internalTag: "External",
  routineChecks: EMPTY_ROUTINE_CHECKS,
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
    accountManagerId: ticket.accountManagerId ?? undefined,
    assignedBy: ticket.assignedBy ?? "",
    callType: ticket.callType,
    assigneeUserIds: ticket.assignees.map((a) => a.id),
    priority: ticket.priority,
    deadlineDate: ticket.deadlineDate?.slice(0, 10) ?? "",
    internalTag: ticket.internalTag,
    routineChecks: ticket.routineChecks.length > 0 ? ticket.routineChecks : EMPTY_ROUTINE_CHECKS,
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
  const { data: ticketDetail, isLoading: ticketLoading } = useTicketDetail(ticketSrNo);
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
    () => (!isAdmin && user ? { ...EMPTY_FORM, assigneeUserIds: [user.id] } : EMPTY_FORM),
    [isAdmin, user]
  );

  // Computed once we actually render the form (the loading gate below
  // guarantees ticketDetail is already loaded by then), so Select fields
  // mount with their final value instead of mounting with EMPTY_FORM and
  // being updated afterwards — Radix's Select trigger does not reliably
  // reflect a controlled `value` change that happens after initial mount.
  const defaultValues = useMemo(
    () => (ticketDetail ? ticketToFormValues(ticketDetail.ticket) : emptyFormForUser),
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

  // Routine Checks (the FMS daily system-admin checklist report) is only
  // pickable by Team FMS and admins — mirrors requireFieldTeamOrAdmin-style
  // gating on the backend (see createTicket's isRoutineChecks branch). A
  // non-FMS engineer who ends up assigned to an existing Routine Checks
  // ticket (e.g. reassigned by an admin) still needs to see its current
  // call type in the dropdown, or the Select renders with a value that
  // isn't in its own option list — so the ticket's existing callType is
  // always kept in the list even when the viewer couldn't newly pick it.
  const isFmsOrAdmin = isAdmin || user?.team === "FMS";
  const existingCallType = ticketDetail?.ticket.callType;
  const callTypeOptions =
    isFmsOrAdmin || existingCallType === "Routine Checks"
      ? (options?.callTypes ?? [])
      : (options?.callTypes ?? []).filter((c) => c !== "Routine Checks");
  const callType = form.watch("callType");
  const isRoutineChecks = callType === "Routine Checks";
  const routineChecks = form.watch("routineChecks") ?? [];

  function updateRoutineCheck(
    index: number,
    patch: Partial<{ status: RoutineCheckStatus; note: string }>
  ) {
    const next = [...routineChecks];
    next[index] = { ...next[index], ...patch };
    form.setValue("routineChecks", next as TicketFormValues["routineChecks"], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function onSubmit(values: TicketFormValues) {
    try {
      if (isEdit) {
        await updateTicketMutation.mutateAsync(values as Partial<TicketFormInput>);
        toast.success("Ticket updated");
        navigate(`/tickets/${ticketSrNo}`);
      } else {
        const created = await createTicketMutation.mutateAsync(values as TicketFormInput);
        toast.success(`Ticket ${created.ticketNo} created`);
        navigate(`/tickets/${created.srNo}`);
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          err.response.data?.error ||
            "This ticket was changed by someone else. Please refresh and try again."
        );
      } else {
        toast.error("Failed to save ticket. Check required fields.");
      }
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

  const submitting = createTicketMutation.isPending || updateTicketMutation.isPending;

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
                    <DatePicker disabled value={field.value} onChange={field.onChange} />
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
                    <Input capitalize {...field} placeholder="Enter your full name" />
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
                    <Input type="email" placeholder="Enter your email address" {...field} />
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
                      placeholder="Comma-separated if multiple eg: 5CD6108XFV, 5CD6107CQM, 5CD6107WJB"
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
                      {callTypeOptions.map((c) => (
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

            {!isRoutineChecks && (
              <FormField
                control={form.control}
                name="accountManagerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Manager *</FormLabel>
                    <FormControl>
                      <AccountManagerSelect
                        value={field.value || undefined}
                        onChange={field.onChange}
                        options={options.accountManagerDirectory}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isRoutineChecks && (
              <FormField
                control={form.control}
                name="assignedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned By *</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value ?? ""}
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
            )}

            {!isRoutineChecks && (
              <FormField
                control={form.control}
                name="assigneeUserIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To *</FormLabel>
                    <FormControl>
                      <MultiSelect
                        value={(field.value ?? []).map(String)}
                        onChange={(vals) => field.onChange(vals.map(Number))}
                        options={(isAdmin
                          ? options.assignedToOptions
                          : options.assignedToOptions.filter(
                              (emp) => emp.id === user?.id || emp.role === "employee"
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
            )}

            {!isRoutineChecks && (
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
            )}

            {!isRoutineChecks && (
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
            )}

            {!isRoutineChecks && (
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
            )}
          </div>

          {isRoutineChecks && (
            <div className="mt-6 space-y-6">
              {(["Routine Checks", "System Updates & Patch Management"] as const).map((section) => (
                <div key={section}>
                  <h3 className="mb-2 text-sm font-medium">{section}</h3>
                  <div className="overflow-x-auto rounded-md border border-neutral-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                          <th className="px-3 py-2 font-medium w-80">Task</th>
                          <th className="px-3 py-2 font-medium w-60">Status</th>
                          <th className="px-3 py-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {routineChecks
                          .map((item, index) => ({ item, index }))
                          .filter(({ item }) => item.section === section)
                          .map(({ item, index }) => (
                            <tr
                              key={`${item.section}-${item.task}`}
                              className="border-b border-neutral-100 last:border-0"
                            >
                              <td className="px-3 py-2 text-neutral-800">
                                {item.task}
                                {item.detail && (
                                  <span className="ml-1 text-xs text-neutral-500">
                                    ({item.detail})
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <Select
                                  value={item.status}
                                  onValueChange={(status) =>
                                    updateRoutineCheck(index, {
                                      status: status as RoutineCheckStatus,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue>{item.status}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="N/A">N/A</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  value={item.note ?? ""}
                                  onChange={(e) =>
                                    updateRoutineCheck(index, { note: e.target.value })
                                  }
                                  placeholder="Notes"
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {form.formState.errors.routineChecks && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.routineChecks.message}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Ticket"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
