import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Eye, Send, Plus, Trash2, GripVertical,
  Type, Image, MousePointerClick, Minus, Code, ChevronUp, ChevronDown,
  Bold, Italic, Underline, Strikethrough, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailTemplate, useSaveTemplate, sendTestEmail } from "@/hooks/useEmailMarketing";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload } from "lucide-react";

/* ── Constantes ─────────────────────────────────────────── */

const WARM = "#BAA05E";

const VARIABLES = [
  { key: "nome", label: "Nome completo" },
  { key: "primeiro_nome", label: "Primeiro nome" },
  { key: "email", label: "Email" },
  { key: "telefone", label: "Telefone" },
  { key: "empresa", label: "Empresa" },
  { key: "unsubscribe_url", label: "Link descadastro" },
];

/* ── Tipos de bloco ─────────────────────────────────────── */

type BlockType = "text" | "title" | "image" | "button" | "divider" | "spacer";

interface Block {
  id: string;
  type: BlockType;
  content?: string;
  src?: string;
  alt?: string;
  href?: string;
  label?: string;
  align?: "left" | "center" | "right";
  level?: 1 | 2 | 3;
  height?: number;
  color?: string;
  bgColor?: string;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: any; desc: string }[] = [
  { type: "text", label: "Texto", icon: Type, desc: "Parágrafo de texto" },
  { type: "title", label: "Título", icon: Type, desc: "Cabeçalho H1/H2/H3" },
  { type: "image", label: "Imagem", icon: Image, desc: "Imagem com link opcional" },
  { type: "button", label: "Botão", icon: MousePointerClick, desc: "Botão de ação (CTA)" },
  { type: "divider", label: "Divisor", icon: Minus, desc: "Linha horizontal" },
  { type: "spacer", label: "Espaço", icon: ChevronDown, desc: "Espaço em branco" },
];

const uid = () => crypto.randomUUID();

function defaultBlock(type: BlockType): Block {
  switch (type) {
    case "text": return { id: uid(), type, content: "Seu texto aqui...", align: "left" };
    case "title": return { id: uid(), type, content: "Título", level: 1, align: "center" };
    case "image": return { id: uid(), type, src: "", alt: "Imagem", href: "", align: "center" };
    case "button": return { id: uid(), type, label: "Clique aqui →", href: "https://negociaaky.com.br", align: "center", color: "#ffffff", bgColor: WARM };
    case "divider": return { id: uid(), type };
    case "spacer": return { id: uid(), type, height: 24 };
  }
}

/* ── Gerar HTML a partir de blocos ──────────────────────── */

function blocksToHtml(blocks: Block[], meta: { preheader?: string }): string {
  const inner = blocks.map((b) => {
    const align = b.align || "left";
    switch (b.type) {
      case "text":
        return `<p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 16px;text-align:${align};">${b.content || ""}</p>`;
      case "title": {
        const tag = `h${b.level || 1}`;
        const sizes: Record<number, string> = { 1: "24px", 2: "20px", 3: "16px" };
        return `<${tag} style="font-size:${sizes[b.level || 1]};font-weight:700;color:#18181b;margin:0 0 12px;text-align:${align};">${b.content || ""}</${tag}>`;
      }
      case "image":
        const img = `<img src="${b.src || ""}" alt="${b.alt || ""}" style="max-width:100%;height:auto;border-radius:8px;display:block;${align === "center" ? "margin:0 auto;" : ""}" />`;
        return b.href ? `<a href="${b.href}" style="display:block;text-align:${align};margin:0 0 16px;">${img}</a>` : `<div style="text-align:${align};margin:0 0 16px;">${img}</div>`;
      case "button":
        return `<div style="text-align:${align};margin:24px 0;"><a href="${b.href || "#"}" style="display:inline-block;background:${b.bgColor || WARM};color:${b.color || "#fff"};font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;">${b.label || "Botão"}</a></div>`;
      case "divider":
        return `<hr style="border:0;border-top:1px solid #e4e4e7;margin:24px 0;" />`;
      case "spacer":
        return `<div style="height:${b.height || 24}px;"></div>`;
      default: return "";
    }
  }).join("\n    ");

  const preheaderHtml = meta.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f4f5;">${meta.preheader}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  ${preheaderHtml}
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:36px 32px;">
    ${inner}
  </div>
</body>
</html>`;
}

/* ── Componente principal ───────────────────────────────── */

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
  const [blocks, setBlocks] = useState<Block[]>([
    defaultBlock("title"),
    defaultBlock("text"),
    defaultBlock("button"),
  ]);
  const [showPreview, setShowPreview] = useState(false);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showVarMenu, setShowVarMenu] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  useEffect(() => {
    if (tpl) {
      setName(tpl.name);
      setSubject(tpl.subject || "");
      setPreheader(tpl.preheader || "");
      setCategory(tpl.category || "general");
      if (tpl.content_json && Array.isArray((tpl.content_json as any))) {
        setBlocks(tpl.content_json as Block[]);
      } else if (tpl.html_content) {
        setBlocks([{ id: uid(), type: "text", content: "Template importado — edite os blocos acima ou use o código HTML.", align: "left" }]);
      }
    }
  }, [tpl]);

  const html = blocksToHtml(blocks, { preheader });

  const updateBlock = useCallback((blockId: string, updates: Partial<Block>) => {
    setBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, ...updates } : b));
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    if (selectedBlock === blockId) setSelectedBlock(null);
  }, [selectedBlock]);

  const moveBlock = useCallback((blockId: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === blockId);
      if (i < 0 || i + dir < 0 || i + dir >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  }, []);

  const addBlock = useCallback((type: BlockType) => {
    setBlocks((prev) => [...prev, defaultBlock(type)]);
    setShowAddMenu(false);
  }, []);

  const insertVariable = useCallback((blockId: string, varKey: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const field = b.type === "button" ? "label" : "content";
        return { ...b, [field]: (b[field as keyof Block] || "") + `{{${varKey}}}` };
      }),
    );
    setShowVarMenu(null);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    try {
      const saved: any = await save.mutateAsync({
        id: isNew ? undefined : id,
        name: name.trim(),
        subject: subject.trim() || null,
        preheader: preheader.trim() || null,
        category,
        content_json: blocks as any,
        html_content: html,
      });
      toast.success("Template salvo");
      if (isNew && saved?.id) navigate(`/admin/marketing/templates/${saved.id}`);
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) { toast.error("Email de teste obrigatório"); return; }
    setSendingTest(true);
    try {
      await sendTestEmail({ test_email: testEmail.trim(), html, subject: subject || "Teste" });
      toast.success(`Teste enviado pra ${testEmail}`);
    } catch (e: any) { toast.error(e.message || "Falha no envio de teste"); }
    finally { setSendingTest(false); }
  };

  if (!isNew && isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" style={{ color: WARM }} /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="max-w-[1120px] mx-auto pb-10">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/templates" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold">{isNew ? "Novo template" : `Editar: ${tpl?.name || ""}`}</h1>
              <p className="text-[11px] text-muted-foreground">Editor visual de blocos — monte seu email arrastando componentes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowPreview(false); setShowHtmlSource(!showHtmlSource); }}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <Code className="h-4 w-4" /> {showHtmlSource ? "Blocos" : "HTML"}
            </button>
            <button onClick={() => { setShowHtmlSource(false); setShowPreview(!showPreview); }}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <Eye className="h-4 w-4" /> {showPreview ? "Blocos" : "Preview"}
            </button>
            <button onClick={handleSave} disabled={save.isPending}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: WARM }}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* ── Sidebar ── */}
          <aside className="space-y-5">
            {/* Metadados */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>Metadados</p>
              <Field label="Nome interno" value={name} onChange={setName} placeholder="Boas-vindas v1" />
              <Field label="Assunto" value={subject} onChange={setSubject} placeholder="Bem-vindo, {{primeiro_nome}}!" />
              <Field label="Preheader" value={preheader} onChange={setPreheader} placeholder="Texto curto exibido no inbox" />
              <Field label="Categoria" value={category} onChange={setCategory} placeholder="general" />
            </div>

            {/* Inserir bloco */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>Inserir bloco</p>
              <div className="grid grid-cols-2 gap-2">
                {BLOCK_TYPES.map((bt) => {
                  const Icon = bt.icon;
                  return (
                    <button key={bt.type} onClick={() => addBlock(bt.type)}
                      className="flex flex-col items-center gap-1 rounded-xl border border-border/60 p-3 text-xs text-muted-foreground hover:text-foreground hover:border-[#BAA05E]/40 hover:bg-[#BAA05E]/5 transition-all">
                      <Icon className="h-4 w-4" />
                      {bt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Variáveis */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>Variáveis</p>
              <p className="text-[11px] text-muted-foreground">Clique pra copiar e cole no bloco</p>
              <div className="space-y-1">
                {VARIABLES.map((v) => (
                  <button key={v.key} onClick={() => { navigator.clipboard.writeText(`{{${v.key}}}`); toast.success(`{{${v.key}}} copiado`); }}
                    className="w-full text-left flex items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-muted transition-colors">
                    <span className="text-muted-foreground">{v.label}</span>
                    <code className="text-[10px] font-mono" style={{ color: WARM }}>{`{{${v.key}}}`}</code>
                  </button>
                ))}
              </div>
            </div>

            {/* Teste rápido */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>Teste rápido</p>
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                placeholder="seu@email.com" className={inputCls} />
              <button onClick={handleTest} disabled={sendingTest}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors">
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar teste
              </button>
            </div>
          </aside>

          {/* ── Main area ── */}
          <main className="min-w-0">
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  {showPreview ? "Preview" : showHtmlSource ? "Código HTML" : "Blocos do email"}
                </h2>
                <span className="text-[10px] text-muted-foreground">{blocks.length} blocos · {html.length} chars</span>
              </div>

              {showPreview ? (
                <div className="bg-[#f4f4f5] p-6">
                  <iframe title="Preview" className="w-full bg-white rounded-xl shadow-sm" style={{ minHeight: 540 }} srcDoc={html} />
                </div>
              ) : showHtmlSource ? (
                <textarea value={html} readOnly className="w-full font-mono text-xs p-5 border-0 outline-none resize-y bg-card text-muted-foreground" style={{ minHeight: 500 }} spellCheck={false} />
              ) : (
                <div className="p-5 space-y-3">
                  {blocks.length === 0 && (
                    <div className="text-center py-16 text-sm text-muted-foreground">
                      Nenhum bloco. Use o painel à esquerda pra adicionar.
                    </div>
                  )}
                  {blocks.map((block, i) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      selected={selectedBlock === block.id}
                      onSelect={() => setSelectedBlock(block.id === selectedBlock ? null : block.id)}
                      onUpdate={(u) => updateBlock(block.id, u)}
                      onRemove={() => removeBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id, -1)}
                      onMoveDown={() => moveBlock(block.id, 1)}
                      onInsertVar={(vk) => insertVariable(block.id, vk)}
                      isFirst={i === 0}
                      isLast={i === blocks.length - 1}
                    />
                  ))}
                  {/* Add block inline */}
                  <button onClick={() => setShowAddMenu(!showAddMenu)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-4 text-sm text-muted-foreground hover:text-foreground hover:border-[#BAA05E]/40 transition-all">
                    <Plus className="h-4 w-4" /> Adicionar bloco
                  </button>
                  {showAddMenu && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {BLOCK_TYPES.map((bt) => {
                        const Icon = bt.icon;
                        return (
                          <button key={bt.type} onClick={() => addBlock(bt.type)}
                            className="flex flex-col items-center gap-1 rounded-xl border border-border/60 p-3 text-xs text-muted-foreground hover:text-foreground hover:border-[#BAA05E]/40 hover:bg-[#BAA05E]/5 transition-all">
                            <Icon className="h-4 w-4" /> {bt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ── BlockEditor ─────────────────────────────────────────── */

function BlockEditor({ block, selected, onSelect, onUpdate, onRemove, onMoveUp, onMoveDown, onInsertVar, isFirst, isLast }: {
  block: Block; selected: boolean;
  onSelect: () => void; onUpdate: (u: Partial<Block>) => void;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
  onInsertVar: (v: string) => void;
  isFirst: boolean; isLast: boolean;
}) {
  const [showVars, setShowVars] = useState(false);
  const typeLabel = BLOCK_TYPES.find((t) => t.type === block.type)?.label || block.type;
  const Icon = BLOCK_TYPES.find((t) => t.type === block.type)?.icon || Type;

  return (
    <div className={`rounded-xl border transition-all ${selected ? "border-[#BAA05E] bg-[#BAA05E]/3 shadow-sm" : "border-border/60 hover:border-border"}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/40 bg-muted/20 rounded-t-xl cursor-pointer" onClick={onSelect}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground flex-1">{typeLabel}</span>

        {/* Align buttons for text/title/button/image */}
        {(block.type === "text" || block.type === "title" || block.type === "button" || block.type === "image") && (
          <div className="flex gap-0.5 mr-2">
            {(["left", "center", "right"] as const).map((a) => {
              const AIcon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
              return (
                <button key={a} onClick={(e) => { e.stopPropagation(); onUpdate({ align: a }); }}
                  className={`p-1 rounded ${block.align === a ? "bg-[#BAA05E]/15 text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"}`}>
                  <AIcon className="h-3 w-3" />
                </button>
              );
            })}
          </div>
        )}

        {/* Variable insert */}
        {(block.type === "text" || block.type === "title" || block.type === "button") && (
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowVars(!showVars); }}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted" title="Inserir variável">
              @var
            </button>
            {showVars && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 w-44">
                {VARIABLES.map((v) => (
                  <button key={v.key} onClick={(e) => { e.stopPropagation(); onInsertVar(v.key); setShowVars(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex justify-between">
                    <span>{v.label}</span>
                    <code className="text-[10px]" style={{ color: WARM }}>{`{{${v.key}}}`}</code>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="p-1 text-muted-foreground/50 hover:text-foreground disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="p-1 text-muted-foreground/50 hover:text-foreground disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-muted-foreground/50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>

      {/* Content editor */}
      {selected && (
        <div className="p-4 space-y-3">
          {block.type === "text" && (
            <textarea value={block.content || ""} onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Escreva seu texto aqui..." rows={4} className={inputCls + " resize-y"} />
          )}
          {block.type === "title" && (
            <>
              <input value={block.content || ""} onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder="Título" className={inputCls} />
              <div className="flex gap-2">
                <label className="text-[11px] text-muted-foreground pt-1">Nível:</label>
                {([1, 2, 3] as const).map((lv) => (
                  <button key={lv} onClick={() => onUpdate({ level: lv })}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                      block.level === lv ? "border-[#BAA05E] bg-[#BAA05E]/10 text-foreground" : "border-border text-muted-foreground hover:border-foreground/20"
                    }`}>H{lv}</button>
                ))}
              </div>
            </>
          )}
          {block.type === "image" && (
            <ImageBlockEditor block={block} onUpdate={onUpdate} />
          )}
          {block.type === "button" && (
            <>
              <Field label="Texto do botão" value={block.label || ""} onChange={(v) => onUpdate({ label: v })} placeholder="Clique aqui →" />
              <Field label="Link (URL)" value={block.href || ""} onChange={(v) => onUpdate({ href: v })} placeholder="https://negociaaky.com.br" />
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Cor do texto</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={block.color || "#ffffff"} onChange={(e) => onUpdate({ color: e.target.value })} className="h-8 w-8 rounded border border-border cursor-pointer" />
                    <span className="text-xs text-muted-foreground font-mono">{block.color || "#ffffff"}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Cor do fundo</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={block.bgColor || WARM} onChange={(e) => onUpdate({ bgColor: e.target.value })} className="h-8 w-8 rounded border border-border cursor-pointer" />
                    <span className="text-xs text-muted-foreground font-mono">{block.bgColor || WARM}</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {block.type === "spacer" && (
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-medium text-muted-foreground">Altura (px):</label>
              <input type="number" value={block.height || 24} onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 24 })}
                min={4} max={120} className={inputCls + " w-24"} />
            </div>
          )}
          {block.type === "divider" && (
            <p className="text-[11px] text-muted-foreground">Linha horizontal — sem opções.</p>
          )}
        </div>
      )}

      {/* Collapsed preview */}
      {!selected && (
        <div className="px-4 py-3 text-xs text-muted-foreground truncate cursor-pointer" onClick={onSelect}>
          {block.type === "text" && (block.content || "Texto vazio")}
          {block.type === "title" && <span className="font-semibold text-foreground">H{block.level}: {block.content || "Título"}</span>}
          {block.type === "image" && (block.src ? <span className="flex items-center gap-1"><Image className="h-3 w-3" /> {block.src.slice(0, 50)}...</span> : "Sem imagem")}
          {block.type === "button" && <span className="inline-flex items-center gap-1"><span className="px-2 py-0.5 rounded text-white text-[10px]" style={{ background: block.bgColor || WARM }}>{block.label || "Botão"}</span></span>}
          {block.type === "divider" && <hr className="border-border" />}
          {block.type === "spacer" && `↕ ${block.height || 24}px`}
        </div>
      )}
    </div>
  );
}

/* ── ImageBlockEditor ───────────────────────────────────── */

function ImageBlockEditor({ block, onUpdate }: { block: Block; onUpdate: (u: Partial<Block>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Tamanho máximo: 5 MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("email-assets").upload(path, file, { contentType: file.type });
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }

    const { data } = supabase.storage.from("email-assets").getPublicUrl(path);
    onUpdate({ src: data.publicUrl });
    toast.success("Imagem enviada!");
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#BAA05E]/40 py-4 text-sm font-medium transition-all hover:bg-[#BAA05E]/5 disabled:opacity-50"
        style={{ color: WARM }}
      >
        {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Upload className="h-4 w-4" /> Subir imagem do computador</>}
      </button>

      {block.src && (
        <div className="rounded-xl border border-border/60 p-2 bg-muted/20">
          <img src={block.src} alt={block.alt || ""} className="max-h-40 mx-auto rounded-lg object-contain" />
        </div>
      )}

      <Field label="URL da imagem" value={block.src || ""} onChange={(v) => onUpdate({ src: v })} placeholder="https://exemplo.com/imagem.jpg" />
      <Field label="Texto alt" value={block.alt || ""} onChange={(v) => onUpdate({ alt: v })} placeholder="Descrição da imagem" />
      <Field label="Link ao clicar (opcional)" value={block.href || ""} onChange={(v) => onUpdate({ href: v })} placeholder="https://negociaaky.com.br" />
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all";

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}
