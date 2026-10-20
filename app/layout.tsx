import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "./components/nav-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Ventas · Práctica 2.2",
  description: "Sistema de ventas de productos con patrones de diseño en frontend y backend",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6">
          <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Práctica 2.2</p>
              <h1 className="text-2xl font-semibold tracking-tight">Sistema de Ventas</h1>
              <p className="text-xs text-zinc-500">Next.js · ASP.NET Core · Convex</p>
            </div>
            <NavBar />
          </header>

          <main className="flex-1">{children}</main>

          <footer className="mt-10 border-t border-zinc-200 pt-3 text-xs text-zinc-400">
            Patrones creacionales, estructurales y de comportamiento aplicados en el frontend y en el backend.
          </footer>
        </div>
      </body>
    </html>
  );
}
