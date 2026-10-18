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
let products: unknown[] = [];
let materialOptions: unknown[] = [];
const quoteOrder = vi.fn();
vi.mock("../../lib/queries", () => ({
  fetchProducts: async () => products,
  fetchProductMaterialOptions: async () => materialOptions,
  searchCustomers: async () => [],
}));
vi.mock("../../lib/rpc", () => ({ rpc: { quoteOrder: (...a: unknown[]) => quoteOrder(...a), createOrder: vi.fn(), estimateCosting: vi.fn(async () => null), previewMaterials: vi.fn(async () => []) } }));
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

it("producto con materiales opcionales: pide elegir material antes de cotizar", async () => {
  const user = userEvent.setup();
  products = [{
    id: "p1", sku: "SEN", name: "Señaletica", category_id: "c1", category: { id: "c1", name: "Gran formato", sort_order: 1 },
    pricing_unit: "UNIT", retail_price: "750.00", wholesale_price: "600.00", wholesale_min_qty: null, is_active: true, fixed_cost: "0.00",
  }];
  materialOptions = [
    { product_id: "p1", raw_material_id: "m-vin", priority: "REQUIRED", name: "Vinil" },
    { product_id: "p1", raw_material_id: "m-cor", priority: "OPTIONAL", name: "Coroplast" },
    { product_id: "p1", raw_material_id: "m-est", priority: "OPTIONAL", name: "Estireno" },
  ];
  quoteOrder.mockResolvedValue({ items: [], total: "750.00", deposit_required: "375.00", deposit_pct: "50.00" });
  render(
    <MemoryRouter>
      <NewOrderPage />
    </MemoryRouter>,
  );
  // Cliente (alta rápida, como en la prueba anterior)
  await user.click(screen.getByRole("button", { name: "+ Cliente nuevo" }));
  fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: "6671234567" } });
  fireEvent.change(screen.getByLabelText(/Nombre o razón social/), { target: { value: "Ana" } });
  await user.click(screen.getByRole("button", { name: "Registrar cliente" }));
  await screen.findByText("Ana");

  const select = (await screen.findAllByRole("combobox"))[0]!;
  await waitFor(() => expect(screen.getByRole("option", { name: /Señaletica/ })).toBeInTheDocument());
  fireEvent.change(select, { target: { value: "p1" } });

  const choice = await screen.findByTestId("material-choice");
  expect(choice).toHaveTextContent("Incluye siempre: Vinil.");
  expect(screen.getByText("Falta elegir el material.")).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 450)); // más que la espera de la cotización
  expect(quoteOrder).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Estireno" }));
  expect(screen.getByRole("button", { name: /Estireno/ })).toHaveAttribute("aria-pressed", "true");
  await waitFor(() => expect(quoteOrder).toHaveBeenCalled());
  expect(quoteOrder.mock.calls.at(-1)![1]).toEqual([{ product_id: "p1", quantity: "1", material_ids: ["m-est"] }]);
});
