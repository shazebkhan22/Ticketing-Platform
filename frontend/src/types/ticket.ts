import type { ProjectTimeUnit } from "@/types/project";
import type { UserTeam } from "@/types/user";
import type { InventoryRepairFields } from "@/types/inventory";

export type TicketMode = "Whatsapp" | "Call" | "Mail" | "Verbally";
export type CallType =
  | "Warranty"
  | "AMC"
  | "OEM"
  | "Office"
  | "Installation"
  | "POC"
  | "Project"
  | "Call"
  | "Chargeable"
  | "Non-Chargeable"
  | "Routine Checks";
export type TicketStatus = "Pending" | "In Progress" | "Closed";
export type InternalTag = "Internal" | "External";
export type TicketPriority = "P1" | "P2" | "P3" | "P4";

// Fixed checklist for the Routine Checks call type — mirrors
// backend/src/types/ticket.ts ROUTINE_CHECK_TASKS/ROUTINE_CHECK_STATUSES.
export type RoutineCheckStatus = "Completed" | "N/A";
export type RoutineCheckSection = "Routine Checks" | "System Updates & Patch Management";

export interface RoutineCheckItem {
  section: RoutineCheckSection;
  task: string;
  detail?: string;
  status: RoutineCheckStatus;
  note?: string;
}

export interface Ticket {
  srNo: number;
  ticketNo: string;
  ticketDate: string;
  mode: TicketMode;
  customerId: number | null;
  companyName: string;
  contactName: string | null;
  contactNo: string | null;
  emailId: string | null;
  address: string | null;
  model: string | null;
  serialNumber: string | null;
  problem: string;
  ownerUserId: number;
  accountManager: string;
  accountManagerId: number | null;
  assignedBy: string | null;
  callType: CallType;
  assignees: Employee[];
  priority: TicketPriority;
  deadlineDate: string | null;
  status: TicketStatus;
  customerFeedbackRating: number | null;
  customerFeedbackComment: string | null;
  customerFeedbackSubmittedAt: string | null;
  adminFeedbackResponse: string | null;
  adminFeedbackRespondedAt: string | null;
  adminFeedbackRespondedBy: string | null;
  internalTag: InternalTag;
  routineChecks: RoutineCheckItem[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  lastRemark?: string;
  rowVersion: number;
  inInventory: boolean;
  inventoryPending: boolean;
  inventory: InventoryRepairFields | null;
}

export interface Remark {
  id: number;
  remarkDate: string;
  body: string;
  createdBy: string | null;
  createdAt: string;
}

export interface TicketDetail {
  ticket: Ticket;
  remarks: Remark[];
}

export interface Summary {
  total: number;
  pending: number;
  closed: number;
  inProgress: number;
  overdue: number;
}

export interface AnalyticsMonthlyPoint {
  month: string;
  created: number;
  closed: number;
}

export interface AnalyticsCallTypeCount {
  callType: string;
  count: number;
}

export interface AnalyticsEmployeeStatus {
  employee: string;
  pending: number;
  inProgress: number;
  closed: number;
}

export interface AnalyticsPriorityCount {
  priority: TicketPriority;
  count: number;
}

export interface AnalyticsStatusCount {
  status: TicketStatus;
  count: number;
}

export interface AnalyticsModeCount {
  mode: TicketMode;
  count: number;
}

export interface AnalyticsInternalTagCount {
  internalTag: InternalTag;
  count: number;
}

export interface Analytics {
  monthly: AnalyticsMonthlyPoint[];
  byCallType: AnalyticsCallTypeCount[];
  byEmployee: AnalyticsEmployeeStatus[];
  byPriority: AnalyticsPriorityCount[];
  byStatus: AnalyticsStatusCount[];
  byMode: AnalyticsModeCount[];
  byInternalTag: AnalyticsInternalTagCount[];
}

export interface Employee {
  id: number;
  displayName: string;
  role?: "admin" | "employee";
  team?: UserTeam | null;
}

export interface CustomerDirectoryEntry {
  name: string;
  contactName: string | null;
  contactNo: string | null;
  emailId: string | null;
  address: string | null;
}

export interface AccountManagerDirectoryEntry {
  id: number;
  name: string;
  email: string;
}

export interface MetaOptions {
  modes: TicketMode[];
  callTypes: CallType[];
  statuses: TicketStatus[];
  internalTags: InternalTag[];
  priorities: TicketPriority[];
  projectTimeUnits: ProjectTimeUnit[];
  accountManagers: string[];
  assignedBys: string[];
  companyNames: string[];
  customers: CustomerDirectoryEntry[];
  assignedToOptions: Employee[];
  accountManagerDirectory: AccountManagerDirectoryEntry[];
  teams: UserTeam[];
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TicketFilters {
  status?: string;
  callType?: string;
  assigneeUserId?: number;
  assignedBy?: string;
  accountManager?: string;
  priority?: string;
  team?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  overdue?: string;
  page?: number;
  pageSize?: number;
}

export interface ImportRowError {
  row: number;
  success: false;
  error: string;
}

export interface ImportResult {
  created: number;
  failedCount: number;
  errors: ImportRowError[];
}

export interface TicketFormInput {
  ticketDate: string;
  mode: TicketMode;
  companyName: string;
  contactName?: string;
  contactNo?: string;
  emailId?: string;
  address?: string;
  model?: string;
  serialNumber?: string;
  problem: string;
  accountManagerId?: number;
  assignedBy?: string;
  callType: CallType;
  assigneeUserIds?: number[];
  priority?: TicketPriority;
  deadlineDate?: string;
  internalTag?: InternalTag;
  routineChecks?: RoutineCheckItem[];
}
