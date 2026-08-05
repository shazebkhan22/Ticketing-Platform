import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { projectFormSchema, type ProjectFormValues } from "@/lib/schemas";
import {
  useCreateProject,
  useProjectDetail,
  useProjectMetaOptions,
  useUpdateProject,
} from "@/hooks/useProjects";
import type { CustomerDirectoryEntry } from "@/types/ticket";
import type { ProjectDetail, ProjectFormInput } from "@/types/project";
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

const EMPTY_FORM: ProjectFormValues = {
  startDate: todayLocalDate(),
  timeValue: 30,
  timeUnit: "Days",
  companyName: "",
  contactName: "",
  contactNo: "",
  emailId: "",
  designation: "",
  department: "",
  address: "",
  components: [],
  poNumber: "",
  contractNumber: "",
  problem: "",
  accountManagerId: 0,
  assignedBy: "",
  assigneeUserIds: [],
  priority: "P3",
};

function projectToFormValues(project: ProjectDetail["project"]): ProjectFormValues {
  return {
    startDate: project.startDate.slice(0, 10),
    timeValue: project.timeValue,
    timeUnit: project.timeUnit,
    companyName: project.companyName,
    contactName: project.contactName ?? "",
    contactNo: project.contactNo ?? "",
    emailId: project.emailId ?? "",
    designation: project.designation ?? "",
    department: project.department ?? "",
    address: project.address ?? "",
    components: project.components.map((c) => ({
      model: c.model,
      quantity: c.quantity,
      serialNumbers: c.serialNumbers ?? "",
    })),
    poNumber: project.poNumber ?? "",
    contractNumber: project.contractNumber ?? "",
    problem: project.problem,
    accountManagerId: project.accountManagerId ?? 0,
    assignedBy: project.assignedBy ?? "",
    assigneeUserIds: project.assignees.map((a) => a.id),
    priority: project.priority,
  };
}

export function ProjectFormPage() {
  const { srNo } = useParams<{ srNo: string }>();
  const isEdit = Boolean(srNo);
  const projectSrNo = Number(srNo);
  const navigate = useNavigate();

  const { data: options, isLoading: optionsLoading } = useProjectMetaOptions();
  const { data: projectDetail, isLoading: projectLoading } = useProjectDetail(projectSrNo);
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject(projectSrNo);

  const customerByName = useMemo(() => {
    const map = new Map<string, CustomerDirectoryEntry>();
    (options?.customers ?? []).forEach((c) => map.set(c.name, c));
    return map;
  }, [options?.customers]);

  const defaultValues = useMemo(
    () => (projectDetail ? projectToFormValues(projectDetail.project) : EMPTY_FORM),
    [projectDetail]
  );

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
  });

  const componentFields = useFieldArray({
    control: form.control,
    name: "components",
  });

  useEffect(() => {
    if (!projectDetail) return;
    form.reset(projectToFormValues(projectDetail.project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDetail]);

  async function onSubmit(values: ProjectFormValues) {
    try {
      if (isEdit) {
        await updateProjectMutation.mutateAsync(values as Partial<ProjectFormInput>);
        toast.success("Project updated");
        navigate(`/projects/${projectSrNo}`);
      } else {
        const created = await createProjectMutation.mutateAsync(values as ProjectFormInput);
        toast.success(`Project ${created.projectNo} created`);
        navigate(`/projects/${created.srNo}`);
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          err.response.data?.error || "This project was changed by someone else. Please refresh and try again."
        );
      } else {
        toast.error("Failed to save project. Check required fields.");
      }
    }
  }

  if (optionsLoading || !options || (isEdit && projectLoading)) {
    return (
      <div className="mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const submitting = createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <div className="">
      <h2 className="mb-2 text-xl font-bold text-neutral-800">
        {isEdit ? "Edit Project" : "New Project"}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-lg border border-neutral-200 bg-white p-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date<span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="timeValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time<span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit<span className="text-red-500">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue>{field.value}</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.projectTimeUnits.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Company Name<span className="text-red-500">*</span></FormLabel>
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
                      options={options.companyNames.map((c) => ({ value: c, label: c }))}
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
                  <FormLabel>Customer Name<span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input capitalize {...field} placeholder="Enter customer's full name" />
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
                  <FormLabel> Contact Number<span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter customer's contact number" />
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
                  <FormLabel>Email ID<span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter customer's email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input capitalize {...field} placeholder="Enter customer's job title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input capitalize {...field} placeholder="Enter customer's department" />
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
                  <FormLabel>Address<span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      capitalize
                      placeholder="Enter full address eg. street, city, state, zip code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-800">Project Components</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  componentFields.append({ model: "", quantity: 1, serialNumbers: "" })
                }
              >
                + Add Component
              </Button>
            </div>
            {componentFields.fields.length === 0 && (
              <p className="text-sm text-neutral-400">
                No components added yet — e.g. Server, Storage, Monitor.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {componentFields.fields.map((componentField, index) => (
                <div
                  key={componentField.id}
                  className="grid grid-cols-1 items-start gap-2 rounded-md border border-neutral-200 p-3 md:grid-cols-[2fr_1fr_2fr_auto]"
                >
                  <FormField
                    control={form.control}
                    name={`components.${index}.model`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model<span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input capitalize {...field} placeholder="e.g. HP Z8 Fury G5 Workstation" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`components.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qty<span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`components.${index}.serialNumbers`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number(s)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Comma-separated if multiple eg: 5CD6108XFV, 5CD6107CQM" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mt-6"
                    onClick={() => componentFields.remove(index)}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="poNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PO Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Purchase order number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contract number" />
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
                  <FormLabel>Scope of Work<span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the project scope" rows={3} capitalize {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountManagerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Manager<span className="text-red-500">*</span></FormLabel>
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

            <FormField
              control={form.control}
              name="assignedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned By<span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value}
                      onChange={field.onChange}
                      options={options.assignedBys.map((a) => ({ value: a, label: a }))}
                      placeholder="Person in the company who assigned this project"
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
              name="assigneeUserIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To<span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <MultiSelect
                      value={field.value.map(String)}
                      onChange={(vals) => field.onChange(vals.map(Number))}
                      options={options.assignedToOptions.map((emp) => ({
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority<span className="text-red-500">*</span></FormLabel>
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
          </div>

          <div className="mt-6 flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Project"}
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
