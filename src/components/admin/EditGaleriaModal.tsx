import { useEffect, useRef, useState } from "react";
import { X, Save, Loader2, Plus, Trash2, LayoutGrid, Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

interface Espaco {
  id?: string; // sem id = novo espaço
  numero: string;
  tipo: string;
  area_m2: string;
  valor_aluguel: string;
  andar: string;
  disponivel: boolean;
}

const EMPTY_ESPACO: Espaco = {
  numero: "", tipo: "Loja", area_m2: "", valor_aluguel: "", andar: "", disponivel: true,
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
      type EspacoRow = { id: string; numero: string; tipo: string; area_m2: number | null; valor_aluguel: number | null; andar: string | null; disponivel: boolean | null };
      setEspacos(((esps as EspacoRow[]) || []).map((e) => ({
        id: e.id,
        numero: e.numero || "",
        tipo: e.tipo || "Loja",
        area_m2: e.area_m2 != null ? String(e.area_m2) : "",
        valor_aluguel: e.valor_aluguel != null ? String(e.valor_aluguel) : "",
        andar: e.andar || "",
        disponivel: e.disponivel ?? true,
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
      })));
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl">
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
                <Label>Nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Cidade *</Label>
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Input value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label>Endereço / Região</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="mt-1.5" />
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
                <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum espaço — clique em "Adicionar"</p>
              ) : (
                <div className="space-y-3">
                  {espacos.map((esp, idx) => (
                    <div key={esp.id || `new-${idx}`} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-foreground">
                          {esp.id ? `Espaço ${esp.numero || `#${idx + 1}`}` : `Novo espaço ${idx + 1}`}
                        </span>
                        <button type="button" onClick={() => removeEspaco(idx)} className="text-muted-foreground hover:text-destructive" title="Remover">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Input placeholder="Número (12)" value={esp.numero}
                          onChange={(e) => updateEspaco(idx, { numero: e.target.value })} />
                        <Input placeholder="Tipo (Loja, Sala...)" value={esp.tipo}
                          onChange={(e) => updateEspaco(idx, { tipo: e.target.value })} />
                        <Input placeholder="Andar" value={esp.andar}
                          onChange={(e) => updateEspaco(idx, { andar: e.target.value })} />
                        <Input type="number" placeholder="Área m²" value={esp.area_m2}
                          onChange={(e) => updateEspaco(idx, { area_m2: e.target.value })} />
                        <Input type="number" placeholder="R$ aluguel" value={esp.valor_aluguel}
                          onChange={(e) => updateEspaco(idx, { valor_aluguel: e.target.value })} />
                        <label className="flex items-center gap-2 text-xs text-foreground">
                          <input type="checkbox" checked={esp.disponivel}
                            onChange={(e) => updateEspaco(idx, { disponivel: e.target.checked })} />
                          Disponível
                        </label>
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
