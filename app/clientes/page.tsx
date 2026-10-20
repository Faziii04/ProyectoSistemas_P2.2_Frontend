"use client";

import { useCallback, useEffect, useState } from "react";
import { adaptCustomer, type CustomerView } from "@/lib/adapters";
import { salesApi } from "@/lib/api";
import { describeError } from "@/lib/api-client";
import type { Customer } from "@/lib/types";
import {
  FormErrors,
  customerFormValidation,
  parseCustomerForm,
  type CustomerFormValues,
  type FieldError,
} from "@/lib/validation";
import { Alert, Badge, Button, Card, Empty, Field, Modal, Spinner, inputClass } from "../components/ui";

const emptyForm: CustomerFormValues = {
  document: "",
  name: "",
  email: "",
  phone: "",
  type: "regular",
};

const toForm = (customer: Customer): CustomerFormValues => ({
  document: customer.document,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  type: customer.type,
});

const byField = (errors: FieldError[]): Record<string, string> =>
  errors.reduce<Record<string, string>>((accumulator, error) => {
    accumulator[error.field] ??= error.message;
    return accumulator;
  }, {});

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerView[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi.listCustomers({ q: search });
      setCustomers(data.map(adaptCustomer));
    } catch (loadError) {
      setError(describeError(loadError));
    } finally {
      setLoading(false);
    }
  }, [search]);

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

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm(toForm(customer));
    setFormErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      customerFormValidation.ensureValid(form);
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
      const payload = parseCustomerForm(form);
      if (editing) {
        await salesApi.updateCustomer(editing.id, payload);
      } else {
        await salesApi.createCustomer(payload);
      }
      setFormOpen(false);
      await load();
    } catch (saveError) {
      setFormError(describeError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (customer: CustomerView) => {
    if (!window.confirm(`¿Dar de baja al cliente ${customer.name}?`)) return;

    try {
      await salesApi.deleteCustomer(customer.id);
      await load();
    } catch (deleteError) {
      setError(describeError(deleteError));
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Clientes"
        subtitle={`${customers.length} clientes activos`}
        actions={
          <Button size="sm" onClick={openCreate}>
            Nuevo cliente
          </Button>
        }
      >
        <div className="mb-4">
          <input
            className={inputClass}
            placeholder="Buscar por documento, nombre o correo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        {loading ? (
          <Spinner label="Cargando clientes…" />
        ) : customers.length === 0 ? (
          <Empty>No hay clientes registrados.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Tipo</th>
                  <th>Alta</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="font-mono text-xs text-zinc-500">{customer.document}</td>
                    <td className="font-medium">{customer.name}</td>
                    <td>
                      <div className="text-xs text-zinc-600">{customer.email}</div>
                      <div className="text-xs text-zinc-500">{customer.phone}</div>
                    </td>
                    <td>
                      <Badge tone={customer.typeTone}>{customer.typeLabel}</Badge>
                    </td>
                    <td className="text-xs text-zinc-500">{customer.createdLabel}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(customer)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void remove(customer)}>
                          Baja
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

      <Modal open={formOpen} title={editing ? `Editar ${editing.document}` : "Nuevo cliente"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {formError && <Alert>{formError}</Alert>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Documento" error={formErrors.document}>
              <input
                className={inputClass}
                value={form.document}
                onChange={(event) => setForm({ ...form, document: event.target.value })}
                placeholder="1094900001"
              />
            </Field>
            <Field label="Tipo de cliente" error={formErrors.type}>
              <select
                className={inputClass}
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="regular">Regular</option>
                <option value="mayorista">Mayorista</option>
                <option value="vip">VIP</option>
              </select>
            </Field>
          </div>

          <Field label="Nombre o razón social" error={formErrors.name}>
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Correo" error={formErrors.email}>
              <input
                className={inputClass}
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="cliente@correo.com"
              />
            </Field>
            <Field label="Teléfono" error={formErrors.phone}>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="3001234567"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
