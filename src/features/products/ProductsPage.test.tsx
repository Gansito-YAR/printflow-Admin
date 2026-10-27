import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const insert = vi.fn();
const update = vi.fn();
let products: unknown[] = [];
let tierRows: { max_qty: number | null; price: string }[] = [];
vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => ({
      insert: async (payload: unknown) => (insert(payload), { error: null }),
      update: (payload: unknown) => ({ eq: async () => (update(payload), { error: null }) }),
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: table === "product_price_tiers" ? tierRows : [], error: null }),
        }),
      }),
    }),
  },
}));
vi.mock("../../lib/queries", () => ({
  fetchProducts: async () => products,
  fetchCategories: async () => [
    { id: "c-gf", name: "Gran formato", sort_order: 1, is_active: true },
    { id: "c-pap", name: "Papelería", sort_order: 2, is_active: true },
  ],
}));
const setPriceTiers = vi.fn();
vi.mock("../../lib/rpc", () => ({ rpc: { setPriceTiers: (...a: unknown[]) => setPriceTiers(...a) } }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { ProductsPage, isStationery } from "./ProductsPage";

const stationeryProduct = {
  id: "p-tar", sku: "P-TAR", name: "Tarjetas", category_id: "c-pap", category: { id: "c-pap", name: "Papelería", sort_order: 2 },
  pricing_unit: "UNIT", retail_price: null, wholesale_price: null, wholesale_min_qty: null, units_per_package: null,
  is_active: false, fixed_cost: "0.00", archived_at: null,
};

beforeEach(() => {
  insert.mockReset();
  update.mockReset();
  setPriceTiers.mockReset();
  products = [];
  tierRows = [];
});

it("reconoce papelería con o sin acento", () => {
  expect(isStationery("Papelería")).toBe(true);
  expect(isStationery("papeleria")).toBe(true);
  expect(isStationery("Gran formato")).toBe(false);
});

it("crear papelería: sin precios, sin recuadro de texto y sin casilla de activo; se guarda inactivo", async () => {
  const user = userEvent.setup();
  render(<ProductsPage />);
  await user.click(await screen.findByRole("button", { name: "+ Producto" }));
  expect(screen.getByLabelText(/Precio menudeo/)).toBeInTheDocument(); // Gran formato

  fireEvent.change(screen.getByLabelText(/^Categoría/), { target: { value: "c-pap" } });
  expect(screen.queryByLabelText(/Precio menudeo/)).toBeNull();
  expect(screen.queryByLabelText(/Precio mayoreo/)).toBeNull();
  expect(screen.queryByLabelText(/Cantidad mínima para mayoreo/)).toBeNull();
  expect(screen.queryByTestId("stationery-note")).toBeNull();
  expect(screen.queryByTestId("product-active")).toBeNull();
  expect(screen.queryByTestId("stationery-inactive-note")).toBeNull();
  expect(screen.queryByTestId("price-tiers")).toBeNull(); // la tabla aparece al editar

  fireEvent.change(screen.getByLabelText(/^SKU/), { target: { value: "P-VOL" } });
  fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Volantes" } });
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
  expect(insert.mock.calls[0]![0]).toMatchObject({
    sku: "P-VOL", category_id: "c-pap", retail_price: null, wholesale_price: null, wholesale_min_qty: null, is_active: false,
  });
});

it("editar papelería: tabla de precios por cantidad con mínimos automáticos, errores y activación", async () => {
  const user = userEvent.setup();
  products = [stationeryProduct];
  setPriceTiers.mockResolvedValue([]);
  render(<ProductsPage />);
  await user.click((await screen.findAllByRole("button", { name: "Editar" }))[0]!);

  // Sin filas: no se puede activar.
  expect(await screen.findByTestId("price-tiers-empty")).toBeInTheDocument();
  expect(screen.getByTestId("product-active")).toBeDisabled();
  expect(screen.getByTestId("stationery-inactive-note")).toBeInTheDocument();

  // Fila 1: mínimo 0, máximo 100, $1.50
  await user.click(screen.getByTestId("tier-add"));
  const maxes = () => screen.getAllByTestId("tier-max") as HTMLInputElement[];
  const prices = () => screen.getAllByTestId("tier-price") as HTMLInputElement[];
  const mins = () => screen.getAllByTestId("tier-min").map((m) => m.textContent);
  expect(mins()).toEqual(["0"]);
  // Con la última fila sin máximo no se puede agregar otra.
  fireEvent.change(prices()[0]!, { target: { value: "1.5" } });
  expect(screen.getByTestId("tier-add")).toBeDisabled();
  fireEvent.change(maxes()[0]!, { target: { value: "100" } });
  expect(screen.getByTestId("tier-add")).toBeEnabled();

  // Fila 2: mínimo 101 automático
  await user.click(screen.getByTestId("tier-add"));
  expect(mins()).toEqual(["0", "101"]);
  // Máximo menor al anterior: error
  fireEvent.change(maxes()[1]!, { target: { value: "90" } });
  expect(screen.getByText("Debe ser al menos 101.")).toBeInTheDocument();
  fireEvent.change(maxes()[1]!, { target: { value: "200" } });
  fireEvent.change(prices()[1]!, { target: { value: "2" } });
  expect(screen.getByText(/más caro que la fila anterior/)).toBeInTheDocument(); // solo aviso
  fireEvent.change(prices()[1]!, { target: { value: "1" } });

  // Fila 3 sin máximo: mínimo 201
  await user.click(screen.getByTestId("tier-add"));
  fireEvent.change(prices()[2]!, { target: { value: "0.8" } });
  expect(mins()).toEqual(["0", "101", "201"]);

  // Quitar la fila de en medio: el mínimo de la última se recalcula a 101.
  await user.click(screen.getByRole("button", { name: "Quitar la fila 2" }));
  expect(mins()).toEqual(["0", "101"]);

  // Una fila intermedia sin máximo marca error y no deja guardar.
  await user.click(screen.getByRole("button", { name: "Quitar la fila 2" }));
  fireEvent.change(maxes()[0]!, { target: { value: "" } });
  expect(screen.getByTestId("tier-add")).toBeDisabled();
  fireEvent.change(maxes()[0]!, { target: { value: "100" } });
  await user.click(screen.getByTestId("tier-add"));
  fireEvent.change(prices()[1]!, { target: { value: "1" } });
  fireEvent.change(maxes()[0]!, { target: { value: "" } });
  expect(screen.getByText("Solo la última fila puede quedar sin máximo.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Revise la tabla de precios por cantidad");
  expect(setPriceTiers).not.toHaveBeenCalled();
  fireEvent.change(maxes()[0]!, { target: { value: "100" } });

  // Con filas ya se puede activar; al guardar va primero la tabla y luego el producto.
  expect(screen.getByTestId("product-active")).toBeEnabled();
  await user.click(screen.getByTestId("product-active"));
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  expect(setPriceTiers).toHaveBeenCalledWith("p-tar", [
    { max_qty: 100, price: "1.5" },
    { max_qty: null, price: "1" },
  ]);
  expect(update.mock.calls[0]![0]).toMatchObject({ is_active: true, retail_price: null });
});

it("editar papelería: carga la tabla guardada", async () => {
  const user = userEvent.setup();
  products = [stationeryProduct];
  tierRows = [{ max_qty: 100, price: "1.50" }, { max_qty: null, price: "1.00" }];
  render(<ProductsPage />);
  await user.click((await screen.findAllByRole("button", { name: "Editar" }))[0]!);
  await screen.findByTestId("price-tiers");
  expect(screen.getAllByTestId("tier-min").map((m) => m.textContent)).toEqual(["0", "101"]);
  expect((screen.getAllByTestId("tier-price") as HTMLInputElement[]).map((i) => i.value)).toEqual(["1.5", "1"]);
  expect(screen.getByTestId("product-active")).toBeEnabled();
});
