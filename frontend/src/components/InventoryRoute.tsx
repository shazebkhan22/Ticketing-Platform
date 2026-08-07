import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Inventory is admins + Team Field only — Team FMS has no access to the
// feature at all, same rule enforced server-side in routes/inventory.ts.
export function InventoryRoute() {
  const { user } = useAuth();

  if (user?.role !== "admin" && user?.team !== "Field") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
