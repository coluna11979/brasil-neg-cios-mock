import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarDays, Clock, User, Phone, Mail, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { ptBR } from "date-fns/locale";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export default function Agendar() {
  const [params] = useSearchParams();
  const refFromUrl = params.get("ref") || "";
  const corretorFromUrl = params.get("corretor") || "";

  const [date, setDate] = useState<Date | undefined>();
  const [horario, setHorario] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [imovelRef, setImovelRef] = useState(refFromUrl);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const handleSubmit = async () => {
    if (!nome.trim()) { toast.error("Informe seu nome"); return; }
    if (!telefone.trim()) { toast.error("Informe seu telefone"); return; }
    if (!date) { toast.error("Selecione uma data"); return; }
    if (!horario) { toast.error("Selecione um horário"); return; }

    setSaving(true);
    const dateStr = date.toISOString().split("T")[0];

    let corretorUserId: string | null = null;
    if (corretorFromUrl) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .ilike("nome", `%${corretorFromUrl}%`)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (prof) corretorUserId = prof.id;
    }

    const { error } = await supabase.from("agendamentos").insert({
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim() || null,
      imovel_ref: imovelRef.trim() || null,
      corretor: corretorFromUrl || null,
      user_id: corretorUserId,
      data: dateStr,
      horario,
      notas: notas.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error("Erro ao agendar. Tente novamente.");
      return;
    }

    if (email.trim()) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      fetch(`${supabaseUrl}/functions/v1/send-agendamento-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          data: dateStr,
          horario,
          imovel_ref: imovelRef.trim() || undefined,
          corretor: corretorFromUrl || undefined,
        }),
      }).catch(() => {});
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f3ee] to-[#ede8db] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Visita Agendada!</h2>
          <p className="text-gray-600">
            Recebemos seu agendamento para <strong>{date?.toLocaleDateString("pt-BR")}</strong> às <strong>{horario}</strong>.
          </p>
          <p className="text-gray-500 text-sm">
            Um corretor entrará em contato para confirmar os detalhes.
          </p>
          <div className="pt-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#BAA05E] px-6 py-3 text-white font-medium hover:bg-[#9A8340] transition-colors"
            >
              Voltar ao Site
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ee] to-[#ede8db]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-[#BAA05E]/20">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="/">
            <Logo iconClassName="h-8 w-8" />
          </a>
          <span className="text-sm text-gray-500 font-medium">Agendar Visita</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Agende sua <span className="text-[#BAA05E]">Visita</span>
          </h1>
          <p className="mt-2 text-gray-600 max-w-md mx-auto">
            Escolha a melhor data e horário para conhecer o imóvel. É rápido e fácil!
          </p>
          {corretorFromUrl && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white border border-[#BAA05E]/30 px-4 py-2 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#BAA05E] text-white text-sm font-bold">
                {corretorFromUrl.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-700">
                Corretor: <strong className="text-[#BAA05E]">{corretorFromUrl}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left — Calendar & Time */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                <CalendarDays className="h-5 w-5 text-[#BAA05E]" />
                Escolha a Data
              </h3>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={{ before: tomorrow }}
                locale={ptBR}
                className="rounded-xl border border-gray-200 mx-auto"
                classNames={{
                  day_selected: "bg-[#BAA05E] text-white hover:bg-[#9A8340] focus:bg-[#9A8340]",
                  day_today: "bg-[#BAA05E]/10 text-[#BAA05E] font-bold",
                }}
              />
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                <Clock className="h-5 w-5 text-[#BAA05E]" />
                Escolha o Horário
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setHorario(t)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      horario === t
                        ? "border-[#BAA05E] bg-[#BAA05E] text-white shadow-md"
                        : "border-gray-200 text-gray-700 hover:border-[#BAA05E]/50 hover:bg-[#BAA05E]/5"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Seus Dados</h3>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <User className="h-4 w-4 text-[#BAA05E]" /> Nome completo *
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="border-gray-200 focus:border-[#BAA05E] focus:ring-[#BAA05E]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Phone className="h-4 w-4 text-[#BAA05E]" /> Telefone / WhatsApp *
              </label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="border-gray-200 focus:border-[#BAA05E] focus:ring-[#BAA05E]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Mail className="h-4 w-4 text-[#BAA05E]" /> E-mail
              </label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                type="email"
                className="border-gray-200 focus:border-[#BAA05E] focus:ring-[#BAA05E]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4 text-[#BAA05E]" /> Imóvel de interesse
              </label>
              <Input
                value={imovelRef}
                onChange={(e) => setImovelRef(e.target.value)}
                placeholder="Ex: Salão Comercial — Jd Ângela"
                className="border-gray-200 focus:border-[#BAA05E] focus:ring-[#BAA05E]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Observações</label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Alguma preferência ou dúvida?"
                rows={3}
                className="border-gray-200 focus:border-[#BAA05E] focus:ring-[#BAA05E]/20 resize-none"
              />
            </div>

            {/* Summary */}
            {date && horario && (
              <div className="rounded-xl bg-[#BAA05E]/5 border border-[#BAA05E]/20 p-4">
                <p className="text-sm text-gray-700">
                  <strong className="text-[#BAA05E]">Resumo:</strong>{" "}
                  {date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} às {horario}
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={saving || !nome || !telefone || !date || !horario}
              className="w-full h-12 text-base font-semibold bg-[#BAA05E] hover:bg-[#9A8340] text-white rounded-xl shadow-lg shadow-[#BAA05E]/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Agendamento"}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#BAA05E]/10 bg-white/60 py-6 text-center text-sm text-gray-500">
        NegociaAky — Seu imóvel, sua negociação.
      </footer>
    </div>
  );
}
