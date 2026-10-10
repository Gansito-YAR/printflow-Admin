// Administración de categorías de producto (Plan Correcciones v2, C5).
// Crear, renombrar, reordenar y activar/desactivar. No se borran: un producto o
// un reporte histórico puede seguir apuntando a una categoría desactivada.

import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, Check, Pencil, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { toAppError } from "../../lib/errors";
import type { Product, ProductCategory } from "../../lib/types";
import { Button, Modal, TextField } from "../../components/ui";

const CATEGORY_SELECT = "id, name, sort_order, is_active";
const MAX_NAME = 40;

function validateName(raw: string, categories: ProductCategory[], exceptId?: string): string | null {
  const name = raw.trim();
  if (!name) return "Escriba el nombre de la categoría.";
  if (name.length > MAX_NAME) return `Máximo ${MAX_NAME} caracteres.`;
  const clash = categories.find((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.toLowerCase());
  if (clash) return `Ya existe «${clash.name}»${clash.is_active ? "" : " (inactiva: reactívela en Categorías)"}.`;
  return null;
}

/** Crea una categoría al final del orden. La usan este modal y el formulario de producto. */
export async function createCategory(
  raw: string,
  categories: ProductCategory[],
): Promise<{ ok: true; category: ProductCategory } | { ok: false; error: string }> {
  const problem = validateName(raw, categories);
  if (problem) return { ok: false, error: problem };
  const nextOrder = Math.max(0, ...categories.map((c) => c.sort_order)) + 10;
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ name: raw.trim(), sort_order: nextOrder })
    .select(CATEGORY_SELECT)
    .single();
  if (error) {
    const appError = toAppError(error);
    return { ok: false, error: appError.code === "DUPLICATE" ? "Ya existe una categoría con ese nombre." : appError.userText };
  }
  return { ok: true, category: data as ProductCategory };
}

export function CategoriesModal({
  categories,
  products,
  onChanged,
  onClose,
}: {
  categories: ProductCategory[];
  products: Product[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
  const activeProducts = (id: string) => products.filter((p) => p.category_id === id && p.is_active).length;

  async function update(c: ProductCategory, changes: Partial<Pick<ProductCategory, "name" | "sort_order" | "is_active">>) {
    setBusy(c.id);
    const { error } = await supabase.from("product_categories").update(changes).eq("id", c.id);
    setBusy(null);
    if (error) {
      const appError = toAppError(error);
      toast.error(appError.code === "DUPLICATE" ? "Ya existe una categoría con ese nombre." : appError.userText);
      return false;
    }
    onChanged();
    return true;
  }

  async function onAdd() {
    setBusy("new");
    const result = await createCategory(newName, categories);
    setBusy(null);
    if (!result.ok) return setNewError(result.error);
    setNewName("");
    toast.success(`Categoría «${result.category.name}» creada.`);
    onChanged();
  }

  async function onRename(c: ProductCategory) {
    const problem = validateName(editName, categories, c.id);
    if (problem) return setEditError(problem);
    if (await update(c, { name: editName.trim() })) setEditingId(null);
  }

  // Intercambia el orden con la vecina (arriba o abajo).
  async function move(index: number, dir: -1 | 1) {
    const a = sorted[index];
    const b = sorted[index + dir];
    if (!a || !b) return;
    setBusy(a.id);
    const first = await supabase.from("product_categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    const second = first.error ? first : await supabase.from("product_categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    setBusy(null);
    if (second.error) toast.error(toAppError(second.error).userText);
    onChanged();
  }

  async function toggleActive(c: ProductCategory) {
    if (c.is_active) {
      const n = activeProducts(c.id);
      if (
        n > 0 &&
        !window.confirm(
          `«${c.name}» tiene ${n} producto${n === 1 ? "" : "s"} activo${n === 1 ? "" : "s"}. ` +
            "Seguirán funcionando, pero no podrá elegir esta categoría para productos nuevos. ¿Desactivar?",
        )
      )
        return;
    }
    if (await update(c, { is_active: !c.is_active })) toast.success(c.is_active ? "Categoría desactivada." : "Categoría reactivada.");
  }

  return (
    <Modal title="Categorías de producto" onClose={onClose} testId="categories-modal">
      <div className="flex flex-col gap-4">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void onAdd();
          }}
        >
          <div className="flex-1">
            <TextField
              label="Nueva categoría"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewError(null);
              }}
              maxLength={MAX_NAME}
              error={newError}
              placeholder="Ej. Rotulación, Señalética…"
              data-testid="category-new-name"
            />
          </div>
          <Button type="submit" loading={busy === "new"} className={newError ? "sm:mb-6" : ""}>
            Agregar
          </Button>
        </form>

        <ul className="flex flex-col divide-y divide-line rounded-md border border-line" data-testid="categories-list">
          {sorted.map((c, i) => (
            <li key={c.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              {editingId === c.id ? (
                <form
                  className="flex flex-1 items-start gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onRename(c);
                  }}
                >
                  <div className="flex-1">
                    <TextField
                      label={`Nuevo nombre para ${c.name}`}
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        setEditError(null);
                      }}
                      maxLength={MAX_NAME}
                      error={editError}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label="Guardar nombre"
                    className="mt-6 flex h-10 w-10 items-center justify-center rounded-md border border-line text-cleared-ink hover:bg-surface-2"
                  >
                    <Check size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancelar cambio de nombre"
                    onClick={() => setEditingId(null)}
                    className="mt-6 flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2"
                  >
                    <X size={18} aria-hidden />
                  </button>
                </form>
              ) : (
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={`font-semibold ${c.is_active ? "text-ink-strong" : "text-ink-muted line-through"}`}>{c.name}</span>
                  <span className="text-xs text-ink-muted">
                    {activeProducts(c.id)} producto{activeProducts(c.id) === 1 ? "" : "s"} activo{activeProducts(c.id) === 1 ? "" : "s"}
                    {c.is_active ? "" : " · inactiva"}
                  </span>
                </div>
              )}
              {editingId !== c.id && (
                <div className="flex items-center gap-1">
                  <IconButton label={`Subir ${c.name}`} onClick={() => void move(i, -1)} disabled={i === 0 || busy !== null}>
                    <ArrowUp size={16} aria-hidden />
                  </IconButton>
                  <IconButton label={`Bajar ${c.name}`} onClick={() => void move(i, 1)} disabled={i === sorted.length - 1 || busy !== null}>
                    <ArrowDown size={16} aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`Renombrar ${c.name}`}
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                      setEditError(null);
                    }}
                    disabled={busy !== null}
                  >
                    <Pencil size={16} aria-hidden />
                  </IconButton>
                  <Button variant="secondary" onClick={() => void toggleActive(c)} loading={busy === c.id} className="min-w-28">
                    {c.is_active ? "Desactivar" : "Reactivar"}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-muted">
          Las categorías no se borran: desactivar una la oculta al crear productos, pero conserva los productos y reportes que ya la usan.
        </p>
      </div>
    </Modal>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink-strong hover:bg-surface-2 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
