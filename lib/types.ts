/** Contratos que expone el backend ASP.NET Core (camelCase). */

export type CustomerType = "regular" | "mayorista" | "vip";
export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia";
export type DiscountStrategyKey = "ninguno" | "cliente" | "volumen" | "mejor";
export type SaleStatus = "pagada" | "anulada";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  active: boolean;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  document: string;
  name: string;
  email: string;
  phone: string;
  type: CustomerType;
  active: boolean;
  createdAt: string;
}

export interface SaleLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  items: SaleLine[];
  subtotal: number;
  discountRate: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  createdAt: string;
}

export interface LowStockItem {
  productId: string;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  missing: number;
}

export interface TopProduct {
  sku: string;
  name: string;
  quantity: number;
}

export interface StockAlert {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  stock: number;
  minStock: number;
  source: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface Dashboard {
  products: { total: number; active: number; lowStock: number; inventoryValue: number };
  customers: { total: number; active: number };
  sales: {
    total: number;
    paid: number;
    cancelled: number;
    revenue: number;
    todayRevenue: number;
    todayCount: number;
    averageTicket: number;
  };
  topProducts: TopProduct[];
  recentSales: Sale[];
  lowStock: LowStockItem[];
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
}

export interface CreateCustomerInput {
  document: string;
  name: string;
  email: string;
  phone: string;
  type: CustomerType;
}

export interface CreateSaleInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  discountStrategy: DiscountStrategyKey;
  taxRate: number;
}

/** Cuerpo estándar de error del backend. */
export interface ApiErrorBody {
  error: string;
  message: string;
  details?: { field: string; message: string }[] | unknown;
}
