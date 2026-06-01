import { useState } from "react";
import { Instagram, Plus, Play, Pause, Settings, Sparkles, RefreshCw, Zap } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AutomationDrawer } from "@/components/admin/social-selling/AutomationDrawer";
import { ToneOfVoiceDialog, PromptsDialog, RateLimitsDialog } from "@/components/admin/social-selling/SocialSellingSettingsDialogs";
import {
  useSocialSellingAutomations,
  useSaveAutomation,
  useDeleteAutomation,
  ACTION_LABELS,
  type SocialSellingAutomation,
} from "@/hooks/useSocialSellingAutomations";
import { useSocialSellingMetrics } from "@/hooks/useSocialSelling";

const EMPTY_AUTOMATION: SocialSellingAutomation = {
  id: "",
  name: "",
  emoji: "🔥",
  description: "",
  is_active: false,
  trigger_type: "manual",
  trigger_config: {},
  cadence_config: { days: [] },
  qualification_config: {},
  on_reply_config: {},
  created_at: "",
  updated_at: "",
};

export default function SocialSelling() {
  usePageTitle("Social Selling | Admin");

  const { data: automations = [], isLoading } = useSocialSellingAutomations();
  const { data: metrics } = useSocialSellingMetrics();
  const saveAutomation = useSaveAutomation();
  const deleteAutomation = useDeleteAutomation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<SocialSellingAutomation>(EMPTY_AUTOMATION);
  const [toneOpen, setToneOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);

  const handleNewAutomation = () => {
    setSelectedAutomation(EMPTY_AUTOMATION);
    setDrawerOpen(true);
  };

  const handleEditAutomation = (automation: SocialSellingAutomation) => {
    setSelectedAutomation(automation);
    setDrawerOpen(true);
  };

  const handleToggleActive = async (automation: SocialSellingAutomation) => {
    try {
      await saveAutomation.mutateAsync({ id: automation.id, is_active: !automation.is_active });
      toast.success(automation.is_active ? "Cadência desativada" : "Cadência ativada");
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const handleDelete = async (automation: SocialSellingAutomation) => {
    if (!confirm(`Excluir cadência "${automation.name}"? Isso não cancela enrolamentos ativos.`)) return;
    try {
      await deleteAutomation.mutateAsync(automation.id);
      toast.success("Cadência excluída");
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Social Selling</h1>
              <p className="text-sm text-muted-foreground">Prospecção automática via Instagram</p>
            </div>
          </div>
          <Button onClick={handleNewAutomation} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cadência
          </Button>
        </div>

        {/* Métricas */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Responderam</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.replied}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Ações (24h)</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.actions_24h}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Taxa de Resposta</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.reply_rate}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configurações rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setToneOpen(true)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <Sparkles className="h-5 w-5 text-pink-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Tom de Voz</p>
              <p className="text-xs text-muted-foreground">Como a IA escreve suas mensagens</p>
            </div>
          </button>
          <button
            onClick={() => setPromptsOpen(true)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <Zap className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Prompts da IA</p>
              <p className="text-xs text-muted-foreground">Qualificação + geração de mensagens</p>
            </div>
          </button>
          <button
            onClick={() => setLimitsOpen(true)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <Settings className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Rate Limits</p>
              <p className="text-xs text-muted-foreground">Limites e horários de execução</p>
            </div>
          </button>
        </div>

        {/* Lista de cadências */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Cadências ({automations.length})
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
          ) : automations.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Instagram className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma cadência criada</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Crie uma cadência para começar a prospectar via Instagram
                </p>
                <Button variant="outline" size="sm" onClick={handleNewAutomation} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeira Cadência
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {automations.map((automation) => {
                const days = automation.cadence_config?.days || [];
                const totalActions = days.reduce(
                  (acc, d) => acc + (d.actions?.length || 0),
                  0
                );
                return (
                  <Card key={automation.id} className={cn(!automation.is_active && "opacity-60")}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">{automation.emoji || "🔥"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">{automation.name}</h3>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {days.length} dia{days.length !== 1 ? "s" : ""}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {totalActions} ação{totalActions !== 1 ? "ões" : ""}
                            </Badge>
                            {automation.is_active && (
                              <Badge className="text-[10px] h-5 bg-emerald-500/15 text-emerald-700 border-emerald-200">
                                Ativa
                              </Badge>
                            )}
                          </div>
                          {automation.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{automation.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {days.map((d) => (
                              <div
                                key={d.day}
                                className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                              >
                                Dia {d.day}: {d.actions?.map((a) => ACTION_LABELS[a.type] || a.type).join(", ")}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={automation.is_active}
                            onCheckedChange={() => handleToggleActive(automation)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAutomation(automation)}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Extensão Chrome */}
        <Card className="border-dashed border-pink-200 bg-pink-500/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                <Instagram className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Extensão Chrome</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  A extensão executa as ações (curtir, comentar, enviar DM) diretamente no seu Instagram,
                  usando seu IP residencial. Instale em <strong>chrome://extensions</strong> → "Carregar sem compactação"
                  → selecione a pasta <code className="text-pink-600 bg-pink-500/10 px-1 rounded">extension/dist</code>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AutomationDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          automation={selectedAutomation}
        />
        <ToneOfVoiceDialog open={toneOpen} onOpenChange={setToneOpen} />
        <PromptsDialog open={promptsOpen} onOpenChange={setPromptsOpen} />
        <RateLimitsDialog open={limitsOpen} onOpenChange={setLimitsOpen} />
      </div>
    </AdminLayout>
  );
}
