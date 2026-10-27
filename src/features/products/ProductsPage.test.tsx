import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const insert = vi.fn();
vi.mock("../../lib/supabaseClient", () => ({
  supabase: { from: () => ({ insert: async (payload: unknown) => (insert(payload), { error: null }) }) },
}));
vi.mock("../../lib/queries", () => ({
  fetchProducts: async () => [],
  fetchCategories: async () => [
    { id: "c-gf", name: "Gran formato", sort_order: 1, is_active: true },
    { id: "c-pap", name: "Papelería", sort_order: 2, is_active: true },
  ],
}));
vi.mock("../../lib/rpc", () => ({ rpc: {} }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { ProductsPage, isStationery } from "./ProductsPage";

it("reconoce papelería con o sin acento", () => {
  expect(isStationery("Papelería")).toBe(true);
  expect(isStationery("papeleria")).toBe(true);
  expect(isStationery("Gran formato")).toBe(false);
});

it("papelería: oculta menudeo, mayoreo y mínimo, y guarda sin precios", async () => {
  const user = userEvent.setup();
  render(<ProductsPage />);
  await user.click(await screen.findByRole("button", { name: "+ Producto" }));

  // Gran formato: se piden los precios.
  expect(screen.getByLabelText(/Precio menudeo/)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^Categoría/), { target: { value: "c-pap" } });
  expect(screen.queryByLabelText(/Precio menudeo/)).toBeNull();
  expect(screen.queryByLabelText(/Precio mayoreo/)).toBeNull();
  expect(screen.queryByLabelText(/Cantidad mínima para mayoreo/)).toBeNull();
  expect(screen.getByTestId("stationery-note")).toHaveTextContent("Papelería");
  // Nace inactivo: la casilla queda desmarcada y bloqueada.
  expect(screen.getByTestId("product-active")).not.toBeChecked();
  expect(screen.getByTestId("product-active")).toBeDisabled();
  expect(screen.getByTestId("stationery-inactive-note")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^SKU/), { target: { value: "P-VOL" } });
  fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Volantes" } });
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
  expect(insert.mock.calls[0]![0]).toMatchObject({
    sku: "P-VOL", category_id: "c-pap", retail_price: null, wholesale_price: null, wholesale_min_qty: null, is_active: false,
  });
});
