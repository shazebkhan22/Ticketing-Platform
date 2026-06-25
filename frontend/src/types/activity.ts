export interface ActivityEntry {
  id: number;
  actorUserId: number | null;
  actorName: string;
  action: string;
  ticketSrNo: number | null;
  ticketNo: string | null;
  details: string | null;
  createdAt: string;
}

export interface ActivityFilters {
  ticketSrNo?: string;
  actorUserId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ActivityListResponse {
  entries: ActivityEntry[];
  total: number;
  page: number;
  pageSize: number;
}
