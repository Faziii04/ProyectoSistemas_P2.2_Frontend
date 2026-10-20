import type { ReactNode } from "react";
import type { Tone } from "@/lib/adapters";

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100";

export const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500";

const toneMap: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneMap[tone]}`}>
      {children}
    </span>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      {hint && <p className={`mt-1 text-xs ${tone === "danger" ? "text-rose-600" : "text-zinc-500"}`}>{hint}</p>}
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
    secondary: "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "text-zinc-600 hover:bg-zinc-100",
  } as const;

  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
  } as const;

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

export function Alert({ tone = "danger", children }: { tone?: Tone; children: ReactNode }) {
  const styles: Record<Tone, string> = {
    neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  };

  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles[tone]}`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/40 p-4 backdrop-blur-sm">
      <div className="mt-10 w-full max-w-xl rounded-xl border border-zinc-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600" />
      {label}
    </div>
  );
}
