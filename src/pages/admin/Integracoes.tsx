import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Plug, Save, Loader2, Check, MessageSquare, KeyRound, RefreshCw,
  Wifi, WifiOff, QrCode, Smartphone, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import {
  getIntegrationSettings, saveIntegrationSettings,
  getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp,
  type IntegrationSettings, type WhatsAppStatus,
} from "@/lib/integrations";

const Integracoes = () => {
  usePageTitle("Integrações | Admin");

  // ── Chaves de API ──────────────────────────────────────────────
  const [cfg, setCfg] = useState<IntegrationSettings>({
    uazapi_url: "", uazapi_token: "", google_api_key: "", admin_phone: "",
  });
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  // ── WhatsApp ───────────────────────────────────────────────────
  const [wpp, setWpp] = useState<WhatsAppStatus | null>(null);
  const [loadingWpp, setLoadingWpp] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setField = (k: keyof IntegrationSettings, v: string) =>
    setCfg((p) => ({ ...p, [k]: v }));

  const refreshStatus = async () => {
    const s = await getWhatsAppStatus();
    setWpp(s);
    setLoadingWpp(false);
    if (s.connected) {
      setConnecting(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return s;
  };

  useEffect(() => {
    getIntegrationSettings().then((c) => { setCfg(c); setLoadingCfg(false); });
    refreshStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveCfg = async () => {
    setSaving(true);
    const ok = await saveIntegrationSettings(cfg);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  const handleConnect = async () => {
    setConnecting(true);
    const s = await connectWhatsApp(cfg.admin_phone || undefined);
    setWpp(s);
    if (!s.connected) {
      // poll status até conectar (QR escaneado)
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(refreshStatus, 4000);
    } else {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWhatsApp();
    await refreshStatus();
  };

  const connected = wpp?.connected;
  const statusLabel =
    connected ? "Conectado" :
    wpp?.instanceStatus === "connecting" ? "Aguardando leitura do QR" :
    "Desconectado";

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Plug className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>
            <p className="text-sm text-muted-foreground">Conexões e chaves de API da plataforma</p>
          </div>
        </div>

        {/* ── WhatsApp ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" /> WhatsApp (Uazapi)
            </h2>
            <button
              onClick={refreshStatus}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingWpp ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Status badge */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${connected ? "bg-green-100" : "bg-red-100"}`}>
                  {connected ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-sm font-semibold text-foreground">{statusLabel}</span>
                  </div>
                  {wpp?.profileName && connected && (
                    <p className="text-xs text-muted-foreground">{wpp.profileName} · {wpp.owner}</p>
                  )}
                  {!connected && wpp?.lastDisconnectReason && (
                    <p className="text-xs text-muted-foreground">Motivo: {wpp.lastDisconnectReason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {connected ? (
                  <button
                    onClick={handleDisconnect}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    {connecting ? "Gerando..." : "Conectar WhatsApp"}
                  </button>
                )}
              </div>
            </div>

            {/* QR + pairing code */}
            {!connected && (wpp?.qrcode || wpp?.paircode) && (
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {wpp?.qrcode && (
                    <img
                      src={wpp.qrcode}
                      alt="QR Code WhatsApp"
                      className="h-44 w-44 rounded-lg border border-border bg-white p-2"
                    />
                  )}
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2 justify-center sm:justify-start">
                      <Smartphone className="h-4 w-4 text-primary" /> Conecte seu celular
                    </p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Abra o WhatsApp no celular</li>
                      <li>Toque em <strong>⋮ → Aparelhos conectados</strong></li>
                      <li>Toque em <strong>Conectar um aparelho</strong></li>
                      <li>Escaneie o QR ao lado</li>
                    </ol>
                    {wpp?.paircode && (
                      <div className="pt-1">
                        <p className="text-xs text-muted-foreground">Ou use o código de pareamento:</p>
                        <p className="font-mono text-lg font-bold tracking-widest text-primary">{wpp.paircode}</p>
                      </div>
                    )}
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 justify-center sm:justify-start">
                      <AlertCircle className="h-3 w-3" /> O QR expira em ~40s. Clique em “Conectar” de novo se expirar.
                    </p>
                  </div>
                </div>
                {connecting && (
                  <p className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando você escanear...
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Chaves de API ────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Chaves de API
            </h2>
            <button
              onClick={handleSaveCfg}
              disabled={saving || loadingCfg}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Salvo!" : "Salvar"}
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Essas chaves ficam guardadas no banco com acesso restrito (somente administradores logados).
                Alterá-las afeta o envio/recebimento de mensagens imediatamente.
              </p>
            </div>

            {loadingCfg ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <>
                <Field label="URL da Uazapi" value={cfg.uazapi_url}
                  onChange={(v) => setField("uazapi_url", v)} placeholder="https://sua-instancia.uazapi.com" />

                <SecretField label="Token da Uazapi" value={cfg.uazapi_token}
                  onChange={(v) => setField("uazapi_token", v)} show={showToken} onToggle={() => setShowToken((s) => !s)} />

                <Field label="Número do WhatsApp (com DDI)" value={cfg.admin_phone}
                  onChange={(v) => setField("admin_phone", v)} placeholder="5511999999999" />

                <SecretField label="Google API Key (transcrição de áudio)" value={cfg.google_api_key}
                  onChange={(v) => setField("google_api_key", v)} show={showGoogle} onToggle={() => setShowGoogle((s) => !s)} />
              </>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

const Field = ({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-foreground">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
  </div>
);

const SecretField = ({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-foreground">{label}</label>
    <div className="relative">
      <input value={value} onChange={(e) => onChange(e.target.value)} type={show ? "text" : "password"}
        className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 pr-10 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20" />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

export default Integracoes;
