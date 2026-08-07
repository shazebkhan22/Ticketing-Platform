import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useInventoryList, useUpdateInventory } from "@/hooks/useInventory";
import { useUpdateTicketStatusForAnyTicket } from "@/hooks/useTickets";
import { usePaginatedFilters, getTotalPages } from "@/hooks/usePaginatedFilters";
import { inventoryUpdateSchema } from "@/lib/schemas";
import type { InventoryItem, RepairLocation, EditFormState } from "@/types/inventory";
import { formatDate, truncateChars } from "@/lib/ticket-utils";
import {
  ALL_FILTER_VALUE,
  STATUS_CLASSES,
  DEFAULT_FILTERS,
  DATE_TOOLTIPS,
} from "@/constants/inventory";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationFooter } from "@/components/PaginationFooter";
import { TableSkeletonRows, TableEmptyRow } from "@/components/TableListStates";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function toFormState(item: InventoryItem): EditFormState {
  return {
    inwardDate: item.inwardDate ?? "",
    outwardDate: item.outwardDate ?? "",
    repairLocation: item.repairLocation,
    outsourceVendor: item.outsourceVendor ?? "",
    expectedReturnDate: item.expectedReturnDate ?? "",
    deliveryPerson: item.deliveryPerson ?? "",
  };
}

// The dispatch workflow is done once an outward date is set — nothing left
// to update, so the row is locked instead of inviting another edit.
function isCompleted(item: InventoryItem): boolean {
  return item.derivedStatus === "Returned to Customer";
}

export function InventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { filters, updateFilter, page, pageSize } = usePaginatedFilters(DEFAULT_FILTERS);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<EditFormState | null>(null);
  // Set right after a save that newly dispatched the item — offers to close
  // the ticket in the same flow instead of making the user go find it later.
  const [closePromptSrNo, setClosePromptSrNo] = useState<number | null>(null);

  const { data, isLoading } = useInventoryList(filters);
  const updateMutation = useUpdateInventory();
  const closeTicketMutation = useUpdateTicketStatusForAnyTicket();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = getTotalPages(total, pageSize);

  function openEdit(item: InventoryItem) {
    setEditingItem(item);
    setForm(toFormState(item));
  }

  async function handleSave() {
    if (!editingItem || !form) return;
    const parsed = inventoryUpdateSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const wasDispatched = Boolean(editingItem.outwardDate);
    const srNo = editingItem.srNo;
    try {
      await updateMutation.mutateAsync({
        srNo,
        input: {
          inwardDate: form.inwardDate || undefined,
          outwardDate: form.outwardDate || undefined,
          repairLocation: form.repairLocation,
          outsourceVendor: form.outsourceVendor || undefined,
          expectedReturnDate: form.expectedReturnDate || undefined,
          deliveryPerson: form.deliveryPerson || undefined,
        },
      });
      toast.success("Inventory updated");
      setEditingItem(null);
      setForm(null);
      // Only prompt the first time the outward date is set, not on every
      // subsequent edit to an already-dispatched item.
      if (!wasDispatched && form.outwardDate) {
        setClosePromptSrNo(srNo);
      }
    } catch {
      toast.error("Failed to update inventory");
    }
  }

  async function handleCloseTicket() {
    if (closePromptSrNo === null) return;
    try {
      await closeTicketMutation.mutateAsync({ srNo: closePromptSrNo, status: "Closed" });
      toast.success("Ticket closed");
    } catch {
      toast.error("Failed to close ticket — you can still close it from the ticket detail page");
    } finally {
      setClosePromptSrNo(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">Inventory</h2>
        <p className="text-sm text-neutral-500 max-w-xl">
          {isAdmin
            ? "Track inward/outward movement and in-house vs. outsourced repair status for every product added to inventory."
            : "Track inward/outward movement and in-house vs. outsourced repair status for products on your tickets."}
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
            updateFilter("repairLocation", v === ALL_FILTER_VALUE ? undefined : v)
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
              {isLoading ? (
                <TableSkeletonRows colSpan={10} />
              ) : items.length === 0 ? (
                <TableEmptyRow
                  colSpan={10}
                  message="No products found. Add a ticket to inventory from its ticket detail page to track it here."
                />
              ) : (
                items.map((item) => (
                  <TableRow key={item.srNo}>
                    <TableCell className="text-sm font-medium">
                      <Link to={`/tickets/${item.srNo}`} className="text-blue-800 hover:underline">
                        {item.ticketNo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{truncateChars(item.companyName, 8)}</TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {truncateChars(item.model ?? "", 19)}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {truncateChars(item.serialNumber ?? "", 8) || "-"}
                    </TableCell>
                    <TableCell className="text-sm">{item.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_CLASSES[item.derivedStatus]}>
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
                      {isCompleted(item) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="gap-1.5 text-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Completed
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Already dispatched back to the customer — nothing left to update.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                          Update
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationFooter
        currentCount={items.length}
        total={total}
        itemLabel="items"
        page={page}
        totalPages={totalPages}
        onPrev={() => updateFilter("page", Math.max(page - 1, 1))}
        onNext={() => updateFilter("page", Math.min(page + 1, totalPages))}
      />

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
            <DialogTitle>Update Inventory — {editingItem?.ticketNo}</DialogTitle>
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
                    <TooltipContent>{DATE_TOOLTIPS["Inward Date"]}</TooltipContent>
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
                  onValueChange={(v) => setForm({ ...form, repairLocation: v as RepairLocation })}
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
                      onChange={(e) => setForm({ ...form, outsourceVendor: e.target.value })}
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
                        <TooltipContent>{DATE_TOOLTIPS["Expected Return Date"]}</TooltipContent>
                      </Tooltip>
                    </label>
                    <DatePicker
                      value={form.expectedReturnDate}
                      onChange={(v) => setForm({ ...form, expectedReturnDate: v })}
                      placeholder="Not set"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-500">
                      Delivery Person
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 cursor-help text-primary" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Who's being sent to hand-deliver the product back to the customer.
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <Input
                      value={form.deliveryPerson}
                      onChange={(e) => setForm({ ...form, deliveryPerson: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
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
                    <TooltipContent>{DATE_TOOLTIPS["Outward Date"]}</TooltipContent>
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

      <AlertDialog
        open={closePromptSrNo !== null}
        onOpenChange={(open) => !open && setClosePromptSrNo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this ticket now?</AlertDialogTitle>
            <AlertDialogDescription>
              The product has been marked as dispatched back to the customer. Would you like to
              close the ticket now, or leave it open and close it later ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseTicket} disabled={closeTicketMutation.isPending}>
              {closeTicketMutation.isPending ? "Closing..." : "Close Ticket"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
