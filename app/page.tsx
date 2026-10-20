"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adaptAlert, adaptSale, type AlertView, type SaleView } from "@/lib/adapters";
import { salesApi } from "@/lib/api";
import { describeError } from "@/lib/api-client";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { Alert, Badge, Button, Card, Empty, Spinner, Stat } from "./components/ui";

export default function DashboardPage() {
  const [summary, setSummary] = useState<Dashboard | null>(null);
  const [alerts, setAlerts] = useState<AlertView[]>([]);
  const [recentSales, setRecentSales] = useState<SaleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboard, alertList] = await Promise.all([salesApi.dashboard(), salesApi.alerts(6)]);
      setSummary(dashboard);
      setAlerts(alertList.map(adaptAlert));
      setRecentSales(dashboard.recentSales.map(adaptSale));
    } catch (loadError) {
      setError(describeError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seedDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      await salesApi.seed();
      await load();
    } catch (seedError) {
      setError(describeError(seedError));
    } finally {
      setBusy(false);
    }
  };

  const acknowledge = async (id: string) => {
    try {
      await salesApi.acknowledgeAlert(id);
      setAlerts((current) => current.map((item) => (item.id === id ? { ...item, acknowledged: true } : item)));
    } catch (ackError) {
      setError(describeError(ackError));
    }
  };

  if (loading && !summary) return <Spinner label="Consultando la base de datos Convex…" />;

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          {error}{" "}
          <button type="button" onClick={() => void load()} className="font-semibold underline">
            Reintentar
          </button>
        </Alert>
      )}

      {summary && summary.products.total === 0 && (
        <Card title="Base de datos vacía" subtitle="Carga el catálogo de demostración para empezar.">
          <Button onClick={() => void seedDemo()} disabled={busy}>
            {busy ? "Cargando…" : "Cargar datos de demostración"}
          </Button>
        </Card>
      )}

      {summary && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Productos activos"
              value={formatNumber(summary.products.active)}
              hint={`${formatNumber(summary.products.lowStock)} con stock bajo`}
              tone={summary.products.lowStock > 0 ? "warning" : "neutral"}
            />
            <Stat
              label="Valor del inventario"
              value={formatCurrency(summary.products.inventoryValue)}
              hint={`${formatNumber(summary.customers.active)} clientes activos`}
            />
            <Stat
              label="Ventas de hoy"
              value={formatNumber(summary.sales.todayCount)}
              hint={formatCurrency(summary.sales.todayRevenue)}
            />
            <Stat
              label="Ingresos acumulados"
              value={formatCurrency(summary.sales.revenue)}
              hint={`Ticket promedio ${formatCurrency(summary.sales.averageTicket)}`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Productos por reponer"
              subtitle="Stock en o por debajo del mínimo"
              actions={
                <Link href="/productos" className="text-xs font-semibold text-emerald-700 hover:underline">
                  Ver catálogo
                </Link>
              }
            >
              {summary.lowStock.length === 0 ? (
                <Empty>Todo el inventario está por encima del mínimo.</Empty>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Stock</th>
                      <th>Faltan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.lowStock.map((item) => (
                      <tr key={item.productId}>
                        <td className="font-mono text-xs text-zinc-500">{item.sku}</td>
                        <td className="font-medium">{item.name}</td>
                        <td>
                          <Badge tone={item.stock === 0 ? "danger" : "warning"}>
                            {item.stock} / {item.minStock}
                          </Badge>
                        </td>
                        <td className="text-zinc-500">{item.missing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Más vendidos" subtitle="Unidades acumuladas en ventas pagadas">
              {summary.topProducts.length === 0 ? (
                <Empty>Aún no hay ventas registradas.</Empty>
              ) : (
                <ul className="space-y-2">
                  {summary.topProducts.map((product, index) => (
                    <li
                      key={product.sku}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">{product.name}</span>
                      </span>
                      <Badge tone="ok">{product.quantity} u.</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card
            title="Ventas recientes"
            subtitle="Últimos movimientos registrados"
            actions={
              <Link href="/ventas" className="text-xs font-semibold text-emerald-700 hover:underline">
                Ir a caja
              </Link>
            }
          >
            {recentSales.length === 0 ? (
              <Empty>Registra la primera venta desde la pantalla de Ventas.</Empty>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="font-mono text-xs">{sale.number}</td>
                      <td>
                        <div className="font-medium">{sale.customerName}</div>
                        <div className="text-xs text-zinc-500">{sale.customerTypeLabel}</div>
                      </td>
                      <td className="text-zinc-500">{sale.dateLabel}</td>
                      <td className="font-semibold">{sale.totalLabel}</td>
                      <td>
                        <Badge tone={sale.statusTone}>{sale.statusLabel}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Alertas de stock" subtitle="Generadas por el patrón Observer al vender o ajustar inventario">
            {alerts.length === 0 ? (
              <Empty>Todavía no se han generado alertas.</Empty>
            ) : (
              <ul className="space-y-2">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {alert.productName} <span className="font-mono text-xs text-zinc-500">{alert.sku}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        Quedan {alert.stock} unidades (mínimo {alert.minStock}) · origen: {alert.source} ·{" "}
                        {alert.createdLabel}
                      </p>
                    </div>
                    {alert.acknowledged ? (
                      <Badge tone="neutral">Reconocida</Badge>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => void acknowledge(alert.id)}>
                        Reconocer
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
