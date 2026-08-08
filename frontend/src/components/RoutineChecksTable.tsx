import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RoutineCheckItem, RoutineCheckSection } from "@/types/ticket";

const SECTIONS: RoutineCheckSection[] = ["Routine Checks", "System Updates & Patch Management"];

// Read-only rendering of a submitted Routine Checks ticket's checklist —
// see TicketFormPage for the editable version filled in at submission time.
export function RoutineChecksTable({ routineChecks }: { routineChecks: RoutineCheckItem[] }) {
  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const items = routineChecks.filter((r) => r.section === section);
        if (items.length === 0) return null;
        return (
          <div key={section}>
            <h4 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              {section}
            </h4>
            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                    <th className="px-3 py-2 font-medium w-80">Task</th>
                    <th className="px-3 py-2 font-medium w-40">Status</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={`${item.section}-${item.task}`}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-3 py-2 text-neutral-800">
                        {item.task}
                        {item.detail && (
                          <span className="ml-1 text-xs text-neutral-500">({item.detail})</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={item.status === "Completed" ? "secondary" : "outline"}>
                          {item.status === "Completed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-neutral-600">{item.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
