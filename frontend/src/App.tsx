import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { SidebarLayout } from "@/components/SidebarLayout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";

const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const TicketDetailPage = lazy(() =>
  import("@/pages/TicketDetailPage").then((m) => ({ default: m.TicketDetailPage }))
);
const TicketFormPage = lazy(() =>
  import("@/pages/TicketFormPage").then((m) => ({ default: m.TicketFormPage }))
);
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const ActivityLogPage = lazy(() =>
  import("@/pages/ActivityLogPage").then((m) => ({ default: m.ActivityLogPage }))
);
const CustomersPage = lazy(() =>
  import("@/pages/CustomersPage").then((m) => ({ default: m.CustomersPage }))
);
const CustomerDetailPage = lazy(() =>
  import("@/pages/CustomerDetailPage").then((m) => ({ default: m.CustomerDetailPage }))
);
const InventoryPage = lazy(() =>
  import("@/pages/InventoryPage").then((m) => ({ default: m.InventoryPage }))
);
const AnalyticsPage = lazy(() =>
  import("@/pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage }))
);
// const SettingsPage = lazy(() =>
//   import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
// );
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<SidebarLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/tickets/new" element={<TicketFormPage />} />
                  <Route path="/tickets/:srNo" element={<TicketDetailPage />} />
                  <Route path="/tickets/:srNo/edit" element={<TicketFormPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route element={<AdminRoute />}>
                    <Route path="/activity" element={<ActivityLogPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    {/* <Route path="/settings" element={<SettingsPage />} /> */}
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
