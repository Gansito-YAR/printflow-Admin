import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const setRecipe = vi.fn();
const simulate = vi.fn();
const materials = [
  { id: "m1", sku: "M-EST", name: "Estireno", unit: "UNIT", unit_cost: "2233.0000", current_stock: "5", min_stock: null, is_active: true },
  { id: "m2", sku: "M-COR", name: "Coroplast", unit: "UNIT", unit_cost: "900.0000", current_stock: "5", min_stock: null, is_active: true },
];
const simBase = {
  materials: [], has_recipe: false, material_count: 0, material_cost: "0.0000", fixed_cost: "0.00", unit_cost: "0.0000",
  retail_price: "750.00", wholesale_price: "600.00", retail_profit: "750.00", wholesale_profit: "600.00",
  retail_margin_pct: "100.00", wholesale_margin_pct: "100.00",
};
vi.mock("../../lib/queries", () => ({ fetchMaterials: async () => materials }));
vi.mock("../../lib/rpc", () => ({
  rpc: {
    simulateProductCost: (...a: unknown[]) => simulate(...a),
    setRecipe: (...a: unknown[]) => setRecipe(...a),
  },
}));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { RecipeModal } from "./RecipeModal";

const product = {
  id: "p1", sku: "SEN", name: "Señaletica", category_id: "c1", category: null, pricing_unit: "M2" as const,
  retail_price: "750.00", wholesale_price: "600.00", wholesale_min_qty: "5", is_active: true, fixed_cost: "0.00",
};

beforeEach(() => {
  setRecipe.mockReset();
  simulate.mockReset();
});

it("receta por prioridad: sin cantidad ni merma; guarda insumo y prioridad", async () => {
  simulate.mockResolvedValue(simBase);
  setRecipe.mockResolvedValue({ items: 2 });
  render(<RecipeModal product={product} onClose={() => {}} />);
  await screen.findByTestId("recipe-form");

  // Ya no existen los campos de cantidad y merma; no se muestra un margen de 100 % engañoso.
  expect(screen.queryByText(/Merma/)).toBeNull();
  expect(screen.queryByText(/por m² vendido/)).toBeNull();
  expect(screen.queryByText("100.00 %")).toBeNull();
  expect(screen.getByTestId("recipe-cost-pending")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "+ Insumo" }));
  fireEvent.click(screen.getByRole("button", { name: "+ Insumo" }));
  const insumos = screen.getAllByLabelText(/^Insumo/) as HTMLSelectElement[];
  const prioridades = screen.getAllByTestId("recipe-priority") as HTMLSelectElement[];
  expect(prioridades[0]!.value).toBe("REQUIRED"); // por defecto obligatorio
  fireEvent.change(insumos[0]!, { target: { value: "m1" } });
  fireEvent.change(insumos[1]!, { target: { value: "m2" } });
  fireEvent.change(prioridades[1]!, { target: { value: "OPTIONAL" } });

  fireEvent.submit(screen.getByTestId("recipe-form"));
  await waitFor(() => expect(setRecipe).toHaveBeenCalledTimes(1));
  expect(setRecipe.mock.calls[0]![1]).toEqual([
    { raw_material_id: "m1", priority: "REQUIRED" },
    { raw_material_id: "m2", priority: "OPTIONAL" },
  ]);
});

it("una receta anterior con cantidad la conserva al guardar", async () => {
  simulate.mockResolvedValue({
    ...simBase, has_recipe: true, material_count: 1,
    materials: [{ raw_material_id: "m1", name: "Estireno", unit: "UNIT", priority: "REQUIRED", quantity_required: "0.5000", waste_margin_pct: "5.00", unit_cost: "2233.0000", cost: "1172.3250" }],
  });
  setRecipe.mockResolvedValue({ items: 1 });
  render(<RecipeModal product={product} onClose={() => {}} />);
  const prioridad = (await screen.findAllByTestId("recipe-priority"))[0] as HTMLSelectElement;
  fireEvent.change(prioridad, { target: { value: "OPTIONAL" } });
  fireEvent.submit(screen.getByTestId("recipe-form"));
  await waitFor(() => expect(setRecipe).toHaveBeenCalledTimes(1));
  expect(setRecipe.mock.calls[0]![1]).toEqual([
    { raw_material_id: "m1", priority: "OPTIONAL", quantity_required: "0.5000", waste_margin_pct: "5.00" },
  ]);
});
