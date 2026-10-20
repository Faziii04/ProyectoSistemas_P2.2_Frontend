const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const formatCurrency = (value: number): string => currency.format(Number.isFinite(value) ? value : 0);

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("es-CO").format(Number.isFinite(value) ? value : 0);

export const formatPercent = (rate: number): string =>
  new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 0 }).format(rate ?? 0);

export const formatDate = (iso: string): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};
