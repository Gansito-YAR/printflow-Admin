// Layout de escritorio (Brief UI §2): sidebar oscuro, header con el usuario
// activo y área de contenido amplia.

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { fetchLowStockCount } from "../lib/queries";
import { useAuthStore } from "../store/auth";
import { ErrorBoundary } from "../components/ErrorBoundary";

const NAV = [
  { to: "/", label: "Tablero", end: true },
  { to: "/pedidos/nuevo", label: "Nuevo pedido", end: true },
  { to: "/pedidos", label: "Historial", end: true },
  { to: "/clientes", label: "Clientes", end: false },
  { to: "/productos", label: "Productos y recetas", end: false },
  { to: "/insumos", label: "Insumos", end: false },
  { to: "/utilidad", label: "Utilidad y mermas", end: false },
  { to: "/usuarios", label: "Usuarios", end: false },
  { to: "/configuracion", label: "Configuración", end: false },
];

/** Insumos bajo mínimo; se refresca al navegar. */
function useLowStock() {
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);
  useEffect(() => {
    fetchLowStockCount()
      .then(setCount)
      .catch(() => setCount(0));
  }, [pathname]);
  return count;
}

export function AdminShell() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const lowStock = useLowStock();

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-sidebar-ink">
        <div className="flex h-16 items-center px-5">
          <img src="/brand/logo-full.png" alt="Imprenta Escalante" className="h-9 w-auto" />
        </div>
        <nav aria-label="Navegación principal" className="flex flex-col gap-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold ${
                  isActive ? "bg-sidebar-active text-sidebar-active-ink" : "text-sidebar-ink hover:bg-sidebar-hover"
                }`
              }
            >
              {item.label}
              {item.to === "/insumos" && lowStock > 0 && (
                <span
                  className="ml-2 rounded-sm bg-blocked px-1.5 text-xs font-bold text-blocked-ink"
                  title={`${lowStock} insumo(s) bajo el stock mínimo`}
                  data-testid="low-stock-badge"
                >
                  {lowStock}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-end gap-4 border-b border-line bg-surface-0 px-6">
          <span className="text-sm text-ink-base" data-testid="current-user">
            {profile?.full_name} <span className="text-ink-muted">· Administrador</span>
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink-strong hover:bg-surface-2"
          >
            Cerrar sesión
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
