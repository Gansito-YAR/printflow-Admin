// Lista de datos responsive (Plan RSP-02).
//   md y mayores: tabla (con desplazamiento propio si no cabe).
//   celular:      tarjetas apiladas; la columna `primary` es el título y las
//                 demás se muestran como "Etiqueta: valor".
// Una sola definición de columnas para ambos formatos.

import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Título de la tarjeta en celular. Debe haber exactamente una. */
  primary?: boolean;
  /** Se oculta en la tarjeta de celular (info secundaria). */
  hideOnMobile?: boolean;
  /** Se oculta en tablet (md) y aparece en escritorio (lg). */
  hideOnTablet?: boolean;
}

export function DataList<T>({
  columns,
  rows,
  rowKey,
  actions,
  testId,
  label,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Botones por fila: al final de la fila (tabla) o a lo ancho (tarjeta). */
  actions?: (row: T) => ReactNode;
  testId?: string;
  /** Nombre accesible de la lista. */
  label: string;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);
  const thClass = (c: Column<T>) =>
    `p-3 ${c.align === "right" ? "text-right" : ""} ${c.hideOnTablet ? "hidden lg:table-cell" : ""}`;

  return (
    <>
      {/* Tabla: md+ */}
      <div className="hidden overflow-x-auto rounded-md border border-line bg-surface-0 md:block">
        <table className="w-full text-sm" data-testid={testId} aria-label={label}>
          <thead className="text-left text-ink-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={thClass(c)}>
                  {c.header}
                </th>
              ))}
              {actions && (
                <th scope="col" className="p-3">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-line align-top">
                {columns.map((c) => (
                  <td key={c.key} className={thClass(c)}>
                    {c.render(row)}
                  </td>
                ))}
                {actions && (
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas: celular */}
      <ul className="flex flex-col gap-3 md:hidden" aria-label={label} data-testid={testId ? `${testId}-cards` : undefined}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-md border border-line bg-surface-0 p-4">
            {primary && <div className="text-base font-semibold text-ink-strong">{primary.render(row)}</div>}
            {rest.length > 0 && (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {rest.map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="text-ink-muted">{c.header}</dt>
                    <dd className={`min-w-0 break-words text-ink-strong ${c.align === "right" ? "tabular" : ""}`}>
                      {c.render(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{actions(row)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
