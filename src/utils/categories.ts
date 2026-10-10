// Agrupación de productos por categoría administrable (Plan Correcciones v2, C5).

import type { Product } from "../lib/types";

/** Agrupa productos por categoría, en el orden de la categoría y luego por nombre. */
export function groupByCategory(products: Product[]): { name: string; products: Product[] }[] {
  const groups = new Map<string, { name: string; order: number; products: Product[] }>();
  for (const p of products) {
    const key = p.category_id;
    const g = groups.get(key) ?? { name: p.category?.name ?? "Sin categoría", order: p.category?.sort_order ?? 9999, products: [] };
    g.products.push(p);
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "es"))
    .map(({ name, products }) => ({ name, products }));
}
