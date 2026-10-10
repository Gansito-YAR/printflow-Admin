// Lista de precios (ADM-09). Los pedidos ya creados conservan su precio
// (order_items guarda el precio aplicado), así que editar aquí no altera el pasado.

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { fetchCategories, fetchProducts } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import type { Product, ProductCategory, PricingUnit } from "../../lib/types";
import { UNIT_LABEL } from "../../lib/types";
import { formatMoney, isGreater, parseAmountInput } from "../../utils/money";
import { Button, EmptyState, ErrorPanel, Modal, SelectField, Spinner, TextField } from "../../components/ui";
import { DataList } from "../../components/DataList";
import { parseQuantity } from "../../utils/quantity";
import { RecipeModal } from "./RecipeModal";
import { CategoriesModal, createCategory } from "./CategoriesModal";

export function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [recipeOf, setRecipeOf] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [managing, setManaging] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await fetchCategories(false));
    } catch (err) {
      toast.error(toAppError(err).userText);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [products] = await Promise.all([fetchProducts(false), loadCategories()]);
      setRows(products);
      setError(null);
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setLoading(false);
    }
  }, [loadCategories]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-normal tracking-wide text-ink-strong">Productos y precios</h1>
          <p className="text-sm text-ink-muted">Cambiar un precio no afecta pedidos ya creados.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => setManaging(true)} data-testid="manage-categories">
            Categorías
          </Button>
          <Button onClick={() => setEditing("new")}>+ Producto</Button>
        </div>
      </div>
      {error && <ErrorPanel message={error} onRetry={() => void load()} />}
      {loading ? (
        <Spinner label="Cargando…" />
      ) : rows.length === 0 ? (
        <EmptyState>Sin productos.</EmptyState>
      ) : (
        <DataList
          label="Productos"
          testId="products-table"
          rows={rows}
          rowKey={(p) => p.id}
          columns={[
            { key: "sku", header: "SKU", hideOnMobile: true, render: (p) => <span className="tabular">{p.sku}</span> },
            {
              key: "name",
              header: "Producto",
              primary: true,
              render: (p) => (
                <span className="font-semibold text-ink-strong">
                  {p.name}
                  {!p.is_active && <span className="ml-2 text-xs font-normal text-ink-muted md:hidden">(inactivo)</span>}
                </span>
              ),
            },
            { key: "cat", header: "Categoría", hideOnTablet: true, render: (p) => p.category?.name ?? "—" },
            { key: "unit", header: "Unidad", render: (p) => UNIT_LABEL[p.pricing_unit] },
            { key: "retail", header: "Menudeo", align: "right", render: (p) => <span className="tabular">{formatMoney(p.retail_price)}</span> },
            { key: "wholesale", header: "Mayoreo", align: "right", render: (p) => <span className="tabular">{formatMoney(p.wholesale_price)}</span> },
            { key: "min", header: "Mín. mayoreo", align: "right", hideOnTablet: true, render: (p) => <span className="tabular">{p.wholesale_min_qty ?? "—"}</span> },
            { key: "active", header: "Estado", hideOnMobile: true, render: (p) => (p.is_active ? "Activo" : "Inactivo") },
          ]}
          actions={(p) => (
            <>
              <Button variant="secondary" className="md:border-transparent md:bg-transparent" onClick={() => setRecipeOf(p)}>
                Receta y costo
              </Button>
              <Button variant="secondary" className="md:border-transparent md:bg-transparent" onClick={() => setEditing(p)}>
                Editar
              </Button>
            </>
          )}
        />
      )}
      {managing && (
        <CategoriesModal
          categories={categories}
          products={rows}
          onChanged={() => void load()}
          onClose={() => setManaging(false)}
        />
      )}
      {recipeOf && <RecipeModal product={recipeOf} onClose={() => setRecipeOf(null)} />}
      {editing && (
        <Modal title={editing === "new" ? "Producto nuevo" : "Editar producto"} onClose={() => setEditing(null)}>
          <ProductForm
            product={editing === "new" ? undefined : editing}
            categories={categories}
            onCategoryCreated={(c) => setCategories((list) => [...list, c])}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

const NEW_CATEGORY = "__nueva__";

function ProductForm({
  product,
  categories,
  onCategoryCreated,
  onSaved,
  onCancel,
}: {
  product?: Product;
  categories: ProductCategory[];
  onCategoryCreated: (c: ProductCategory) => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const selectable = categories.filter((c) => c.is_active || c.id === product?.category_id);
  const [categoryId, setCategoryId] = useState<string>(product?.category_id ?? selectable[0]?.id ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  async function onCreateCategory() {
    setCreatingCategory(true);
    const result = await createCategory(newCategory, categories);
    setCreatingCategory(false);
    if (!result.ok) return setCategoryError(result.error);
    onCategoryCreated(result.category);
    setCategoryId(result.category.id);
    setNewCategory("");
    toast.success(`Categoría «${result.category.name}» creada.`);
  }
  const [unit, setUnit] = useState<PricingUnit>(product?.pricing_unit ?? "UNIT");
  const [retail, setRetail] = useState(product?.retail_price ?? "");
  const [wholesale, setWholesale] = useState(product?.wholesale_price ?? "");
  const [minQty, setMinQty] = useState(product?.wholesale_min_qty ?? "");
  const [fixedCost, setFixedCost] = useState(product?.fixed_cost ?? "0");
  const [active, setActive] = useState(product?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const r = parseAmountInput(retail);
    const w = parseAmountInput(wholesale);
    const m = minQty.trim() ? parseAmountInput(minQty) : null;
    if (!sku.trim() || !name.trim()) return setError("SKU y nombre son obligatorios.");
    if (!categoryId || categoryId === NEW_CATEGORY) return setError("Elija una categoría o termine de crear la nueva.");
    if (!r.ok) return setError(`Menudeo: ${r.error}`);
    if (!w.ok) return setError(`Mayoreo: ${w.error}`);
    if (isGreater(w.value, r.value)) return setError("El precio de mayoreo no puede ser mayor al de menudeo.");
    if (m && !m.ok) return setError(`Mínimo de mayoreo: ${m.error}`);
    const fc = parseQuantity(fixedCost || "0", { allowZero: true, label: "El costo fijo" });
    if (!fc.ok) return setError(fc.error);

    inFlight.current = true;
    setSaving(true);
    setError(null);
    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      category_id: categoryId,
      // La unidad de cobro no se cambia tras crear el producto.
      ...(product ? {} : { pricing_unit: unit }),
      retail_price: r.value,
      wholesale_price: w.value,
      wholesale_min_qty: m && m.ok ? m.value : null,
      fixed_cost: fc.value,
      is_active: active,
    };
    const result = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    inFlight.current = false;
    setSaving(false);
    if (result.error) {
      const appError = toAppError(result.error);
      setError(appError.code === "DUPLICATE" ? "Ya existe un producto con ese SKU." : appError.userText);
      return;
    }
    toast.success("Producto guardado.");
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} disabled={saving} required />
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} required />
        <div className="flex flex-col gap-2">
          <SelectField
            label="Categoría"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setCategoryError(null);
            }}
            disabled={saving}
            data-testid="product-category"
          >
            {selectable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? "" : " (inactiva)"}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ Nueva categoría…</option>
          </SelectField>
          {categoryId === NEW_CATEGORY && (
            <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-1 p-3">
              <TextField
                label="Nombre de la nueva categoría"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setCategoryError(null);
                }}
                onKeyDown={(e) => {
                  // Dentro del formulario de producto: Enter crea la categoría, no guarda el producto.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onCreateCategory();
                  }
                }}
                maxLength={40}
                error={categoryError}
                autoFocus
                data-testid="new-category-name"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCategoryId(selectable[0]?.id ?? "");
                    setNewCategory("");
                    setCategoryError(null);
                  }}
                  disabled={creatingCategory}
                >
                  Cancelar
                </Button>
                <Button loading={creatingCategory} onClick={() => void onCreateCategory()} data-testid="create-category">
                  Crear categoría
                </Button>
              </div>
            </div>
          )}
        </div>
        <SelectField
          label="Unidad de cobro"
          value={unit}
          onChange={(e) => setUnit(e.target.value as PricingUnit)}
          disabled={saving || Boolean(product)}
        >
          {(Object.keys(UNIT_LABEL) as PricingUnit[]).map((u) => (
            <option key={u} value={u}>
              {UNIT_LABEL[u]}
            </option>
          ))}
        </SelectField>
        <TextField label="Precio menudeo" inputMode="decimal" value={retail} onChange={(e) => setRetail(e.target.value)} disabled={saving} required />
        <TextField label="Precio mayoreo" inputMode="decimal" value={wholesale} onChange={(e) => setWholesale(e.target.value)} disabled={saving} required />
        <TextField
          label="Cantidad mínima para mayoreo"
          inputMode="decimal"
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          hint="Vacío = solo clientes de tarifa Mayoreo."
          disabled={saving}
        />
        <TextField
          label={`Costo fijo por ${unit === "M2" ? "m²" : "pieza"}`}
          inputMode="decimal"
          value={fixedCost}
          onChange={(e) => setFixedCost(e.target.value)}
          hint="Mano de obra, energía, desgaste de máquina. Confidencial."
          disabled={saving}
        />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-ink-strong md:min-h-0 md:gap-2">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving} />
        Producto activo (visible al capturar pedidos)
      </label>
      {error && (
        <p role="alert" className="text-sm font-semibold text-blocked-ink">
          [!] {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
