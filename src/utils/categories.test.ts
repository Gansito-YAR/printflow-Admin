import { describe, expect, it } from "vitest";
import { groupByCategory } from "./categories";
import type { Product } from "../lib/types";

const p = (id: string, cat: { id: string; name: string; sort_order: number }): Product =>
  ({ id, name: id, category_id: cat.id, category: cat }) as unknown as Product;

describe("groupByCategory", () => {
  it("agrupa por categoría en su orden configurado", () => {
    const papel = { id: "c2", name: "Papelería", sort_order: 20 };
    const gran = { id: "c1", name: "Gran formato", sort_order: 10 };
    const groups = groupByCategory([p("tarjetas", papel), p("lona", gran), p("flyer", papel)]);
    expect(groups.map((g) => g.name)).toEqual(["Gran formato", "Papelería"]);
    expect(groups[1]!.products.map((x) => x.id)).toEqual(["tarjetas", "flyer"]);
  });
});
