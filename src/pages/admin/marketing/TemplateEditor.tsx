import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Eye, Send } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailTemplate, useSaveTemplate, sendTestEmail } from "@/hooks/useEmailMarketing";
import { toast } from "sonner";

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #BAA05E;">Olá {{primeiro_nome}}!</h1>
  <p>Conteúdo do seu email aqui.</p>
  <p>Variáveis disponíveis: <code>{{nome}}</code>, <code>{{primeiro_nome}}</code>, <code>{{email}}</code>, <code>{{telefone}}</code>, <code>{{empresa}}</code>, <code>{{unsubscribe_url}}</code></p>
</body>
</html>`;

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "novo";
  const navigate = useNavigate();
  usePageTitle(isNew ? "Novo template | Admin" : "Editar template | Admin");

  const { data: tpl, isLoading } = useEmailTemplate(isNew ? undefined : id);
  const save = useSaveTemplate();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [category, setCategory] = useState("general");
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (tpl) {
      setName(tpl.name);
      setSubject(tpl.subject || "");
      setPreheader(tpl.preheader || "");
      setCategory(tpl.category || "general");
      setHtml(tpl.html_content || DEFAULT_HTML);
    }
  }, [tpl]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    try {
      const saved: any = await save.mutateAsync({
        id: isNew ? undefined : id,
        name: name.trim(),
        subject: subject.trim() || null,
        preheader: preheader.trim() || null,
        category,
        html_content: html,
      });
      toast.success("Template salvo");
      if (isNew && saved?.id) navigate(`/admin/marketing/templates/${saved.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Email de teste obrigatório");
      return;
    }
    setSendingTest(true);
    try {
      await sendTestEmail({ test_email: testEmail.trim(), html, subject: subject || "Teste" });
      toast.success(`Teste enviado pra ${testEmail}`);
    } catch (e: any) {
      toast.error(e.message || "Falha no envio de teste — confira a configuração do Resend");
    } finally {
      setSendingTest(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/templates" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold">{isNew ? "Novo template" : `Editar: ${tpl?.name || ""}`}</h1>
              <p className="text-xs text-muted-foreground">Crie/edite o HTML do email e teste antes de usar em campanhas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview((s) => !s)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Eye className="h-4 w-4" /> {showPreview ? "Editor" : "Preview"}
            </button>
            <button
              onClick={handleSave}
              disabled={save.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Metadados */}
          <section className="md:col-span-1 rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-sm">Metadados</h2>
            <FieldText label="Nome interno" value={name} onChange={setName} placeholder="Boas-vindas v1" />
            <FieldText label="Assunto (subject)" value={subject} onChange={setSubject} placeholder="Bem-vindo, {{primeiro_nome}}!" />
            <FieldText label="Preheader" value={preheader} onChange={setPreheader} placeholder="Texto curto exibido no inbox" />
            <FieldText label="Categoria" value={category} onChange={setCategory} placeholder="general" />

            <div className="pt-4 border-t border-border space-y-2">
              <h3 className="font-semibold text-xs">Teste rápido</h3>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleTest}
                disabled={sendingTest}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar teste
              </button>
              <p className="text-[10px] text-muted-foreground">
                Variáveis disponíveis: <code>{`{{nome}}`}</code>, <code>{`{{primeiro_nome}}`}</code>, <code>{`{{email}}`}</code>, <code>{`{{telefone}}`}</code>, <code>{`{{empresa}}`}</code>, <code>{`{{unsubscribe_url}}`}</code>
              </p>
            </div>
          </section>

          {/* Editor / Preview */}
          <section className="md:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-sm">{showPreview ? "Preview" : "HTML do email"}</h2>
            </div>
            {showPreview ? (
              <iframe
                title="Preview"
                className="w-full bg-white"
                style={{ minHeight: 540 }}
                srcDoc={html}
              />
            ) : (
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full font-mono text-xs p-4 border-0 outline-none resize-y bg-card"
                style={{ minHeight: 540 }}
                spellCheck={false}
              />
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function FieldText({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
