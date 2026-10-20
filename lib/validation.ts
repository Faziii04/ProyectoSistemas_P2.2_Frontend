import type { CreateCustomerInput, CreateProductInput, CustomerType } from "./types";

export interface FieldError {
  field: string;
  message: string;
}

/** Lee un campo del formulario sin pelearse con el sistema de tipos. */
const read = (values: object, field: string): unknown => (values as Record<string, unknown>)[field];

const asText = (values: object, field: string): string => {
  const raw = read(values, field);
  return raw === undefined || raw === null ? "" : String(raw).trim();
};

/**
 * PATRÓN CHAIN OF RESPONSIBILITY.
 * Misma idea que la cadena del backend: cada eslabón valida una regla y pasa
 * el control al siguiente. Se ejecutan todos para mostrar todos los errores
 * del formulario de una sola vez.
 */
export abstract class FormHandler<T extends object> {
  private next?: FormHandler<T>;

  setNext(next: FormHandler<T>): this {
    let tail: FormHandler<T> = this;
    while (tail.next) {
      tail = tail.next;
    }

    tail.next = next;
    return this;
  }

  validate(values: T, errors: FieldError[]): FieldError[] {
    this.check(values, errors);
    this.next?.validate(values, errors);
    return errors;
  }

  protected abstract check(values: T, errors: FieldError[]): void;
}

export class RequiredFieldsHandler<T extends object> extends FormHandler<T> {
  constructor(private readonly fields: { field: string; label: string }[]) {
    super();
  }

  protected check(values: T, errors: FieldError[]): void {
    for (const { field, label } of this.fields) {
      if (asText(values, field) === "") {
        errors.push({ field, message: `${label} es obligatorio.` });
      }
    }
  }
}

export class LengthHandler<T extends object> extends FormHandler<T> {
  constructor(
    private readonly field: string,
    private readonly min: number,
    private readonly max: number,
    private readonly label: string,
  ) {
    super();
  }

  protected check(values: T, errors: FieldError[]): void {
    const text = asText(values, this.field);
    if (!text) return;

    if (text.length < this.min) {
      errors.push({ field: this.field, message: `${this.label} debe tener al menos ${this.min} caracteres.` });
    } else if (text.length > this.max) {
      errors.push({ field: this.field, message: `${this.label} debe tener como máximo ${this.max} caracteres.` });
    }
  }
}

export class PatternHandler<T extends object> extends FormHandler<T> {
  constructor(
    private readonly field: string,
    private readonly pattern: RegExp,
    private readonly message: string,
  ) {
    super();
  }

  protected check(values: T, errors: FieldError[]): void {
    const text = asText(values, this.field);
    if (text && !this.pattern.test(text)) {
      errors.push({ field: this.field, message: this.message });
    }
  }
}

export class NumericRangeHandler<T extends object> extends FormHandler<T> {
  constructor(
    private readonly field: string,
    private readonly min: number,
    private readonly max: number,
    private readonly label: string,
    private readonly integer = false,
  ) {
    super();
  }

  protected check(values: T, errors: FieldError[]): void {
    const text = asText(values, this.field);
    if (!text) return;

    const value = Number(text);
    if (!Number.isFinite(value)) {
      errors.push({ field: this.field, message: `${this.label} debe ser numérico.` });
      return;
    }

    if (this.integer && !Number.isInteger(value)) {
      errors.push({ field: this.field, message: `${this.label} debe ser un número entero.` });
      return;
    }

    if (value < this.min || value > this.max) {
      errors.push({ field: this.field, message: `${this.label} debe estar entre ${this.min} y ${this.max}.` });
    }
  }
}

export class OneOfHandler<T extends object> extends FormHandler<T> {
  constructor(
    private readonly field: string,
    private readonly allowed: readonly string[],
    private readonly label: string,
  ) {
    super();
  }

  protected check(values: T, errors: FieldError[]): void {
    const text = asText(values, this.field);
    if (text && !this.allowed.includes(text)) {
      errors.push({ field: this.field, message: `${this.label} debe ser uno de: ${this.allowed.join(", ")}.` });
    }
  }
}

export class FormErrors extends Error {
  readonly errors: FieldError[];

  constructor(errors: FieldError[]) {
    super(errors.map((error) => error.message).join(" "));
    this.name = "FormErrors";
    this.errors = errors;
  }
}

/** Cabeza de la cadena con la puerta de entrada tipada. */
export class ValidationChain<T extends object> {
  constructor(private readonly head: FormHandler<T>) {}

  validate(values: T): FieldError[] {
    return this.head.validate(values, []);
  }

  ensureValid(values: T): void {
    const errors = this.validate(values);
    if (errors.length > 0) {
      throw new FormErrors(errors);
    }
  }
}

/* --------------------------- formularios ---------------------------- */

export interface ProductFormValues {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  minStock: string;
}

export interface CustomerFormValues {
  document: string;
  name: string;
  email: string;
  phone: string;
  type: string;
}

export const productFormValidation = new ValidationChain<ProductFormValues>(
  new RequiredFieldsHandler<ProductFormValues>([
    { field: "sku", label: "El SKU" },
    { field: "name", label: "El nombre" },
    { field: "category", label: "La categoría" },
    { field: "price", label: "El precio" },
    { field: "stock", label: "El stock" },
    { field: "minStock", label: "El stock mínimo" },
  ])
    .setNext(new LengthHandler<ProductFormValues>("sku", 3, 30, "El SKU"))
    .setNext(new LengthHandler<ProductFormValues>("name", 3, 120, "El nombre"))
    .setNext(
      new PatternHandler<ProductFormValues>(
        "sku",
        /^[A-Za-z0-9-]{3,30}$/,
        "El SKU solo admite letras, números y guiones (ejemplo: ELE-001).",
      ),
    )
    .setNext(new NumericRangeHandler<ProductFormValues>("price", 1, 100_000_000, "El precio"))
    .setNext(new NumericRangeHandler<ProductFormValues>("stock", 0, 100_000, "El stock", true))
    .setNext(new NumericRangeHandler<ProductFormValues>("minStock", 0, 100_000, "El stock mínimo", true)),
);

export const customerFormValidation = new ValidationChain<CustomerFormValues>(
  new RequiredFieldsHandler<CustomerFormValues>([
    { field: "document", label: "El documento" },
    { field: "name", label: "El nombre" },
    { field: "email", label: "El correo" },
    { field: "phone", label: "El teléfono" },
    { field: "type", label: "El tipo de cliente" },
  ])
    .setNext(new LengthHandler<CustomerFormValues>("document", 5, 20, "El documento"))
    .setNext(new LengthHandler<CustomerFormValues>("name", 3, 120, "El nombre"))
    .setNext(
      new PatternHandler<CustomerFormValues>(
        "document",
        /^\d{5,20}$/,
        "El documento solo puede contener números (5 a 20 dígitos).",
      ),
    )
    .setNext(
      new PatternHandler<CustomerFormValues>(
        "email",
        /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/,
        "El correo no tiene un formato válido.",
      ),
    )
    .setNext(
      new PatternHandler<CustomerFormValues>(
        "phone",
        /^\d{7,20}$/,
        "El teléfono solo puede contener números (7 a 20 dígitos).",
      ),
    )
    .setNext(new OneOfHandler<CustomerFormValues>("type", ["regular", "mayorista", "vip"], "El tipo de cliente")),
);

export const parseProductForm = (values: ProductFormValues): CreateProductInput => ({
  sku: values.sku.trim().toUpperCase(),
  name: values.name.trim(),
  description: values.description.trim(),
  category: values.category.trim().toLowerCase(),
  price: Number(values.price),
  stock: Number(values.stock),
  minStock: Number(values.minStock),
});

export const parseCustomerForm = (values: CustomerFormValues): CreateCustomerInput => ({
  document: values.document.trim(),
  name: values.name.trim(),
  email: values.email.trim().toLowerCase(),
  phone: values.phone.trim(),
  type: values.type as CustomerType,
});
