import type { ReactNode } from "react";
import type { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Shared building blocks for the ticket/project detail pages — identical
// Field markup used to be copy-pasted in both; kept here so a tweak only
// has to happen once.
export function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{label}</div>
      <div className="mt-0.5 text-sm text-neutral-800 wrap-break-word whitespace-normal">
        {value || "-"}
      </div>
    </div>
  );
}

export function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cygnus-50 text-cygnus-800">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-neutral-800">{value || "-"}</div>
        <div className="text-xs text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

export function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 flex items-center gap-2 font-bold text-cygnus-800">
          <Icon className="h-4 w-4" />
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}
