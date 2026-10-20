"use client";

import { useSyncExternalStore } from "react";
import type { Product } from "./types";

export interface CartItem {
  product: Product;
  quantity: number;
}

type Listener = () => void;

const EMPTY: CartItem[] = [];

/**
 * PATRÓN OBSERVER (sujeto).
 * El carrito es el sujeto observado: mantiene la lista de observadores
 * suscritos y les avisa cada vez que cambia. La UI se suscribe con
 * `useSyncExternalStore`, así que cualquier componente que use `useCartItems`
 * se vuelve a dibujar cuando el carrito notifica.
 */
export class CartStore {
  private items: CartItem[] = EMPTY;
  private readonly listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): CartItem[] => this.items;

  add = (product: Product, quantity = 1): void => {
    if (product.stock <= 0) {
      return;
    }

    const existing = this.items.find((item) => item.product.id === product.id);
    this.items = existing
      ? this.items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item,
        )
      : [...this.items, { product, quantity: Math.min(quantity, product.stock) }];

    this.notify();
  };

  setQuantity = (productId: string, quantity: number): void => {
    const next = Math.max(0, quantity);
    if (next === 0) {
      this.remove(productId);
      return;
    }

    this.items = this.items.map((item) =>
      item.product.id === productId
        ? { ...item, quantity: Math.min(next, item.product.stock) }
        : item,
    );
    this.notify();
  };

  remove = (productId: string): void => {
    this.items = this.items.filter((item) => item.product.id !== productId);
    this.notify();
  };

  clear = (): void => {
    if (this.items.length === 0) {
      return;
    }

    this.items = EMPTY;
    this.notify();
  };

  subtotal = (): number => this.items.reduce((total, item) => total + item.product.price * item.quantity, 0);

  units = (): number => this.items.reduce((total, item) => total + item.quantity, 0);

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const cartStore = new CartStore();

/** Hook de suscripción al carrito (observador de React). */
export function useCartItems(): CartItem[] {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, () => EMPTY);
}
