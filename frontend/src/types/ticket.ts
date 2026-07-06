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
  | "Non-Chargeable";
export type TicketStatus = "Pending" | "In Progress" | "Closed";
export type InternalTag = "Internal" | "External";
export type TicketPriority = "P1" | "P2" | "P3" | "P4";

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
  assignedBy: string | null;
  callType: CallType;
  assignees: Employee[];
  priority: TicketPriority;
  deadlineDate: string | null;
  status: TicketStatus;
  feedback: string | null;
  internalTag: InternalTag;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  lastRemark?: string;
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

export interface Analytics {
  monthly: AnalyticsMonthlyPoint[];
  byCallType: AnalyticsCallTypeCount[];
  byEmployee: AnalyticsEmployeeStatus[];
}

export interface Employee {
  id: number;
  displayName: string;
  role?: "admin" | "employee";
}

export interface MetaOptions {
  modes: TicketMode[];
  callTypes: CallType[];
  statuses: TicketStatus[];
  internalTags: InternalTag[];
  priorities: TicketPriority[];
  accountManagers: string[];
  assignedBys: string[];
  assignedToOptions: Employee[];
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
  accountManager: string;
  assignedBy: string;
  callType: CallType;
  assigneeUserIds: number[];
  priority?: TicketPriority;
  deadlineDate?: string;
  internalTag?: InternalTag;
}
