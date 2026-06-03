import { useEffect, useRef, useState } from "react";
import { X, Save, Loader2, Plus, Trash2, LayoutGrid, Camera, ImageIcon, MapPin, DollarSign, Ruler, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const TIPOS_ESPACO = ["Loja", "Sala", "Box", "Quiosque", "Sobreloja", "Coworking", "Restaurante", "Outro"];
const ANDARES = ["Térreo", "Subsolo", "1º andar", "2º andar", "3º andar", "4º andar", "5º andar", "Cobertura", "Outro"];

function formatBRL(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  const n = Number(digits) / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}
function parseBRL(masked: string): string {
  // retorna apenas o número (com decimais) como string para o banco
  const digits = masked.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toString();
}

interface Espaco {
  id?: string; // sem id = novo espaço
  numero: string;
  tipo: string;
  area_m2: string;
  valor_aluguel: string;
  andar: string;
  disponivel: boolean;
  descricao: string;
}

const EMPTY_ESPACO: Espaco = {
  numero: "", tipo: "Loja", area_m2: "", valor_aluguel: "", andar: "", disponivel: true, descricao: "",
};

interface Props {
  galeriaId: string;
  onClose: () => void;
  onSaved: () => void;
}

const EditGaleriaModal = ({ galeriaId, onClose, onSaved }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [espacos, setEspacos] = useState<Espaco[]>([]);
  // IDs de espaços que existiam e devem ser excluídos no save
  const [espacosToDelete, setEspacosToDelete] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: gal }, { data: esps }] = await Promise.all([
        supabase.from("galerias").select("*").eq("id", galeriaId).single(),
        supabase.from("espacos_galeria").select("*").eq("galeria_id", galeriaId).order("numero"),
      ]);
      if (gal) {
        setNome(gal.nome || "");
        setEndereco(gal.endereco || "");
        setCidade(gal.cidade || "");
        setEstado(gal.estado || "");
        setDescricao(gal.descricao || "");
        setImagemUrl(gal.imagem || null);
      }
      type EspacoRow = { id: string; numero: string; tipo: string; area_m2: number | null; valor_aluguel: number | null; andar: string | null; disponivel: boolean | null; descricao: string | null };
      setEspacos(((esps as EspacoRow[]) || []).map((e) => ({
        id: e.id,
        numero: e.numero || "",
        tipo: e.tipo || "Loja",
        area_m2: e.area_m2 != null ? String(e.area_m2) : "",
        valor_aluguel: e.valor_aluguel != null ? String(e.valor_aluguel) : "",
        andar: e.andar || "",
        disponivel: e.disponivel ?? true,
        descricao: e.descricao || "",
      })));
      setLoading(false);
    })();
  }, [galeriaId]);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingPhoto(f);
    setPendingPreview(URL.createObjectURL(f));
  };

  const addEspaco = () => setEspacos((prev) => [...prev, { ...EMPTY_ESPACO }]);
  const removeEspaco = (idx: number) => {
    setEspacos((prev) => {
      const target = prev[idx];
      if (target.id) setEspacosToDelete((d) => [...d, target.id!]);
      return prev.filter((_, i) => i !== idx);
    });
  };
  const updateEspaco = (idx: number, patch: Partial<Espaco>) => {
    setEspacos((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const handleSave = async () => {
    setErr("");
    if (!nome.trim()) { setErr("Nome da galeria é obrigatório"); return; }
    if (!cidade.trim()) { setErr("Cidade é obrigatória"); return; }
    setSaving(true);

    // 1. Atualiza galeria
    let finalImagem = imagemUrl;
    if (pendingPhoto) {
      const path = `galerias/${galeriaId}-${Date.now()}.jpg`;
      const up = await supabase.storage.from("lead-images").upload(path, pendingPhoto, { upsert: true, contentType: pendingPhoto.type });
      if (!up.error) {
        const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
        finalImagem = urlData.publicUrl;
      }
    }

    const { error: gErr } = await supabase
      .from("galerias")
      .update({
        nome: nome.trim(),
        endereco: endereco.trim() || cidade.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        descricao: descricao.trim() || null,
        imagem: finalImagem,
      })
      .eq("id", galeriaId);

    if (gErr) {
      setSaving(false);
      setErr("Erro ao salvar galeria: " + gErr.message);
      return;
    }

    // 2. Exclui espaços marcados
    if (espacosToDelete.length > 0) {
      await supabase.from("espacos_galeria").delete().in("id", espacosToDelete);
    }

    // 3. Upserta espaços
    const toUpdate = espacos.filter((e) => e.id && e.numero.trim());
    const toInsert = espacos.filter((e) => !e.id && e.numero.trim());

    if (toUpdate.length > 0) {
      // Atualiza um a um (PostgREST não tem bulk update por id diferente)
      await Promise.all(toUpdate.map((e) =>
        supabase.from("espacos_galeria").update({
          numero: e.numero,
          tipo: e.tipo || "Loja",
          area_m2: e.area_m2 ? Number(e.area_m2) : null,
          valor_aluguel: e.valor_aluguel ? Number(e.valor_aluguel) : null,
          andar: e.andar || null,
          disponivel: e.disponivel,
          descricao: e.descricao || null,
        }).eq("id", e.id!)
      ));
    }

    if (toInsert.length > 0) {
      await supabase.from("espacos_galeria").insert(toInsert.map((e) => ({
        galeria_id: galeriaId,
        numero: e.numero,
        tipo: e.tipo || "Loja",
        area_m2: e.area_m2 ? Number(e.area_m2) : null,
        valor_aluguel: e.valor_aluguel ? Number(e.valor_aluguel) : null,
        andar: e.andar || null,
        disponivel: e.disponivel,
        descricao: e.descricao || null,
      })));
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-start sm:justify-center bg-black/50 backdrop-blur-sm overflow-y-auto sm:py-6 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl bg-card shadow-2xl min-h-full sm:min-h-0 sm:rounded-2xl sm:border sm:border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <LayoutGrid className="h-5 w-5 text-violet-700" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Editar Galeria</h2>
              <p className="text-xs text-muted-foreground">Atualize dados da galeria e gerencie os espaços</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {err && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{err}</div>
            )}

            {/* Foto */}
            <div>
              <Label className="text-sm font-semibold flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Foto da galeria</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="mt-2 cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden"
                style={{ height: 140 }}
              >
                {(pendingPreview || imagemUrl) ? (
                  <img src={pendingPreview || imagemUrl || ""} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Clique para adicionar / trocar foto</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            </div>

            {/* Dados da galeria */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Dados da galeria</h3>
              <div>
                <Label>Nome da galeria <span className="text-destructive">*</span></Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Galeria Centro Empresarial"
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label>Cidade <span className="text-destructive">*</span></Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="São Paulo"
                      className="pl-10 capitalize"
                    />
                  </div>
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Select value={estado || "_none"} onValueChange={(v) => setEstado(v === "_none" ? "" : v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Endereço / Bairro</Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Ex: Rua Augusta, 200 – Consolação"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Descreva o público, fluxo, diferenciais, infraestrutura..."
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Espaços */}
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-violet-700" /> Espaços ({espacos.length})
                </h3>
                <button type="button" onClick={addEspaco}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-3 w-3" /> Adicionar espaço
                </button>
              </div>
              {espacos.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-violet-300/50 rounded-lg bg-card">
                  <LayoutGrid className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground mt-2">Nenhum espaço cadastrado</p>
                  <button type="button" onClick={addEspaco}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-3 w-3" /> Adicionar primeiro espaço
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {espacos.map((esp, idx) => (
                    <div key={esp.id || `new-${idx}`} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {esp.numero ? `Espaço ${esp.numero}` : esp.id ? "Espaço sem número" : "Novo espaço"}
                          </span>
                          {esp.disponivel ? (
                            <span className="rounded-full bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 uppercase">Disponível</span>
                          ) : (
                            <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 uppercase">Ocupado</span>
                          )}
                        </div>
                        <button type="button" onClick={() => removeEspaco(idx)} className="text-muted-foreground hover:text-destructive" title="Remover espaço">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Descrição do espaço (linha inteira) */}
                      <div className="mb-3">
                        <Label className="text-[10px] uppercase tracking-wide">Descrição do espaço</Label>
                        <Textarea
                          value={esp.descricao}
                          onChange={(e) => updateEspaco(idx, { descricao: e.target.value })}
                          placeholder="Ex: Loja de esquina com vitrine dupla, alto fluxo de clientes no corredor principal..."
                          rows={2}
                          className="mt-1 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {/* Número */}
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide">Número</Label>
                          <div className="relative mt-1">
                            <Hash className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={esp.numero}
                              onChange={(e) => updateEspaco(idx, { numero: e.target.value })}
                              placeholder="34"
                              className="pl-8 text-sm h-9"
                            />
                          </div>
                        </div>

                        {/* Tipo (Select) */}
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide">Tipo</Label>
                          <Select value={esp.tipo || "Loja"} onValueChange={(v) => updateEspaco(idx, { tipo: v })}>
                            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIPOS_ESPACO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Andar (Select) */}
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide">Andar</Label>
                          <Select value={esp.andar || "_none"} onValueChange={(v) => updateEspaco(idx, { andar: v === "_none" ? "" : v })}>
                            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">—</SelectItem>
                              {ANDARES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Área m² */}
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide">Área (m²)</Label>
                          <div className="relative mt-1">
                            <Ruler className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={esp.area_m2}
                              onChange={(e) => updateEspaco(idx, { area_m2: e.target.value })}
                              placeholder="25"
                              className="pl-8 text-sm h-9"
                            />
                          </div>
                        </div>

                        {/* Aluguel (R$ com máscara) */}
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide">Aluguel mensal</Label>
                          <div className="relative mt-1">
                            <DollarSign className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={esp.valor_aluguel ? formatBRL(String(Math.round(Number(esp.valor_aluguel) * 100))) : ""}
                              onChange={(e) => updateEspaco(idx, { valor_aluguel: parseBRL(e.target.value) })}
                              placeholder="R$ 0,00"
                              className="pl-8 text-sm h-9"
                            />
                          </div>
                        </div>

                        {/* Disponível (Toggle visual) */}
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide">Status</Label>
                          <button
                            type="button"
                            onClick={() => updateEspaco(idx, { disponivel: !esp.disponivel })}
                            className={`mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors ${
                              esp.disponivel
                                ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                : "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${esp.disponivel ? "bg-green-500" : "bg-amber-500"}`} />
                            {esp.disponivel ? "Disponível" : "Ocupado"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4" /> Salvar Galeria</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditGaleriaModal;
