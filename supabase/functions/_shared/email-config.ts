// Helper compartilhado: lê config de email (Resend) da tabela integration_settings (id=1).
// Single-tenant: 1 ÚNICA row no banco com as chaves Resend.
// Edges leem em runtime — ZERO hardcoded.

export interface EmailConfig {
  id: number;
  resend_api_key: string | null;
  resend_webhook_secret: string | null;
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
  company_address: string | null;
  company_name: string | null;
  app_url: string | null;
  email_active: boolean;
  email_domain_verified: boolean;
}

export async function getEmailConfig(supabase: any): Promise<EmailConfig | null> {
  const { data, error } = await supabase
    .from("integration_settings")
    .select(
      "id, resend_api_key, resend_webhook_secret, from_email, from_name, reply_to, " +
      "company_address, company_name, app_url, email_active, email_domain_verified",
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("Erro ao ler integration_settings:", error);
    return null;
  }
  return data || null;
}

export function requireActiveConfig(config: EmailConfig | null): EmailConfig {
  if (!config) {
    throw new Error(
      "integration_settings (id=1) não encontrado. Configure em /admin/integracoes.",
    );
  }
  if (!config.email_active) {
    throw new Error(
      "Email marketing inativo. Ative em /admin/integracoes → aba Email após verificar domínio no Resend.",
    );
  }
  if (!config.resend_api_key) {
    throw new Error("Resend API key não configurada em integration_settings.");
  }
  if (!config.from_email) {
    throw new Error("from_email não configurado em integration_settings.");
  }
  return config;
}
