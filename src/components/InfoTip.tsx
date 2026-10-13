// Ayuda breve junto a un botón, campo o sección (solicitud del cliente, 13/10/2026).
// Un "?" pequeño: muestra una explicación de una o dos líneas al pasar el mouse,
// al enfocarlo con teclado o al tocarlo en el celular. Escape la cierra.

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

export function InfoTip({ text }: { text: string; label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted hover:text-ink-strong"
        data-testid="info-tip"
      >
        <HelpCircle size={15} aria-hidden />
        {/* Nombre accesible: «Ayuda: …» sin repetir la etiqueta del campo. */}
        <span className="sr-only">Ayuda: {text}</span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1.5 w-64 max-w-[80vw] -translate-x-1/2 rounded-md border border-line bg-surface-0 px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-ink-base shadow-[var(--shadow-2)]"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** Texto de ayuda de una línea bajo un grupo de botones o el título de una sección. */
export function HelpLine({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-snug text-ink-muted">{children}</p>;
}
