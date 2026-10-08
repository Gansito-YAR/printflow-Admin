import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const insert = vi.fn();
vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: () => ({
      insert: (payload: unknown) => {
        insert(payload);
        return {
          select: () => ({
            single: async () => ({
              data: { id: "c1", phone_number: "526671234567", full_name: "Ana", pricing_tier: "RETAIL", is_active: true, notes: null, created_at: "" },
              error: null,
            }),
          }),
        };
      },
    }),
  },
}));
vi.mock("../../lib/queries", () => ({ fetchProducts: async () => [], searchCustomers: async () => [] }));
vi.mock("../../lib/rpc", () => ({ rpc: { quoteOrder: vi.fn(), createOrder: vi.fn() } }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { NewOrderPage } from "./NewOrderPage";

it("alta rápida de cliente dentro del pedido guarda el cliente y no envía el pedido", async () => {
  const user = userEvent.setup();
  const outerSubmit = vi.fn();
  render(
    <MemoryRouter>
      <NewOrderPage />
    </MemoryRouter>,
  );
  screen.getByTestId("new-order-form").addEventListener("submit", outerSubmit);

  await user.click(screen.getByRole("button", { name: "+ Cliente nuevo" }));
  const form = screen.getByTestId("customer-form");
  expect(screen.getByTestId("new-order-form").contains(form)).toBe(false); // sin formularios anidados

  fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: "6671234567" } });
  fireEvent.change(screen.getByLabelText(/Nombre o razón social/), { target: { value: "Ana" } });
  await user.click(screen.getByRole("button", { name: "Registrar cliente" }));

  await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
  expect(insert.mock.calls[0]![0]).toMatchObject({ phone_number: "526671234567", full_name: "Ana" });
  expect(outerSubmit).not.toHaveBeenCalled();
  expect(await screen.findByText("Ana")).toBeInTheDocument(); // queda seleccionado en el pedido
});
