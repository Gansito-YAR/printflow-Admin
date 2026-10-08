import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const restock = vi.fn();
const material = {
  id: "m1", sku: "M-LONA", name: "Lona 13 oz", unit: "M2", unit_cost: "12.0000",
  current_stock: "20.0000", min_stock: "25", is_active: true,
};
vi.mock("../../lib/queries", () => ({
  fetchMaterials: async () => [material],
  fetchKardex: async () => [],
}));
vi.mock("../../lib/rpc", () => ({ rpc: { restockMaterial: (...a: unknown[]) => restock(...a) } }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { MaterialsPage } from "./MaterialsPage";

beforeEach(() => restock.mockReset());

it("marca el stock bajo el mínimo", async () => {
  render(<MaterialsPage />);
  expect((await screen.findAllByText(/\[!\] 20 m²/)).length).toBeGreaterThan(0); // tabla y tarjeta
});

it("reabasto: doble envío = una llamada; reintento tras red usa la misma clave", async () => {
  const user = userEvent.setup();
  restock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  restock.mockResolvedValueOnce({ ...material, current_stock: "30.0000", unit_cost: "12.6667", duplicate: false });
  render(<MaterialsPage />);
  await user.click((await screen.findAllByRole("button", { name: "Reabastecer" }))[0]!);
  fireEvent.change(screen.getByLabelText(/Cantidad comprada/), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText(/Costo de compra/), { target: { value: "14" } });
  const form = screen.getByTestId("movement-form");
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(restock).toHaveBeenCalledTimes(1);
  await screen.findByText("Reintentar (seguro)");
  fireEvent.submit(form);
  await waitFor(() => expect(restock).toHaveBeenCalledTimes(2));
  expect(restock.mock.calls[0]![3]).toBe(restock.mock.calls[1]![3]);
  expect(restock.mock.calls[0]!.slice(0, 3)).toEqual(["m1", "10", "14"]);
});
