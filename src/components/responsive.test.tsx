import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { DataList } from "./DataList";

vi.mock("../lib/queries", () => ({ fetchLowStockCount: async () => 2 }));
vi.mock("../store/auth", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ profile: { full_name: "Isaías" }, signOut: vi.fn() }),
}));

import { AdminShell } from "../layouts/AdminShell";

describe("DataList", () => {
  const rows = [
    { id: "1", folio: "PF-AAA", total: "$100.00" },
    { id: "2", folio: "PF-BBB", total: "$200.00" },
  ];
  const columns = [
    { key: "folio", header: "Folio", primary: true, render: (r: (typeof rows)[number]) => r.folio },
    { key: "total", header: "Total", align: "right" as const, render: (r: (typeof rows)[number]) => r.total },
  ];

  it("dibuja la tabla (md+) y las tarjetas (celular) con los mismos datos", () => {
    render(<DataList label="Pedidos" columns={columns} rows={rows} rowKey={(r) => r.id} testId="lista" />);
    const table = screen.getByTestId("lista");
    expect(within(table).getAllByRole("row")).toHaveLength(3); // encabezado + 2
    const cards = screen.getByTestId("lista-cards");
    expect(within(cards).getAllByRole("listitem")).toHaveLength(2);
    // En la tarjeta, el folio es el título y el total va como "Total: valor".
    expect(within(cards).getAllByText("Total")).toHaveLength(2);
    expect(within(cards).getByText("$200.00")).toBeInTheDocument();
  });

  it("muestra las acciones en ambos formatos", () => {
    render(
      <DataList
        label="Pedidos"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        testId="lista"
        actions={(r) => <button type="button">Editar {r.folio}</button>}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Editar PF-AAA" })).toHaveLength(2);
  });
});

describe("AdminShell (cajón de navegación)", () => {
  function renderShell() {
    return render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AdminShell />}>
            <Route index element={<p>Inicio</p>} />
            <Route path="clientes" element={<p>Pantalla de clientes</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it("abre con ☰, cierra con Esc y devuelve el foco al botón", async () => {
    const user = userEvent.setup();
    renderShell();
    const button = screen.getByTestId("open-menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(screen.getByTestId("nav-drawer")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(document.body).toHaveClass("scroll-locked");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("nav-drawer")).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass("scroll-locked");
    expect(button).toHaveFocus();
  });

  it("se cierra al elegir una opción y navega", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByTestId("open-menu"));
    await user.click(within(screen.getByTestId("nav-drawer")).getByRole("link", { name: "Clientes" }));
    expect(screen.queryByTestId("nav-drawer")).not.toBeInTheDocument();
    expect(screen.getByText("Pantalla de clientes")).toBeInTheDocument();
  });

  it("incluye cerrar sesión dentro del cajón (en celular no está en el encabezado)", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByTestId("open-menu"));
    expect(within(screen.getByTestId("nav-drawer")).getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });
});
