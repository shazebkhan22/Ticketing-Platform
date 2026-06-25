import { apiClient } from "./client";
import type { ActivityFilters, ActivityListResponse } from "@/types/activity";

export async function fetchActivity(filters: ActivityFilters): Promise<ActivityListResponse> {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params[key] = String(value);
    }
  });
  const { data } = await apiClient.get<ActivityListResponse>("/activity", { params });
  return data;
}
