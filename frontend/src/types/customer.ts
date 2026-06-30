export interface Customer {
  id: number;
  name: string;
  contactName: string | null;
  contactNo: string | null;
  emailId: string | null;
  address: string | null;
  createdAt: string;
  ticketCount: number;
  openTicketCount: number;
  lastTicketDate: string | null;
}

export interface CustomerListResponse {
  customers: Customer[];
}

export interface CustomerTicketSummary {
  srNo: number;
  ticketNo: string;
  ticketDate: string;
  callType: string;
  status: string;
  priority: string;
  problem: string;
  assignedTo: string;
  deadlineDate: string | null;
  closedAt: string | null;
}

export interface CustomerDetail {
  customer: Omit<Customer, "ticketCount" | "openTicketCount" | "lastTicketDate">;
  tickets: CustomerTicketSummary[];
}
