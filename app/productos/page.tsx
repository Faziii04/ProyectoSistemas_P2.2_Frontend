"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adaptProduct, categories, type ProductView } from "@/lib/adapters";
import { salesApi } from "@/lib/api";
import { describeError } from "@/lib/api-client";
import type { Product } from "@/lib/types";
import {
  FormErrors,
  parseProductForm,
  productFormValidation,
  type FieldError,
  type ProductFormValues,
} from "@/lib/validation";
import { Alert, Badge, Button, Card, Empty, Field, Modal, Spinner, inputClass } from "../components/ui";

const emptyForm: ProductFormValues = {
  sku: "",
  name: "",
  description: "",
  category: "electronica",
  price: "",
  stock: "0",
  minStock: "0",
};

const toForm = (product: Product): ProductFormValues => ({
  sku: product.sku,
  name: product.name,
  description: product.description,
  category: product.category,
  price: String(product.price),
  stock: String(product.stock),
  minStock: String(product.minStock),
});

const byField = (errors: FieldError[]): Record<string, string> =>
  errors.reduce<Record<string, string>>((accumulator, error) => {
    accumulator[error.field] ??= error.message;
    return accumulator;
  }, {});

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductView[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState("10");
  const [stockError, setStockError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi.listProducts({ q: search, category, includeInactive });
      setProducts(data.map(adaptProduct));
    } catch (loadError) {
      setError(describeError(loadError));
    } finally {
      setLoading(false);
    }
  }, [search, category, includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm(toForm(product));
    setFormErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      productFormValidation.ensureValid(form);
    } catch (validationError) {
      if (validationError instanceof FormErrors) {
        setFormErrors(byField(validationError.errors));
        return;
      }
      throw validationError;
    }

    setFormErrors({});
    setSaving(true);
    try {
      const payload = parseProductForm(form);
      if (editing) {
        await salesApi.updateProduct(editing.id, payload);
      } else {
        await salesApi.createProduct(payload);
      }
      setFormOpen(false);
      await load();
    } catch (saveError) {
      setFormError(describeError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: ProductView) => {
    if (!window.confirm(`¿Eliminar el producto ${product.sku}?`)) return;

    try {
      await salesApi.deleteProduct(product.id);
      await load();
    } catch (deleteError) {
      setError(describeError(deleteError));
    }
  };

  const adjustStock = async () => {
    if (!stockProduct) return;

    const delta = Number(stockDelta);
    if (!Number.isInteger(delta) || delta === 0) {
      setStockError("El ajuste debe ser un número entero distinto de cero.");
      return;
    }

    try {
      await salesApi.adjustStock(stockProduct.id, delta);
      setStockProduct(null);
      setStockError(null);
      await load();
    } catch (adjustError) {
      setStockError(describeError(adjustError));
    }
  };

  const totalUnits = useMemo(() => products.reduce((total, product) => total + product.stock, 0), [products]);

  return (
    <div className="space-y-6">
      <Card
        title="Catálogo de productos"
        subtitle={`${products.length} productos · ${totalUnits} unidades en inventario`}
        actions={
          <Button onClick={openCreate} size="sm">
            Nuevo producto
          </Button>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input
            className={inputClass}
            placeholder="Buscar por SKU, nombre o categoría"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
            />
            Incluir inactivos
          </label>
        </div>

        {error && <Alert>{error}</Alert>}

        {loading ? (
          <Spinner label="Cargando productos…" />
        ) : products.length === 0 ? (
          <Empty>No hay productos que coincidan con el filtro.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="font-mono text-xs text-zinc-500">{product.sku}</td>
                    <td>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-zinc-500">{product.description || "Sin descripción"}</div>
                    </td>
                    <td className="capitalize text-zinc-600">{product.category}</td>
                    <td className="font-semibold">{product.priceLabel}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <Badge tone={product.stockTone}>{product.stockLabel}</Badge>
                        <span className="text-xs text-zinc-400">{product.availabilityLabel}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(product)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setStockProduct(product);
                            setStockDelta("10");
                            setStockError(null);
                          }}
                        >
                          Stock
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void remove(product)}>
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={formOpen} title={editing ? `Editar ${editing.sku}` : "Nuevo producto"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {formError && <Alert>{formError}</Alert>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU" error={formErrors.sku}>
              <input
                className={inputClass}
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
                placeholder="ELE-001"
              />
            </Field>
            <Field label="Categoría" error={formErrors.category}>
              <select
                className={inputClass}
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Nombre" error={formErrors.name}>
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          <Field label="Descripción" error={formErrors.description}>
            <input
              className={inputClass}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Precio" error={formErrors.price}>
              <input
                className={inputClass}
                inputMode="decimal"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
              />
            </Field>
            <Field label="Stock" error={formErrors.stock}>
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
              />
            </Field>
            <Field label="Stock mínimo" error={formErrors.minStock}>
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.minStock}
                onChange={(event) => setForm({ ...form, minStock: event.target.value })}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={stockProduct !== null}
        title={`Ajustar stock · ${stockProduct?.sku ?? ""}`}
        onClose={() => setStockProduct(null)}
      >
        <div className="space-y-3">
          {stockError && <Alert>{stockError}</Alert>}
          <p className="text-sm text-zinc-600">
            Stock actual: <strong>{stockProduct?.stock}</strong>. Use un valor positivo para ingresar unidades y
            negativo para descontarlas.
          </p>
          <Field label="Unidades">
            <input
              className={inputClass}
              inputMode="numeric"
              value={stockDelta}
              onChange={(event) => setStockDelta(event.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStockProduct(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void adjustStock()}>Aplicar ajuste</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
