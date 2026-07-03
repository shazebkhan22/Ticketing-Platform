import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useInventoryList, useUpdateInventory } from "@/hooks/useInventory";
import type {
  InventoryFilters,
  InventoryItem,
  RepairLocation,
  EditFormState,
} from "@/types/inventory";
import { formatDate, truncateChars } from "@/lib/ticket-utils";
import {
  ALL_FILTER_VALUE,
  STATUS_CLASSES,
  DEFAULT_FILTERS,
  DATE_TOOLTIPS,
} from "@/constants/inventory";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function toFormState(item: InventoryItem): EditFormState {
  return {
    inwardDate: item.inwardDate ?? "",
    outwardDate: item.outwardDate ?? "",
    repairLocation: item.repairLocation,
    outsourceVendor: item.outsourceVendor ?? "",
    expectedReturnDate: item.expectedReturnDate ?? "",
  };
}

export function InventoryPage() {
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<EditFormState | null>(null);

  const { data, isLoading } = useInventoryList(filters);
  const updateMutation = useUpdateInventory();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = filters.pageSize ?? 7;
  const page = filters.page ?? 1;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function updateFilter<K extends keyof InventoryFilters>(
    key: K,
    value: InventoryFilters[K]
  ) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (value as number) : 1,
    }));
  }

  function openEdit(item: InventoryItem) {
    setEditingItem(item);
    setForm(toFormState(item));
  }

  function validateForm(f: EditFormState): string | null {
    if (f.outwardDate && !f.inwardDate) {
      return "Inward date is required before setting an outward date";
    }
    if (f.inwardDate && f.outwardDate && f.outwardDate < f.inwardDate) {
      return "Outward date cannot be before inward date";
    }
    if (f.repairLocation === "Outsourced") {
      if (!f.outsourceVendor.trim()) {
        return "Repair center name is required for outsourced repairs";
      }
      if (!f.expectedReturnDate) {
        return "Expected return date is required for outsourced repairs";
      }
    }
    if (
      f.outwardDate &&
      f.expectedReturnDate &&
      f.expectedReturnDate > f.outwardDate
    ) {
      return "Expected return date cannot be after the outward date";
    }
    return null;
  }

  async function handleSave() {
    if (!editingItem || !form) return;
    const validationError = validateForm(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        srNo: editingItem.srNo,
        input: {
          inwardDate: form.inwardDate || undefined,
          outwardDate: form.outwardDate || undefined,
          repairLocation: form.repairLocation,
          outsourceVendor: form.outsourceVendor || undefined,
          expectedReturnDate: form.expectedReturnDate || undefined,
        },
      });
      toast.success("Inventory updated");
      setEditingItem(null);
      setForm(null);
    } catch {
      toast.error("Failed to update inventory");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">Inventory</h2>
        <p className="text-sm text-neutral-500">
          Track inward/outward movement and in-house vs. outsourced repair
          status for every product that's come in on a ticket.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by ticket no, company, or serial number"
          value={filters.search ?? ""}
          onChange={(e) => updateFilter("search", e.target.value || undefined)}
          className="max-w-sm"
        />
        <Select
          value={filters.repairLocation ?? ALL_FILTER_VALUE}
          onValueChange={(v) =>
            updateFilter(
              "repairLocation",
              v === ALL_FILTER_VALUE ? undefined : v
            )
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Repair location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>All locations</SelectItem>
            <SelectItem value="In-House">In-House</SelectItem>
            <SelectItem value="Outsourced">Outsourced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket No</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Sr Number(s)</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inward</TableHead>
                <TableHead>Outward</TableHead>
                <TableHead>Location</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-3 text-center text-neutral-400"
                  >
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-3 text-center text-neutral-400"
                  >
                    No products found. Inventory only tracks tickets that have a
                    serial number.
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.srNo}>
                  <TableCell className="text-sm font-medium">
                    <Link
                      to={`/tickets/${item.srNo}`}
                      className="text-blue-800 hover:underline"
                    >
                      {item.ticketNo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {truncateChars(item.companyName, 8)}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {truncateChars(item.model ?? "", 19)}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {truncateChars(item.serialNumber ?? "", 8) || "-"}
                  </TableCell>
                  <TableCell className="text-sm">{item.quantity}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={STATUS_CLASSES[item.derivedStatus]}
                    >
                      {item.derivedStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {item.inwardDate ? formatDate(item.inwardDate) : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {item.outwardDate ? formatDate(item.outwardDate) : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                    >
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          Showing {items.length} of {total} items
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateFilter("page", page - 1)}
          >
            Prev
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateFilter("page", page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
            setForm(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Update Inventory — {editingItem?.ticketNo}
            </DialogTitle>
          </DialogHeader>

          {form && (
            <div className="space-y-4">
              <div className="gap-3">
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-500">
                  Inward Date
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help text-primary" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {DATE_TOOLTIPS["Inward Date"]}
                    </TooltipContent>
                  </Tooltip>
                </label>
                <DatePicker
                  value={form.inwardDate}
                  onChange={(v) => setForm({ ...form, inwardDate: v })}
                  placeholder="Not received yet"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">
                  Repair Location
                </label>
                <Select
                  value={form.repairLocation}
                  onValueChange={(v) =>
                    setForm({ ...form, repairLocation: v as RepairLocation })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In-House">In-House</SelectItem>
                    <SelectItem value="Outsourced">Outsourced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.repairLocation === "Outsourced" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">
                      Outsource Vendor
                    </label>
                    <Input
                      value={form.outsourceVendor}
                      onChange={(e) =>
                        setForm({ ...form, outsourceVendor: e.target.value })
                      }
                      placeholder="e.g. ABC Repair Center"
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-500">
                      Expected Return Date
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 cursor-help text-primary" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {DATE_TOOLTIPS["Expected Return Date"]}
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <DatePicker
                      value={form.expectedReturnDate}
                      onChange={(v) =>
                        setForm({ ...form, expectedReturnDate: v })
                      }
                      placeholder="Not set"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-500">
                  Outward Date
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help text-primary" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {DATE_TOOLTIPS["Outward Date"]}
                    </TooltipContent>
                  </Tooltip>
                </label>
                <DatePicker
                  value={form.outwardDate}
                  onChange={(v) => setForm({ ...form, outwardDate: v })}
                  placeholder="Not dispatched yet"
                  disabled={!form.inwardDate}
                />
                {!form.inwardDate && (
                  <p className="mt-1 text-xs text-neutral-400">
                    Set an inward date before setting the outward date.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
