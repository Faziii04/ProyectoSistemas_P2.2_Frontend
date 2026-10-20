import { apiClient, type ApiClient } from "./api-client";
import type {
  CreateCustomerInput,
  CreateProductInput,
  CreateSaleInput,
  Customer,
  Dashboard,
  LowStockItem,
  Product,
  Sale,
  StockAlert,
} from "./types";

type QueryValue = string | number | boolean | undefined;

const query = (params: Record<string, QueryValue>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
};

/**
 * PATRÓN FACADE.
 * La interfaz de usuario nunca arma rutas ni cuerpos HTTP: llama a métodos con
 * intención de negocio ("guardar producto", "registrar venta"). El facade
 * conoce el cliente singleton por dentro y expone una superficie mínima.
 */
export class SalesApiFacade {
  constructor(private readonly client: ApiClient) {}

  health(): Promise<unknown> {
    return this.client.get("/api/health");
  }

  seed(): Promise<unknown> {
    return this.client.send("POST", "/api/seed");
  }

  /* ----------------------------- productos ----------------------------- */

  listProducts(filters: { q?: string; category?: string; includeInactive?: boolean } = {}): Promise<Product[]> {
    return this.client.get<Product[]>(`/api/products${query(filters)}`);
  }

  getProduct(id: string): Promise<Product> {
    return this.client.get<Product>(`/api/products/${id}`);
  }

  createProduct(input: CreateProductInput): Promise<Product> {
    return this.client.send<Product>("POST", "/api/products", input);
  }

  updateProduct(id: string, input: Partial<CreateProductInput> & { active?: boolean }): Promise<Product> {
    return this.client.send<Product>("PUT", `/api/products/${id}`, input);
  }

  deleteProduct(id: string): Promise<unknown> {
    return this.client.send("DELETE", `/api/products/${id}`);
  }

  adjustStock(id: string, delta: number): Promise<Product> {
    return this.client.send<Product>("POST", `/api/products/${id}/stock`, { delta });
  }

  /* ------------------------------ clientes ----------------------------- */

  listCustomers(filters: { q?: string; includeInactive?: boolean } = {}): Promise<Customer[]> {
    return this.client.get<Customer[]>(`/api/customers${query(filters)}`);
  }

  createCustomer(input: CreateCustomerInput): Promise<Customer> {
    return this.client.send<Customer>("POST", "/api/customers", input);
  }

  updateCustomer(id: string, input: Partial<CreateCustomerInput> & { active?: boolean }): Promise<Customer> {
    return this.client.send<Customer>("PUT", `/api/customers/${id}`, input);
  }

  deleteCustomer(id: string): Promise<unknown> {
    return this.client.send("DELETE", `/api/customers/${id}`);
  }

  /* ------------------------------- ventas ------------------------------ */

  listSales(filters: { limit?: number; status?: string } = {}): Promise<Sale[]> {
    return this.client.get<Sale[]>(`/api/sales${query(filters)}`);
  }

  /** Registra la venta: el carrito se transforma con el builder y se envía. */
  checkout(input: CreateSaleInput): Promise<Sale> {
    return this.client.send<Sale>("POST", "/api/sales", input);
  }

  cancelSale(id: string): Promise<Sale> {
    return this.client.send<Sale>("POST", `/api/sales/${id}/cancel`);
  }

  /* ----------------------------- reportes ------------------------------ */

  dashboard(): Promise<Dashboard> {
    return this.client.get<Dashboard>("/api/reports/summary");
  }

  lowStock(): Promise<LowStockItem[]> {
    return this.client.get<LowStockItem[]>("/api/reports/low-stock");
  }

  alerts(limit = 20): Promise<StockAlert[]> {
    return this.client.get<StockAlert[]>(`/api/reports/alerts${query({ limit })}`);
  }

  acknowledgeAlert(id: string): Promise<StockAlert> {
    return this.client.send<StockAlert>("POST", `/api/reports/alerts/${id}/ack`);
  }
}

export const salesApi = new SalesApiFacade(apiClient);
