// Layout del panel (Brief UI §2, Plan Responsive RSP-01).
//   Escritorio (≥ lg): menú lateral oscuro fijo + encabezado con el usuario.
//   Celular y tablet: el menú vive en un cajón que abre el botón ☰.

import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { fetchLowStockCount } from "../lib/queries";
import { useAuthStore } from "../store/auth";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { lockScroll } from "../utils/scrollLock";

const NAV = [
  { to: "/", label: "Tablero", end: true },
  { to: "/pedidos/nuevo", label: "Nuevo pedido", end: true },
  { to: "/pedidos", label: "Pedidos", end: true },
  { to: "/clientes", label: "Clientes", end: false },
  { to: "/productos", label: "Productos y recetas", end: false },
  { to: "/insumos", label: "Insumos", end: false },
  { to: "/utilidad", label: "Utilidad y mermas", end: false },
  { to: "/bitacora", label: "Bitácora", end: false },
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

function LowStockBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-2 rounded-sm bg-blocked px-1.5 text-xs font-bold text-blocked-ink" data-testid="low-stock-badge">
      {count}
      <span className="sr-only"> insumo(s) bajo el stock mínimo</span>
    </span>
  );
}

function NavLinks({ lowStock, onNavigate }: { lowStock: number; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-1 px-3 py-4">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold lg:min-h-0 ${
              isActive ? "bg-sidebar-active text-sidebar-active-ink" : "text-sidebar-ink hover:bg-sidebar-hover"
            }`
          }
        >
          {item.label}
          {item.to === "/insumos" && <LowStockBadge count={lowStock} />}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminShell() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const lowStock = useLowStock();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  }, []);

  // Cerrar al cambiar de ruta (también cubre el botón "atrás").
  useEffect(() => setDrawerOpen(false), [pathname]);

  // Cajón abierto: Esc cierra, foco atrapado y el cuerpo no se desplaza detrás.
  useEffect(() => {
    if (!drawerOpen) return;
    const unlock = lockScroll();
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
      if (e.key === "Tab" && drawerRef.current) {
        const items = drawerRef.current.querySelectorAll<HTMLElement>("a, button");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div className="flex h-full">
      {/* Escritorio: menú lateral fijo */}
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar text-sidebar-ink lg:flex">
        <div className="flex h-16 items-center px-5">
          <img src="/brand/logo-full.png" alt="Imprenta Escalante" className="h-9 w-auto" />
        </div>
        <NavLinks lowStock={lowStock} />
      </aside>

      {/* Celular y tablet: cajón */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div aria-hidden className="absolute inset-0 bg-[var(--overlay-backdrop)] opacity-50" onClick={closeDrawer} />
          <div
            ref={drawerRef}
            id="main-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
            className="safe-bottom absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-sidebar text-sidebar-ink"
            data-testid="nav-drawer"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <img src="/brand/logo-full.png" alt="Imprenta Escalante" className="h-9 w-auto" />
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Cerrar menú"
                className="flex h-11 w-11 items-center justify-center rounded-md text-2xl hover:bg-sidebar-hover"
              >
                ×
              </button>
            </div>
            <NavLinks lowStock={lowStock} onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-auto border-t border-sidebar-hover px-5 py-4 text-sm">
              <p className="truncate font-semibold">{profile?.full_name}</p>
              <p className="text-sidebar-muted">Administrador</p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-3 min-h-11 w-full rounded-md border border-sidebar-muted px-3 font-semibold hover:bg-sidebar-hover"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface-0 px-3 md:px-4 lg:h-16 lg:justify-end lg:px-6">
          <button
            ref={menuButton}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={drawerOpen}
            aria-controls="main-drawer"
            className="relative flex h-11 w-11 items-center justify-center rounded-md border border-line text-xl text-ink-strong lg:hidden"
            data-testid="open-menu"
          >
            ☰
            {lowStock > 0 && (
              <span aria-hidden className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface-0 bg-blocked-line" />
            )}
          </button>
          <img src="/brand/logo-mark.png" alt="" className="h-8 w-auto lg:hidden" />
          <span className="hidden text-sm text-ink-base md:inline lg:ml-auto" data-testid="current-user">
            {profile?.full_name} <span className="text-ink-muted">· Administrador</span>
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="ml-auto hidden min-h-10 rounded-md border border-line px-3 text-sm font-semibold text-ink-strong hover:bg-surface-2 md:inline-flex md:items-center lg:ml-0"
          >
            Cerrar sesión
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-3 md:p-4 lg:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
