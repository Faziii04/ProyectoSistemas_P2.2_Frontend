import { formatCurrency, formatDate, formatNumber, formatPercent } from "./format";
import type { Customer, CustomerType, PaymentMethod, Product, Sale, SaleStatus, StockAlert } from "./types";

export type Tone = "neutral" | "ok" | "warning" | "danger" | "info";

export const customerTypeLabels: Record<CustomerType, string> = {
  regular: "Regular",
  mayorista: "Mayorista",
  vip: "VIP",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

export const saleStatusLabels: Record<SaleStatus, string> = {
  pagada: "Pagada",
  anulada: "Anulada",
};

export const categories = ["electronica", "hogar", "ropa", "alimentos", "otros"] as const;

/**
 * PATRÓN ADAPTER.
 * El backend entrega datos "crudos" (números, fechas ISO, enums en inglés);
 * el adaptador los transforma en modelos de presentación listos para la tabla:
 * textos ya formateados y un tono visual. Los componentes no formatean nada.
 */
export interface ProductView extends Product {
  priceLabel: string;
  stockLabel: string;
  stockTone: Tone;
  availabilityLabel: string;
}

export const adaptProduct = (product: Product): ProductView => ({
  ...product,
  priceLabel: formatCurrency(product.price),
  stockLabel: `${formatNumber(product.stock)} / mín. ${formatNumber(product.minStock)}`,
  stockTone: product.stock <= 0 ? "danger" : product.lowStock ? "warning" : "ok",
  availabilityLabel: product.lowStock ? "Reponer" : "Disponible",
});

export interface CustomerView extends Customer {
  typeLabel: string;
  typeTone: Tone;
  createdLabel: string;
}

export const adaptCustomer = (customer: Customer): CustomerView => ({
  ...customer,
  typeLabel: customerTypeLabels[customer.type] ?? customer.type,
  typeTone: customer.type === "vip" ? "info" : customer.type === "mayorista" ? "ok" : "neutral",
  createdLabel: formatDate(customer.createdAt),
});

export interface SaleView extends Sale {
  totalLabel: string;
  subtotalLabel: string;
  discountLabel: string;
  taxLabel: string;
  dateLabel: string;
  statusLabel: string;
  statusTone: Tone;
  paymentLabel: string;
  itemCount: number;
  customerTypeLabel: string;
}

export const adaptSale = (sale: Sale): SaleView => ({
  ...sale,
  totalLabel: formatCurrency(sale.total),
  subtotalLabel: formatCurrency(sale.subtotal),
  discountLabel: sale.discount > 0 ? `- ${formatCurrency(sale.discount)} (${formatPercent(sale.discountRate)})` : "—",
  taxLabel: formatCurrency(sale.tax),
  dateLabel: formatDate(sale.createdAt),
  statusLabel: saleStatusLabels[sale.status] ?? sale.status,
  statusTone: sale.status === "pagada" ? "ok" : "danger",
  paymentLabel: paymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod,
  itemCount: sale.items.reduce((total, line) => total + line.quantity, 0),
  customerTypeLabel: customerTypeLabels[sale.customerType] ?? sale.customerType,
});

export interface AlertView extends StockAlert {
  createdLabel: string;
  tone: Tone;
}

export const adaptAlert = (alert: StockAlert): AlertView => ({
  ...alert,
  createdLabel: formatDate(alert.createdAt),
  tone: alert.acknowledged ? "neutral" : "warning",
});
