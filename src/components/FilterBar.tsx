// Barra de filtros responsive (Plan RSP-05).
//   lg: fila con los filtros a la vista.
//   md: rejilla de 2 columnas.
//   celular: plegada detrás de un botón "Filtros (n activos)".

import { useId, useState, type ReactNode } from "react";

export function FilterBar({ children, active = 0 }: { children: ReactNode; active?: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="rounded-md border border-line bg-surface-0 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex min-h-11 w-full items-center justify-between rounded-md text-sm font-semibold text-ink-strong md:hidden"
        data-testid="toggle-filters"
      >
        <span>
          Filtros{active > 0 && <span className="ml-1 text-brand-accent">({active} activo{active === 1 ? "" : "s"})</span>}
        </span>
        <span aria-hidden>{open ? "▲" : "▼"}</span>
      </button>
      <div
        id={id}
        className={`${open ? "mt-3 grid" : "hidden"} grid-cols-1 gap-3 md:mt-0 md:grid md:grid-cols-2 lg:flex lg:flex-wrap lg:items-end lg:gap-4 [&>*]:min-w-0 lg:[&>*]:w-52`}
      >
        {children}
      </div>
    </div>
  );
}
