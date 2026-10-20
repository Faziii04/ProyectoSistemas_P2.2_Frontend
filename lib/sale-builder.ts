import type { CartItem } from "./cart-store";
import type { CreateSaleInput, DiscountStrategyKey, PaymentMethod } from "./types";

/**
 * PATRÓN BUILDER.
 * Arma la petición de venta paso a paso: cliente, medio de pago, estrategia de
 * descuento y líneas. `build()` es el único punto que puede producir el
 * objeto y falla si falta información obligatoria.
 */
export class SaleDraftBuilder {
  private customerId?: string;
  private paymentMethod: PaymentMethod = "efectivo";
  private discountStrategy: DiscountStrategyKey = "mejor";
  private taxRate = 0.19;
  private readonly lines = new Map<string, number>();

  forCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  withPaymentMethod(paymentMethod: PaymentMethod): this {
    this.paymentMethod = paymentMethod;
    return this;
  }

  withDiscountStrategy(discountStrategy: DiscountStrategyKey): this {
    this.discountStrategy = discountStrategy;
    return this;
  }

  withTaxRate(taxRate: number): this {
    this.taxRate = taxRate;
    return this;
  }

  /** Suma unidades del mismo producto en lugar de duplicar la línea. */
  addItem(productId: string, quantity: number): this {
    if (quantity <= 0) {
      throw new Error("La cantidad debe ser mayor que cero.");
    }

    this.lines.set(productId, (this.lines.get(productId) ?? 0) + quantity);
    return this;
  }

  addFromCart(items: CartItem[]): this {
    for (const item of items) {
      this.addItem(item.product.id, item.quantity);
    }

    return this;
  }

  build(): CreateSaleInput {
    if (!this.customerId) {
      throw new Error("Seleccione un cliente antes de registrar la venta.");
    }

    if (this.lines.size === 0) {
      throw new Error("Agregue al menos un producto al carrito.");
    }

    return {
      customerId: this.customerId,
      items: [...this.lines.entries()].map(([productId, quantity]) => ({ productId, quantity })),
      paymentMethod: this.paymentMethod,
      discountStrategy: this.discountStrategy,
      taxRate: this.taxRate,
    };
  }
}
