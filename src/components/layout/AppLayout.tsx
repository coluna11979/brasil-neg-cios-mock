/**
 * AppLayout — shim que adapta o layout do CRM (AdminLayout) ao módulo
 * de Plataforma de Agentes, que espera um named export `AppLayout`.
 */
import type { ReactNode } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

export function AppLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}

export default AppLayout;
