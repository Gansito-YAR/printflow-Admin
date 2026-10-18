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
const planCuts = vi.fn();
vi.mock("../../lib/rpc", () => ({ rpc: { quoteOrder: (...a: unknown[]) => quoteOrder(...a), planCuts: (...a: unknown[]) => planCuts(...a), createOrder: vi.fn(), estimateCosting: vi.fn(async () => null), previewMaterials: vi.fn(async () => []) } }));
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

it("calculadora de corte: pide base, altura y cantidad, y muestra pliegos y merma", async () => {
  const user = userEvent.setup();
  products = [{
    id: "p2", sku: "SEN", name: "Impresión de señalética", category_id: "c1", category: { id: "c1", name: "Gran formato", sort_order: 1 },
    pricing_unit: "UNIT", retail_price: "10.00", wholesale_price: "8.00", wholesale_min_qty: null, is_active: true, fixed_cost: "0.00",
  }];
  materialOptions = [{ product_id: "p2", raw_material_id: "m-est", priority: "REQUIRED", name: "Estireno", cuttable: true }];
  quoteOrder.mockReset();
  quoteOrder.mockResolvedValue({ items: [], total: "5000.00", deposit_required: "2500.00", deposit_pct: "50.00" });
  planCuts.mockResolvedValue([{ line_no: 1, materials: [{
    raw_material_id: "m-est", name: "Estireno", priority: "REQUIRED", chosen: false, sheet_w: "70.00", sheet_h: "95.00",
    pieces_per_sheet: 3, sheets_required: 167, used_pct_sheet: "71.89", used_pct: "71.75", waste_pct: "28.25", material_cost: "16700.00",
    layout: { pieces_per_sheet: 3, margin: 0, gap: 0, rects: [{ x: 0, y: 0, w: 33.02, h: 48.26 }, { x: 33.02, y: 0, w: 33.02, h: 48.26 }, { x: 0, y: 48.26, w: 48.26, h: 33.02 }] },
  }] }]);
  render(
    <MemoryRouter>
      <NewOrderPage />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: "+ Cliente nuevo" }));
  fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: "6671234567" } });
  fireEvent.change(screen.getByLabelText(/Nombre o razón social/), { target: { value: "Ana" } });
  await user.click(screen.getByRole("button", { name: "Registrar cliente" }));
  await screen.findByText("Ana");

  const select = (await screen.findAllByRole("combobox"))[0]!;
  await waitFor(() => expect(screen.getByRole("option", { name: /señalética/ })).toBeInTheDocument());
  fireEvent.change(select, { target: { value: "p2" } });

  expect(await screen.findByTestId("cut-fields")).toBeInTheDocument();
  fireEvent.change(screen.getByTestId("row-quantity"), { target: { value: "500" } });
  await new Promise((r) => setTimeout(r, 450));
  expect(quoteOrder).not.toHaveBeenCalled(); // sin base y altura no cotiza

  expect(screen.getByTestId("cut-pending")).toHaveTextContent("Escriba base, altura y cantidad");
  // Como en la captura del cliente: con "cm" escrito o con coma decimal.
  fireEvent.change(screen.getByTestId("row-cutW"), { target: { value: "33.02cm" } });
  fireEvent.change(screen.getByTestId("row-cutH"), { target: { value: "48,26 cm" } });
  expect(screen.getByTestId("row-cutW")).toHaveValue("33.02");
  expect(screen.getByTestId("row-cutH")).toHaveValue("48.26");

  const preview = await screen.findByTestId("cut-preview");
  expect(preview).toHaveTextContent("3 por pliego");
  expect(preview).toHaveTextContent("167 pliegos");
  expect(preview).toHaveTextContent("71.75 % utilizado");
  expect(preview).toHaveTextContent("28.25 % merma");
  expect(preview.querySelectorAll("svg rect").length).toBe(3);

  await waitFor(() => expect(quoteOrder).toHaveBeenCalled());
  expect(quoteOrder.mock.calls.at(-1)![1]).toEqual([{
    product_id: "p2", quantity: "500", cut_width_cm: "33.02", cut_height_cm: "48.26", cut_gap_cm: "0", cut_margin_cm: "0",
  }]);
});
