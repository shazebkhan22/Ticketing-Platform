import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const EVENTS_URL = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api"}/events`;

interface TicketCreatedPayload {
  srNo: number;
  ticketNo: string;
  companyName: string;
  createdBy: string;
}

interface ProjectCreatedPayload {
  srNo: number;
  projectNo: string;
  companyName: string;
  createdBy: string;
}

// Live "someone just created X" popups for anyone else currently on the
// dashboard — pushed over Server-Sent Events (see backend/src/routes/events.ts)
// rather than polling, since it only needs to flow server -> client.
export function RealtimeNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const source = new EventSource(EVENTS_URL, { withCredentials: true });

    source.addEventListener("ticket:created", (e) => {
      const data: TicketCreatedPayload = JSON.parse((e as MessageEvent).data);
      toast.info(`New ticket ${data.ticketNo}`, {
        description: `${data.companyName} — created by ${data.createdBy}`,
        action: {
          label: "View",
          onClick: () => navigate(`/tickets/${data.srNo}`),
        },
      });
    });

    source.addEventListener("project:created", (e) => {
      const data: ProjectCreatedPayload = JSON.parse((e as MessageEvent).data);
      toast.info(`New project ${data.projectNo}`, {
        description: `${data.companyName} — created by ${data.createdBy}`,
        action: {
          label: "View",
          onClick: () => navigate(`/projects/${data.srNo}`),
        },
      });
    });

    return () => source.close();
  }, [user, navigate]);

  return null;
}
