// Barra de la acción principal (Plan RSP-06, RSP-D-10).
//   celular y tablet: fija abajo, sobre el contenido, respetando la zona segura
//                     del iPhone. Deja un espaciador para no tapar lo último.
//   lg: se queda en su lugar dentro de la página, como un bloque normal.

import type { ReactNode } from "react";

export function StickyActions({ children, summary }: { children: ReactNode; summary?: ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-24 lg:hidden" />
      <div
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-2 border-line-strong bg-surface-0 px-3 pt-3 shadow-[var(--shadow-2)] lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:shadow-none"
        data-testid="sticky-actions"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-end lg:pb-0">
          {summary && <div className="text-sm sm:mr-auto">{summary}</div>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3 [&>*]:w-full sm:[&>*]:w-auto">{children}</div>
        </div>
      </div>
    </>
  );
}
