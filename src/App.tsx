import { useEffect } from "react";
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

export default function App() {
  const init = useAuthStore((s) => s.init);
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
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="configuracion" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </ErrorBoundary>
  );
}
