import type { CustomerType, DiscountStrategyKey } from "./types";

export interface DiscountContext {
  customerType: CustomerType;
  subtotal: number;
  units: number;
}

/**
 * PATRÓN STRATEGY.
 * Réplica en el cliente de las estrategias del backend para mostrar un
 * estimado en vivo mientras se arma la venta. El total definitivo siempre lo
 * calcula el servidor.
 */
export interface DiscountStrategy {
  key: DiscountStrategyKey;
  label: string;
  description: string;
  rate: (context: DiscountContext) => number;
}

const customerTypeRate = (context: DiscountContext): number => {
  if (context.customerType === "mayorista") return 0.1;
  if (context.customerType === "vip") return 0.15;
  return 0;
};

const volumeRate = (context: DiscountContext): number => (context.units >= 5 ? 0.05 : 0);

export const discountStrategies: Record<DiscountStrategyKey, DiscountStrategy> = {
  ninguno: {
    key: "ninguno",
    label: "Sin descuento",
    description: "Se cobra el precio de lista.",
    rate: () => 0,
  },
  cliente: {
    key: "cliente",
    label: "Por tipo de cliente",
    description: "Mayorista 10 %, VIP 15 %.",
    rate: customerTypeRate,
  },
  volumen: {
    key: "volumen",
    label: "Por volumen",
    description: "5 % desde 5 unidades.",
    rate: volumeRate,
  },
  mejor: {
    key: "mejor",
    label: "Mejor descuento",
    description: "Aplica el mayor entre cliente y volumen.",
    rate: (context) => Math.max(customerTypeRate(context), volumeRate(context)),
  },
};

export const discountStrategyList = Object.values(discountStrategies);

export const getDiscountStrategy = (key: DiscountStrategyKey): DiscountStrategy =>
  discountStrategies[key] ?? discountStrategies.mejor;

export interface Totals {
  subtotal: number;
  discountRate: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

/** Estimación local; el backend recalcula y devuelve los valores oficiales. */
export const estimateTotals = (context: DiscountContext, strategyKey: DiscountStrategyKey, taxRate = 0.19): Totals => {
  const rate = getDiscountStrategy(strategyKey).rate(context);
  const discount = Math.round(context.subtotal * rate * 100) / 100;
  const taxable = Math.round((context.subtotal - discount) * 100) / 100;
  const tax = Math.round(taxable * taxRate * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;

  return { subtotal: context.subtotal, discountRate: rate, discount, taxable, tax, total };
};
