"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adaptCustomer, adaptProduct, adaptSale, type CustomerView, type ProductView, type SaleView } from "@/lib/adapters";
import { salesApi } from "@/lib/api";
import { describeError } from "@/lib/api-client";
import { cartStore, useCartItems } from "@/lib/cart-store";
import { discountStrategyList, estimateTotals, getDiscountStrategy } from "@/lib/discount-strategies";
import { formatCurrency } from "@/lib/format";
import { SaleDraftBuilder } from "@/lib/sale-builder";
import type { DiscountStrategyKey, PaymentMethod, Product } from "@/lib/types";
import { Alert, Badge, Button, Card, Empty, Field, Spinner, inputClass } from "../components/ui";

const taxRate = 0.19;

export default function SalesPage() {
  const items = useCartItems();

  const [products, setProducts] = useState<ProductView[]>([]);
  const [customers, setCustomers] = useState<CustomerView[]>([]);
  const [sales, setSales] = useState<SaleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [strategyKey, setStrategyKey] = useState<DiscountStrategyKey>("mejor");
  const [productSearch, setProductSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productList, customerList, saleList] = await Promise.all([
        salesApi.listProducts(),
        salesApi.listCustomers(),
        salesApi.listSales({ limit: 20 }),
      ]);
      setProducts(productList.map(adaptProduct));
      setCustomers(customerList.map(adaptCustomer));
      setSales(saleList.map(adaptSale));
    } catch (loadError) {
      setError(describeError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const units = items.reduce((total, item) => total + item.quantity, 0);
  const strategy = getDiscountStrategy(strategyKey);
  const totals = estimateTotals(
    { customerType: selectedCustomer?.type ?? "regular", subtotal, units },
    strategyKey,
    taxRate,
  );

  const available = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products
      .filter((product) => product.active && product.stock > 0)
      .filter((product) =>
        term
          ? product.name.toLowerCase().includes(term) ||
            product.sku.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term)
          : true,
      )
      .slice(0, 8);
  }, [products, productSearch]);

  const addToCart = (product: Product) => {
    cartStore.add(product);
    setMessage(null);
  };

  const checkout = async () => {
    setError(null);
    setMessage(null);

    try {
      const draft = new SaleDraftBuilder()
        .forCustomer(customerId)
        .withPaymentMethod(paymentMethod)
        .withDiscountStrategy(strategyKey)
        .withTaxRate(taxRate)
        .addFromCart(items)
        .build();

      setSaving(true);
      const sale = await salesApi.checkout(draft);
      cartStore.clear();
      setCustomerId("");
      setMessage(`Venta ${sale.number} registrada por ${formatCurrency(sale.total)}.`);
      await load();
    } catch (checkoutError) {
      setError(describeError(checkoutError));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (sale: SaleView) => {
    if (!window.confirm(`¿Anular la venta ${sale.number}? El stock se devuelve al inventario.`)) return;

    try {
      await salesApi.cancelSale(sale.id);
      await load();
    } catch (cancelError) {
      setError(describeError(cancelError));
    }
  };

  if (loading) return <Spinner label="Cargando caja registradora…" />;

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      {message && <Alert tone="ok">{message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Nueva venta" subtitle="Seleccione el cliente y agregue productos al carrito">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente">
                <select className={inputClass} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                  <option value="">— Seleccione un cliente —</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.typeLabel}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Medio de pago">
                <select
                  className={inputClass}
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </Field>
            </div>

            {selectedCustomer && (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <Badge tone={selectedCustomer.typeTone}>{selectedCustomer.typeLabel}</Badge>
                {selectedCustomer.email}
              </div>
            )}
          </Card>

          <Card title="Productos" subtitle="Busque y agregue unidades al carrito">
            <input
              className={inputClass}
              placeholder="Buscar producto por nombre, SKU o categoría"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
            />

            <ul className="mt-3 space-y-2">
              {available.length === 0 ? (
                <Empty>No hay productos disponibles con ese criterio.</Empty>
              ) : (
                available.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {product.name} <span className="font-mono text-xs text-zinc-400">{product.sku}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {product.priceLabel} · stock {product.stock}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => addToCart(product)}>
                      Agregar
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card
            title="Carrito"
            subtitle={`${items.length} líneas · ${units} unidades`}
            actions={
              items.length > 0 ? (
                <Button size="sm" variant="ghost" onClick={() => cartStore.clear()}>
                  Vaciar
                </Button>
              ) : undefined
            }
          >
            {items.length === 0 ? (
              <Empty>El carrito está vacío.</Empty>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.product.id}>
                      <td>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="font-mono text-xs text-zinc-400">{item.product.sku}</div>
                      </td>
                      <td>{formatCurrency(item.product.price)}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(event) => cartStore.setQuantity(item.product.id, Number(event.target.value))}
                          className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="font-semibold">{formatCurrency(item.product.price * item.quantity)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => cartStore.remove(item.product.id)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Resumen y cobro" subtitle="El total definitivo lo calcula el servidor">
            <Field label="Estrategia de descuento">
              <select
                className={inputClass}
                value={strategyKey}
                onChange={(event) => setStrategyKey(event.target.value as DiscountStrategyKey)}
              >
                {discountStrategyList.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <p className="mt-1 text-xs text-zinc-500">{strategy.description}</p>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd className="font-medium">{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Descuento {totals.discountRate > 0 ? `(${Math.round(totals.discountRate * 100)} %)` : ""}</dt>
                <dd className="font-medium text-emerald-700">- {formatCurrency(totals.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">IVA 19 %</dt>
                <dd className="font-medium">{formatCurrency(totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base">
                <dt className="font-semibold">Total estimado</dt>
                <dd className="font-bold">{formatCurrency(totals.total)}</dd>
              </div>
            </dl>

            <Button
              className="mt-4 w-full"
              onClick={() => void checkout()}
              disabled={saving || items.length === 0 || !customerId}
            >
              {saving ? "Registrando…" : "Registrar venta"}
            </Button>

            {!customerId && <p className="mt-2 text-xs text-amber-600">Seleccione un cliente para continuar.</p>}
          </Card>
        </div>
      </div>

      <Card title="Historial de ventas" subtitle="Las ventas anuladas devuelven el stock al inventario">
        {sales.length === 0 ? (
          <Empty>Aún no hay ventas registradas.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Ítems</th>
                  <th>Subtotal</th>
                  <th>Descuento</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-mono text-xs">{sale.number}</td>
                    <td className="font-medium">{sale.customerName}</td>
                    <td className="text-zinc-600">{sale.itemCount}</td>
                    <td>{sale.subtotalLabel}</td>
                    <td className="text-emerald-700">{sale.discountLabel}</td>
                    <td className="font-semibold">{sale.totalLabel}</td>
                    <td className="text-zinc-600">{sale.paymentLabel}</td>
                    <td>
                      <Badge tone={sale.statusTone}>{sale.statusLabel}</Badge>
                    </td>
                    <td className="text-xs text-zinc-500">{sale.dateLabel}</td>
                    <td className="text-right">
                      {sale.status === "pagada" && (
                        <Button size="sm" variant="ghost" onClick={() => void cancel(sale)}>
                          Anular
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
