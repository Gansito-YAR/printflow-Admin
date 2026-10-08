// Nunca una pantalla en blanco (SRS Fase 3 §7, SRS-POS-02).
// Se usa global y por sección: una sección rota no derriba el resto.

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Mensaje para el área dañada. Por defecto, el del SRS. */
  message?: string;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sin datos financieros en el log: solo el error técnico.
    console.error("ErrorBoundary", error.message, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="m-4 rounded-md border-2 border-blocked-line bg-blocked p-6 text-blocked-ink">
        <p className="font-bold">[!] {this.props.message ?? "Error cargando este panel. Reporte a soporte técnico."}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md border-2 border-line-strong bg-surface-0 px-4 py-2 text-sm font-semibold text-ink-strong"
        >
          Recargar
        </button>
      </div>
    );
  }
}
