import type { Employee, TicketPriority, TicketStatus } from "@/types/ticket";

export type ProjectTimeUnit = "Days" | "Weeks" | "Months";

// One line item per product type delivered on the project (Server, Storage,
// Monitor, ...), each with its own quantity and serial numbers — replaces
// the single free-text model/serial-number fields tickets use.
export interface ProjectComponent {
  model: string;
  quantity: number;
  serialNumbers?: string;
}

export interface Project {
  srNo: number;
  projectNo: string;
  startDate: string;
  timeValue: number;
  timeUnit: ProjectTimeUnit;
  deadlineDate: string;
  customerId: number | null;
  companyName: string;
  contactName: string | null;
  contactNo: string | null;
  emailId: string | null;
  designation: string | null;
  department: string | null;
  address: string | null;
  components: ProjectComponent[];
  poNumber: string | null;
  contractNumber: string | null;
  problem: string;
  ownerUserId: number;
  accountManager: string;
  assignedBy: string | null;
  assignees: Employee[];
  priority: TicketPriority;
  status: TicketStatus;
  customerFeedbackRating: number | null;
  customerFeedbackComment: string | null;
  customerFeedbackSubmittedAt: string | null;
  adminFeedbackResponse: string | null;
  adminFeedbackRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  lastRemark?: string;
  rowVersion: number;
}

export interface ProjectRemark {
  id: number;
  remarkDate: string;
  body: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ProjectDetail {
  project: Project;
  remarks: ProjectRemark[];
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectFilters {
  status?: string;
  assigneeUserId?: number;
  assignedBy?: string;
  accountManager?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  overdue?: string;
  page?: number;
  pageSize?: number;
}

export interface ProjectFormInput {
  startDate: string;
  timeValue: number;
  timeUnit: ProjectTimeUnit;
  companyName: string;
  contactName?: string;
  contactNo?: string;
  emailId?: string;
  designation?: string;
  department?: string;
  address?: string;
  components?: ProjectComponent[];
  poNumber?: string;
  contractNumber?: string;
  problem: string;
  accountManager: string;
  assignedBy: string;
  assigneeUserIds: number[];
  priority?: TicketPriority;
}
