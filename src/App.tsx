import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { AdminShell } from "./layouts/AdminShell";
import { KanbanPage } from "./features/kanban/KanbanPage";
import { NewOrderPage } from "./features/orders/NewOrderPage";
import { OrderDetailPage } from "./features/orders/OrderDetailPage";
import { CustomersPage } from "./features/customers/CustomersPage";
import { ProductsPage } from "./features/products/ProductsPage";
import { UsersPage } from "./features/users/UsersPage";
import { OrderHistoryPage } from "./features/orders/OrderHistoryPage";
import { MaterialsPage } from "./features/materials/MaterialsPage";
import { ProfitPage } from "./features/reports/ProfitPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ActivityPage } from "./features/activity/ActivityPage";

/** true en pantallas de escritorio (≥ 1024 px). */
function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [desktop, setDesktop] = useState(() => window.matchMedia?.(query).matches ?? true);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const on = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return desktop;
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const desktop = useIsDesktop();
  useEffect(() => init(), [init]);

  return (
    <ErrorBoundary message="Ocurrió un error en el panel. Recargue la página e informe a Sistemas.">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<KanbanPage />} />
            <Route path="pedidos" element={<OrderHistoryPage />} />
            <Route path="pedidos/nuevo" element={<NewOrderPage />} />
            <Route path="pedidos/:folio" element={<OrderDetailPage />} />
            <Route path="clientes" element={<CustomersPage />} />
            <Route path="productos" element={<ProductsPage />} />
            <Route path="insumos" element={<MaterialsPage />} />
            <Route path="utilidad" element={<ProfitPage />} />
            <Route path="bitacora" element={<ActivityPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="configuracion" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position={desktop ? "top-right" : "top-center"}
        toastOptions={{
          duration: 4000,
          // Sigue el tema: superficie y texto del panel, no el blanco por defecto.
          style: {
            background: "var(--surface-0)",
            color: "var(--ink-strong)",
            border: "1px solid var(--border-hairline)",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </ErrorBoundary>
  );
}
