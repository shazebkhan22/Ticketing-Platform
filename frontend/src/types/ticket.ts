export type TicketMode = "Whatsapp" | "Call" | "Mail" | "Verbally";
export type CallType =
  | "Warranty"
  | "AMC"
  | "OEM"
  | "Office"
  | "Installation"
  | "Project"
  | "Call"
  | "Chargeable"
  | "Non-Chargeable";
export type TicketStatus = "Pending" | "In Progress" | "Closed";
export type InternalTag = "Internal" | "External";

export interface Ticket {
  srNo: number;
  ticketNo: string;
  ticketDate: string;
  mode: TicketMode;
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
  assignedToUserId: number;
  assignedTo: string;
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

export interface Employee {
  id: number;
  displayName: string;
}

export interface MetaOptions {
  modes: TicketMode[];
  callTypes: CallType[];
  statuses: TicketStatus[];
  internalTags: InternalTag[];
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
  assignedTo?: string;
  assignedBy?: string;
  accountManager?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  overdue?: string;
  page?: number;
  pageSize?: number;
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
  assignedToUserId: number;
  deadlineDate?: string;
  internalTag?: InternalTag;
}
