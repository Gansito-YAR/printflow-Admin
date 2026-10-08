import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { OrderDetail } from "../../lib/types";
import { AppError } from "../../lib/errors";

// Función simple (no vi.fn) para poder rechazar sin que el espía deje una promesa colgada.
let forceImpl: (...a: unknown[]) => Promise<unknown> = async () => ({});
const forceCalls: unknown[][] = [];
const forceDelivery = { calls: forceCalls };
vi.mock("../../lib/rpc", () => ({
  rpc: {
    forceDelivery: (...a: unknown[]) => {
      forceCalls.push(a);
      return forceImpl(...a);
    },
  },
}));
vi.mock("../../lib/queries", () => ({ fetchOrderConsumption: async () => [] }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
// La contraseña real la valida Supabase; aquí solo importa el flujo de la pantalla.
vi.mock("../auth/ReauthForm", () => ({
  ReauthForm: ({ onConfirmed }: { onConfirmed: () => void }) => (
    <button type="button" onClick={onConfirmed}>
      (contraseña confirmada)
    </button>
  ),
}));

import { AdvancedActions } from "./AdvancedActions";

const base = {
  id: "o1",
  folio: "PF-TEST01",
  status: "READY_FOR_DELIVERY",
  promised_date: "2026-10-15T18:00:00Z",
  total_price: "900.00",
  balance_due: "360.00",
} as unknown as OrderDetail;

beforeEach(() => {
  forceCalls.length = 0;
  forceImpl = async () => ({ status: "DELIVERED", balance_due: "360.00" });
});

it("forzar entrega solo se habilita en pedidos listos y con saldo", () => {
  const { rerender } = render(<AdvancedActions order={base} timezone="America/Mexico_City" onDone={() => {}} />);
  expect(screen.getByTestId("button-force-delivery")).toBeEnabled();
  rerender(<AdvancedActions order={{ ...base, balance_due: "0.00" }} timezone="America/Mexico_City" onDone={() => {}} />);
  expect(screen.getByTestId("button-force-delivery")).toBeDisabled();
  rerender(<AdvancedActions order={{ ...base, status: "IN_PRODUCTION" }} timezone="America/Mexico_City" onDone={() => {}} />);
  expect(screen.getByTestId("button-force-delivery")).toBeDisabled();
});

it("pide contraseña primero, muestra el saldo y exige motivo", async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  render(<AdvancedActions order={base} timezone="America/Mexico_City" onDone={onDone} />);

  await user.click(screen.getByTestId("button-force-delivery"));
  expect(screen.queryByTestId("force-warning")).not.toBeInTheDocument(); // aún sin contraseña
  await user.click(screen.getByText("(contraseña confirmada)"));
  expect(screen.getByTestId("force-warning")).toHaveTextContent("$360.00");

  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  expect(forceDelivery.calls).toHaveLength(0); // sin motivo
  expect(screen.getByRole("alert")).toHaveTextContent("motivo");

  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "Cliente corporativo con crédito" } });
  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() => expect(onDone).toHaveBeenCalled());
  expect(forceDelivery.calls).toEqual([["o1", "Cliente corporativo con crédito"]]);
});

it("si el servidor dice que la autorización venció, vuelve a pedir la contraseña", async () => {
  const user = userEvent.setup();
  forceImpl = async () => {
    throw new AppError("PF_REAUTH_REQUIRED");
  };
  render(<AdvancedActions order={base} timezone="America/Mexico_City" onDone={() => {}} />);
  await user.click(screen.getByTestId("button-force-delivery"));
  await user.click(screen.getByText("(contraseña confirmada)"));
  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "Cliente con crédito" } });
  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  expect(await screen.findByText("(contraseña confirmada)")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("contraseña");
});
