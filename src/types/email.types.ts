// Tipos compartilhados do módulo Email Marketing.
// Espelham as tabelas criadas na migration 20260617_02_email_marketing_base.

export type EmailCampaignStatus =
  | "draft" | "scheduled" | "sending" | "sent"
  | "completed" | "failed" | "cancelled";

export type EmailSendStatus =
  | "pending" | "sent" | "delivered" | "opened"
  | "clicked" | "bounced" | "complained" | "failed";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string | null;
  preheader: string | null;
  content_json: any | null;
  html_content: string | null;
  thumbnail_url: string | null;
  category: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAudienceFilters {
  lead_ids?: string[];
  corretor_ids?: string[];
  statuses?: string[];
  origens?: string[];
  tipos?: string[];
  tags_any?: string[];
  tags_all?: string[];
  created_after?: string;
  created_before?: string;
  exclude_campaign_days?: number;
}

export interface EmailCampaign {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  preheader: string | null;
  template_id: string | null;
  content_json: any | null;
  html_content: string | null;
  audience_filters: EmailAudienceFilters;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  status: EmailCampaignStatus;
  source_type: "campaign" | "automation" | "test";
  automation_id: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  total_leads: number;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string | null;
  email: string;
  status: EmailSendStatus;
  resend_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface EmailAutomation {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_filter: any | null;
  flow_json: FlowNode[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FlowNodeType =
  | "trigger" | "send_email" | "send_whatsapp" | "wait"
  | "condition" | "update_field" | "add_tag" | "create_task" | "end";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label?: string;
  config?: Record<string, any>;
  next?: string | null;
  next_true?: string | null;
  next_false?: string | null;
}

export interface EmailSend {
  id: string;
  campaign_id: string | null;
  lead_id: string | null;
  email: string;
  resend_id: string | null;
  status: EmailSendStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  open_count: number;
  clicked_at: string | null;
  click_count: number;
  clicked_url: string | null;
  bounced_at: string | null;
  bounce_reason: string | null;
  error_message: string | null;
  html: string | null;
  unsubscribed_at: string | null;
  created_at: string;
}
