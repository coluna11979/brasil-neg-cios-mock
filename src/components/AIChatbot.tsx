import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Sparkles, Paperclip, ImageIcon, Loader2 } from "lucide-react";
import { addLead } from "@/stores/leadStore";
import { callClaude } from "@/lib/anthropic";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/uazapi";

const AI_SYSTEM_PROMPT = `Você é a Sofia, consultora da NegociaAky — plataforma de compra, venda e aluguel de negócios, pontos comerciais e terrenos em São Paulo.

SUA PERSONALIDADE:
- Simpática, direta e acolhedora — fala como gente, não como robô
- Linguagem simples do dia a dia: tuteia, usa "você", frases curtas
- NUNCA use termos complicados como: M&A, PME, múltiplos, due diligence, ativo, portfolio, lastro
- Fale como falaria com um dono de padaria, salão ou loja de roupas — simples e claro
- Exemplos de linguagem certa: "quanto você tem pra investir?", "há quanto tempo tá pensando nisso?", "qual tipo de negócio te interessa?"

O QUE A NEGÓCIOJÁ FAZ (você PRECISA saber isso):
1. Ajuda quem quer COMPRAR um negócio já em funcionamento (restaurante, salão, loja, clínica, etc.)
2. Ajuda quem quer VENDER seu negócio
3. Ajuda quem procura um PONTO COMERCIAL pra alugar (lojas, salas, boxes em galerias)
4. Ajuda quem quer VENDER UM TERRENO COMERCIAL em São Paulo
5. Conecta donos de negócio com corretores especializados

SEU OBJETIVO:
Entender o que a pessoa precisa e pegar o contato dela (nome + WhatsApp) pra um consultor ligar. Você aquece, não fecha — o consultor fecha.

COMO QUALIFICAR (de forma natural, uma pergunta por vez):
- O que ela quer: comprar, vender, alugar, vender terreno?
- Qual tipo de negócio ou segmento?
- Quanto tem disponível pra investir? (só pra quem quer comprar)
- Quando quer resolver isso?

DICAS IMPORTANTES:
- Sempre faça UMA pergunta por mensagem — nunca várias de uma vez
- Se a pessoa disser "só tô olhando": normalize — "faz sentido! A maioria começa assim. Me conta, o que você tá buscando?"
- Crie urgência de forma natural: "negócios bons saem rápido por aqui"
- Após 4 trocas sem pegar contato, ofereça: "posso te mandar opções direto no WhatsApp, quer?"
- Quando souber o que a pessoa quer, ofereça conectar com consultor

FRASES PARA CAPTURAR O CONTATO:
- "Posso te mandar as melhores opções direto no seu WhatsApp agora, quer?"
- "Tem uma oportunidade aqui que parece a sua cara — me passa seu nome e WhatsApp?"
- "Nosso consultor pode te ligar hoje, é rapidinho — qual seu nome?"

REFERÊNCIAS DE PREÇO (use com naturalidade, sem inventar):
- Restaurantes e lanchonetes: de R$ 80 mil a R$ 400 mil
- Salões de beleza: de R$ 30 mil a R$ 150 mil
- Pontos em galerias: a partir de R$ 800/mês
- Terrenos comerciais: depende da localização e tamanho, consultor passa os detalhes

REGRAS QUE NÃO PODEM SER QUEBRADAS:
- Máximo 3 linhas por resposta
- Sem listas com tracinhos ou números — escreva em parágrafo normal
- Use **negrito** só em valores ou palavras-chave
- Só atende São Paulo e Grande SP
- Se pedirem outro estado: "por enquanto só atendemos São Paulo, mas posso te conectar com nosso time!"
- Nunca invente valores ou endereços específicos de imóveis reais`;

interface Message {
  id: string;
  text: string;
  sender: "bot" | "user";
  options?: ChatOption[];
}

interface ChatOption {
  label: string;
  action: string;
}

// Etapas de captação de lead
type LeadStep = "none" | "nome" | "email" | "telefone";

type VendedorStep = "none" | "setor" | "bairro" | "preco" | "faturamento" | "descricao" | "nome" | "telefone";

interface VendedorData {
  tipo: string;
  setor: string;
  bairro: string;
  preco: string;
  faturamento: string;
  descricao: string;
  nome: string;
  telefone: string;
}

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  text: "Oi! Sou a Sofia, consultora da **NegociaAky** 😊 O que você está buscando hoje?",
  sender: "bot",
  options: [
    { label: "🛒 Quero comprar um negócio", action: "comprar" },
    { label: "💰 Quero vender meu negócio", action: "vender" },
    { label: "🏬 Procuro ponto comercial", action: "galeria" },
    { label: "🏗️ Quero vender um terreno", action: "terreno" },
    { label: "❓ Tenho uma dúvida", action: "duvida" },
  ],
};

function getBotResponse(action: string): Message {
  const id = `bot-${Date.now()}`;

  const responses: Record<string, Message> = {
    comprar: {
      id,
      text: "Boa escolha! 🛒 Temos negócios em vários segmentos aqui em São Paulo. Qual tipo de negócio você está pensando?",
      sender: "bot",
      options: [
        { label: "🍔 Alimentação", action: "cat-alimentacao" },
        { label: "💅 Saúde e Beleza", action: "cat-saude-beleza" },
        { label: "💻 Tecnologia / Serviços", action: "cat-tecnologia" },
        { label: "🛍️ Varejo / Loja", action: "cat-varejo" },
        { label: "🔍 Ver todos", action: "ver-todos" },
      ],
    },
    vender: {
      id,
      text: "Ótimo! Vou te ajudar a divulgar. 🏷️ O que você quer anunciar?",
      sender: "bot",
      options: [
        { label: "🏪 Negócio em funcionamento", action: "vender-tipo-negocio" },
        { label: "🏬 Ponto comercial", action: "vender-tipo-ponto" },
        { label: "🏗️ Terreno comercial", action: "vender-tipo-terreno" },
      ],
    },
    galeria: {
      id,
      text: "Temos pontos comerciais em galerias de São Paulo — lojas, boxes e salas a partir de **R$ 800/mês**. Quer ver as opções disponíveis?",
      sender: "bot",
      options: [
        { label: "🏬 Ver pontos disponíveis", action: "nav-galerias" },
        { label: "💬 Falar com consultor", action: "contato-humano" },
      ],
    },
    terreno: {
      id,
      text: "Perfeito! Trabalhamos com venda de terrenos comerciais em São Paulo. 🏗️ Nosso consultor pode te ajudar a encontrar compradores qualificados. Quer preencher um formulário rápido ou prefere falar direto com alguém?",
      sender: "bot",
      options: [
        { label: "📋 Preencher formulário", action: "nav-terreno" },
        { label: "💬 Falar com consultor", action: "contato-humano" },
      ],
    },
    duvida: {
      id,
      text: "Claro, pode perguntar! 😊 O que você quer saber?",
      sender: "bot",
      options: [
        { label: "Como funciona?", action: "como-funciona" },
        { label: "É seguro comprar aqui?", action: "seguranca" },
        { label: "Quero falar com alguém", action: "contato-humano" },
        { label: "Outra dúvida", action: "outra-duvida" },
      ],
    },
    "como-funciona": {
      id,
      text: "É bem simples! Você encontra o negócio ou ponto que quer, entra em contato e nosso consultor te acompanha em tudo — da visita até o fechamento. Sem complicação. 👍",
      sender: "bot",
      options: [
        { label: "🛒 Quero comprar", action: "comprar" },
        { label: "💰 Quero vender", action: "vender" },
        { label: "Voltar ao início", action: "inicio" },
      ],
    },
    seguranca: {
      id,
      text: "Sim! Todos os anúncios são verificados pela nossa equipe e você tem suporte do início ao fim. Já ajudamos centenas de pessoas a comprar e vender negócios em SP com segurança. ✅",
      sender: "bot",
      options: [
        { label: "Ver negócios disponíveis", action: "ver-todos" },
        { label: "Voltar ao início", action: "inicio" },
      ],
    },
    "contato-humano": {
      id,
      text: "Ótimo! Vou te conectar com um consultor agora. 😊 Primeiro, qual é o seu **nome**?",
      sender: "bot",
    },
    "outra-duvida": {
      id,
      text: "Pode perguntar, estou aqui! 😊",
      sender: "bot",
    },
    inicio: { ...INITIAL_MESSAGE, id },
    "lead-salvo": {
      id,
      text: "Tudo certo! ✅ Um consultor vai entrar em contato com você em breve pelo WhatsApp. Enquanto isso, dá uma olhada nas oportunidades!",
      sender: "bot",
      options: [
        { label: "Ver negócios", action: "ver-todos" },
        { label: "Ver pontos comerciais", action: "nav-galerias" },
      ],
    },
    "resposta-generica": {
      id,
      text: "Entendi! Posso te ajudar a encontrar o que você precisa ou te conectar com um consultor. O que prefere?",
      sender: "bot",
      options: [
        { label: "💬 Falar com consultor", action: "contato-humano" },
        { label: "🔍 Ver negócios", action: "ver-todos" },
        { label: "Voltar ao início", action: "inicio" },
      ],
    },
  };

  if (action.startsWith("cat-")) {
    const cat = action.replace("cat-", "");
    return {
      id,
      text: "Boa escolha! Tenho boas opções nesse segmento aqui em SP. Deixa eu te mostrar 👇",
      sender: "bot",
      options: [
        { label: "Ver oportunidades", action: `nav-busca-${cat}` },
        { label: "Outro segmento", action: "comprar" },
        { label: "💬 Falar com consultor", action: "contato-humano" },
      ],
    };
  }

  return responses[action] || responses["resposta-generica"];
}

// Contexto de qualificação acumulado durante a conversa
interface LeadContext {
  intencao: string;
  categoria: string;
  mensagensLivres: string[];
  imagens: string[]; // URLs públicas das imagens enviadas
}

const AIChatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiMode, setAiMode] = useState(false);

  // Fluxo de captação passo a passo
  const [leadStep, setLeadStep] = useState<LeadStep>("none");
  const [leadData, setLeadData] = useState({ nome: "", email: "", telefone: "" });

  // Fluxo de qualificação do vendedor
  const [vendedorStep, setVendedorStep] = useState<VendedorStep>("none");
  const [vendedorData, setVendedorData] = useState<VendedorData>({
    tipo: "", setor: "", bairro: "", preco: "", faturamento: "", descricao: "", nome: "", telefone: "",
  });

  // Contexto de qualificação
  const [leadContext, setLeadContext] = useState<LeadContext>({
    intencao: "",
    categoria: "",
    mensagensLivres: [],
    imagens: [],
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const closeChat = () => setIsOpen(false);

  const resetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setLeadStep("none");
    setLeadData({ nome: "", email: "", telefone: "" });
    setLeadContext({ intencao: "", categoria: "", mensagensLivres: [], imagens: [] });
    setVendedorStep("none");
    setVendedorData({ tipo: "", setor: "", bairro: "", preco: "", faturamento: "", descricao: "", nome: "", telefone: "" });
    setAiMode(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida tamanho (máx 5MB) e tipo
    if (file.size > 5 * 1024 * 1024) {
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, text: "Imagem muito grande! Envie uma foto com menos de 5MB.", sender: "bot" },
      ]);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, text: "Só aceito imagens (JPG, PNG, WEBP).", sender: "bot" },
      ]);
      return;
    }

    // Mostra preview local imediatamente (URL temporária)
    const localUrl = URL.createObjectURL(file);
    const msgId = `img-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: msgId, text: `[IMAGE]:${localUrl}`, sender: "user" },
    ]);

    setUploadingImage(true);

    try {
      // Upload para Supabase Storage
      const ext = file.name.split(".").pop() || "jpg";
      const path = `chat/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("lead-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("lead-images")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      // Substitui preview local pela URL pública
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, text: `[IMAGE]:${publicUrl}` } : m
        )
      );

      // Salva URL no contexto do lead
      setLeadContext((prev) => ({
        ...prev,
        imagens: [...prev.imagens, publicUrl],
      }));

      // Resposta automática do bot
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            text: "Imagem recebida! 📸 Nosso consultor vai analisá-la. Algum detalhe importante que queira destacar?",
            sender: "bot",
          },
        ]);
      }, 500);

    } catch (err) {
      console.error("[AIChatbot] Erro ao fazer upload:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          text: "Não consegui enviar a imagem agora. Pode continuar a conversa normalmente!",
          sender: "bot",
        },
      ]);
    } finally {
      setUploadingImage(false);
      // Limpa o input para permitir reenviar a mesma imagem
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addBotMessage = (action: string) => {
    setIsTyping(true);

    // Captura contexto de qualificação a partir do action clicado
    if (action === "comprar") {
      setLeadContext((prev) => ({ ...prev, intencao: "Comprador de negócio" }));
    } else if (action === "vender") {
      setLeadContext((prev) => ({ ...prev, intencao: "Vendedor / quer anunciar" }));
    } else if (action === "galeria") {
      setLeadContext((prev) => ({ ...prev, intencao: "Busca ponto comercial / galeria" }));
    } else if (action === "terreno") {
      setLeadContext((prev) => ({ ...prev, intencao: "Vende terreno comercial" }));
    } else if (action === "duvida") {
      setLeadContext((prev) => ({ ...prev, intencao: "Tem dúvida geral" }));
    } else if (action.startsWith("cat-")) {
      const catMap: Record<string, string> = {
        "cat-alimentacao": "Alimentação",
        "cat-saude-beleza": "Saúde e Beleza",
        "cat-tecnologia": "Tecnologia",
        "cat-varejo": "Varejo",
      };
      const catLabel = catMap[action] || action.replace("cat-", "");
      setLeadContext((prev) => ({ ...prev, categoria: catLabel }));
    }

    if (action === "vender-tipo-negocio") {
      setVendedorData(prev => ({ ...prev, tipo: "Negócio em funcionamento" }));
      setLeadContext(prev => ({ ...prev, intencao: "Vendedor de negócio" }));
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: "Qual o ramo do negócio? 🏪",
          sender: "bot",
          options: [
            { label: "🍔 Alimentação", action: "vsetor-Alimentação" },
            { label: "💅 Saúde e Beleza", action: "vsetor-Saúde e Beleza" },
            { label: "💻 Tecnologia / Serviços", action: "vsetor-Tecnologia / Serviços" },
            { label: "🛍️ Varejo / Loja", action: "vsetor-Varejo / Loja" },
            { label: "🍺 Bar / Entretenimento", action: "vsetor-Bar / Entretenimento" },
            { label: "✏️ Outro ramo", action: "vsetor-outro" },
          ],
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (action === "vender-tipo-ponto") {
      setVendedorData(prev => ({ ...prev, tipo: "Ponto comercial", setor: "Ponto Comercial" }));
      setLeadContext(prev => ({ ...prev, intencao: "Vendedor de ponto comercial" }));
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: "Em qual bairro ou região de SP fica o ponto? 📍",
          sender: "bot",
        }]);
        setVendedorStep("bairro");
        setIsTyping(false);
      }, 600);
      return;
    }

    if (action === "vender-tipo-terreno") {
      setVendedorData(prev => ({ ...prev, tipo: "Terreno comercial", setor: "Terreno Comercial" }));
      setLeadContext(prev => ({ ...prev, intencao: "Vende terreno comercial" }));
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: "Em qual bairro ou região de SP fica o terreno? 📍",
          sender: "bot",
        }]);
        setVendedorStep("bairro");
        setIsTyping(false);
      }, 600);
      return;
    }

    if (action.startsWith("vsetor-")) {
      const setor = action.replace("vsetor-", "");
      if (setor === "outro") {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `bot-${Date.now()}`,
            text: "Qual é o ramo do seu negócio? Pode escrever aí 👇",
            sender: "bot",
          }]);
          setVendedorStep("setor");
          setIsTyping(false);
        }, 600);
      } else {
        setVendedorData(prev => ({ ...prev, setor }));
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `bot-${Date.now()}`,
            text: `${setor}! 👍 Em qual bairro ou região de SP fica? 📍`,
            sender: "bot",
          }]);
          setVendedorStep("bairro");
          setIsTyping(false);
        }, 600);
      }
      return;
    }

    setTimeout(() => {
      const response = getBotResponse(action);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);

      if (action === "contato-humano") setLeadStep("nome");
      if (action === "inicio") resetChat();

      if (action === "nav-anunciar") { closeChat(); navigate("/anunciar"); }
      if (action === "nav-galerias") { closeChat(); navigate("/galerias"); }
      if (action === "nav-terreno") { closeChat(); navigate("/vender-terreno"); }
      if (action === "ver-todos") { closeChat(); navigate("/busca"); }
      if (action.startsWith("nav-busca-")) {
        const cat = action.replace("nav-busca-", "");
        closeChat();
        navigate(`/busca?categoria=${cat}`);
      }
    }, 600 + Math.random() * 400);
  };

  const handleOption = (option: ChatOption) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, text: option.label, sender: "user" },
    ]);
    addBotMessage(option.action);
  };

  // Monta a mensagem rica com todo o contexto qualificado
  const buildMensagem = (): string => {
    const partes: string[] = [];
    if (leadContext.intencao) partes.push(`Intenção: ${leadContext.intencao}`);
    if (leadContext.categoria) partes.push(`Setor: ${leadContext.categoria}`);
    if (leadContext.mensagensLivres.length > 0) {
      partes.push(`Mensagem: "${leadContext.mensagensLivres.join(" | ")}"`);
    }
    if (leadContext.imagens.length > 0) {
      partes.push(`Imagens: ${leadContext.imagens.join(" , ")}`);
    }
    return partes.length > 0
      ? partes.join(" · ")
      : "Lead capturado via chat — solicitou contato com consultor";
  };

  // Placeholder dinâmico conforme etapa
  const getPlaceholder = () => {
    if (leadStep === "nome") return "Digite seu nome...";
    if (leadStep === "email") return "seu@email.com";
    if (leadStep === "telefone") return "(11) 99999-9999  ou  Enter para pular";
    if (vendedorStep === "setor") return "Ex: Padaria, Farmácia, Barbearia...";
    if (vendedorStep === "bairro") return "Ex: Mooca, Vila Mariana, Centro...";
    if (vendedorStep === "preco") return "Ex: 180000 (só números)";
    if (vendedorStep === "faturamento") return "Ex: 25000 (só números)";
    if (vendedorStep === "descricao") return "Descreva brevemente o que está vendendo...";
    if (vendedorStep === "nome") return "Digite seu nome...";
    if (vendedorStep === "telefone") return "(11) 99999-9999  ou  Enter para pular";
    return "Digite sua mensagem...";
  };

  const handleSend = async () => {
    if (!input.trim() && leadStep !== "telefone" && vendedorStep !== "telefone") return;

    const text = input.trim();
    setInput("");

    if (text) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, text, sender: "user" },
      ]);
    }

    // ── Fluxo de qualificação do VENDEDOR ─────────────────────────────────────
    if (vendedorStep === "setor") {
      const setor = text || "Outros";
      setVendedorData(prev => ({ ...prev, setor }));
      setVendedorStep("bairro");
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: `${setor}, anotado! 👍 Em qual bairro ou região de SP fica? 📍`,
          sender: "bot",
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (vendedorStep === "bairro") {
      const bairro = text || "São Paulo";
      setVendedorData(prev => ({ ...prev, bairro }));
      setVendedorStep("preco");
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: `📍 ${bairro}! Qual é o **valor pedido**? Escreve só o número (ex: 180000)`,
          sender: "bot",
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (vendedorStep === "preco") {
      const preco = text.replace(/\D/g, "") || "0";
      setVendedorData(prev => ({ ...prev, preco }));
      const isNegocio = vendedorData.tipo === "Negócio em funcionamento";
      setVendedorStep(isNegocio ? "faturamento" : "descricao");
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: isNegocio
            ? `💰 Anotado! Qual o **faturamento mensal** do negócio? (ex: 25000)\n\n_Essa info ajuda a atrair compradores sérios._`
            : `💰 Anotado! Me fala um pouco mais sobre o que você está vendendo — pode ser curto, 1 ou 2 frases. 👇`,
          sender: "bot",
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (vendedorStep === "faturamento") {
      const faturamento = text.replace(/\D/g, "") || "0";
      setVendedorData(prev => ({ ...prev, faturamento }));
      setVendedorStep("descricao");
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: `Ótimo! 📊 Agora me conta um pouco mais sobre o negócio — pode ser curto, 1 ou 2 frases. 👇`,
          sender: "bot",
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (vendedorStep === "descricao") {
      const descricao = text || "";
      setVendedorData(prev => ({ ...prev, descricao }));
      setVendedorStep("nome");
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: `Perfeito! 🙌 Já tenho quase tudo. Qual é o seu **nome**?`,
          sender: "bot",
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (vendedorStep === "nome") {
      const nome = text || "Proprietário";
      setVendedorData(prev => ({ ...prev, nome }));
      setVendedorStep("telefone");
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: `Prazer, **${nome}**! 😊 Qual seu **WhatsApp**? Assim o consultor entra em contato rapidinho.`,
          sender: "bot",
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (vendedorStep === "telefone") {
      const telefone = (text || "").replace(/\D/g, "");
      const finalVendedor = { ...vendedorData, telefone, nome: vendedorData.nome };
      setVendedorStep("none");
      setVendedorData({ tipo: "", setor: "", bairro: "", preco: "", faturamento: "", descricao: "", nome: "", telefone: "" });

      setIsTyping(true);

      try {
        // 1. Salva o lead
        const mensagemVendedor = [
          `Quer anunciar: ${finalVendedor.tipo}`,
          finalVendedor.setor ? `Setor: ${finalVendedor.setor}` : "",
          finalVendedor.bairro ? `Bairro: ${finalVendedor.bairro}` : "",
          finalVendedor.preco && finalVendedor.preco !== "0" ? `Valor pedido: R$ ${Number(finalVendedor.preco).toLocaleString("pt-BR")}` : "",
          finalVendedor.faturamento && finalVendedor.faturamento !== "0" ? `Fat. mensal: R$ ${Number(finalVendedor.faturamento).toLocaleString("pt-BR")}` : "",
          finalVendedor.descricao ? `Descrição: ${finalVendedor.descricao}` : "",
        ].filter(Boolean).join(" · ");

        await addLead({
          nome: finalVendedor.nome,
          telefone: telefone || undefined,
          mensagem: mensagemVendedor,
          origem: "chatbot-vendedor",
        });

        // 2. Cria rascunho na tabela negocios
        const precoNum = finalVendedor.preco ? Number(finalVendedor.preco) : null;
        const fatNum = finalVendedor.faturamento ? Number(finalVendedor.faturamento) : null;
        const tituloAuto = finalVendedor.setor && finalVendedor.bairro
          ? `${finalVendedor.setor} — ${finalVendedor.bairro}`
          : finalVendedor.tipo;

        await supabase.from("negocios").insert({
          titulo: tituloAuto,
          categoria: finalVendedor.setor || finalVendedor.tipo,
          tipo: "venda",
          cidade: "São Paulo",
          estado: "SP",
          preco: precoNum,
          faturamento_mensal: fatNum,
          descricao: finalVendedor.descricao || null,
          status: "rascunho",
          proprietario_nome: finalVendedor.nome,
          proprietario_telefone: telefone || null,
        });

        // 3. WhatsApp pro LEAD
        if (telefone) {
          await sendWhatsAppMessage(
            telefone,
            `Olá, *${finalVendedor.nome.split(" ")[0]}*! 👋\n\n` +
            `Recebi as informações sobre o seu anúncio na *NegociaAky*. ✅\n\n` +
            `📋 *Resumo do que vou divulgar:*\n` +
            `• Tipo: ${finalVendedor.tipo}\n` +
            (finalVendedor.setor ? `• Ramo: ${finalVendedor.setor}\n` : "") +
            (finalVendedor.bairro ? `• Local: ${finalVendedor.bairro} — SP\n` : "") +
            (precoNum ? `• Valor: R$ ${precoNum.toLocaleString("pt-BR")}\n` : "") +
            `\nNosso consultor vai revisar e publicar em breve. Qualquer dúvida, é só responder aqui! 😊`
          ).catch(() => {});
        }

        // 4. WhatsApp pro ADMIN
        const adminPhone = import.meta.env.VITE_ADMIN_PHONE;
        if (adminPhone) {
          await sendWhatsAppMessage(
            adminPhone,
            `📋 *Novo rascunho de anúncio criado!*\n\n` +
            `👤 Proprietário: *${finalVendedor.nome}*\n` +
            `📱 WhatsApp: *${telefone || "não informado"}*\n` +
            `🏷️ Tipo: *${finalVendedor.tipo}*\n` +
            (finalVendedor.setor ? `📂 Ramo: *${finalVendedor.setor}*\n` : "") +
            (finalVendedor.bairro ? `📍 Local: *${finalVendedor.bairro} — SP*\n` : "") +
            (precoNum ? `💰 Valor pedido: *R$ ${precoNum.toLocaleString("pt-BR")}*\n` : "") +
            (fatNum ? `📊 Faturamento: *R$ ${fatNum.toLocaleString("pt-BR")}/mês*\n` : "") +
            `\n⚡ Revise e publique:\nnegociaaky.com.br/admin`
          ).catch(() => {});
        }

      } catch (err) {
        console.error("[AIChatbot] Erro ao salvar rascunho:", err);
      }

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: `Tudo certo, **${vendedorData.nome.split(" ")[0] || ""}**! 🎉\n\nCriei o rascunho do seu anúncio e nosso consultor vai revisar e publicar em breve.\n\nVocê vai receber uma confirmação no WhatsApp!`,
          sender: "bot",
          options: [
            { label: "Ver anúncios parecidos", action: "ver-todos" },
            { label: "Voltar ao início", action: "inicio" },
          ],
        }]);
        setIsTyping(false);
      }, 800);
      return;
    }
    // ── Fim do fluxo do vendedor ───────────────────────────────────────────────

    // ── Fluxo de captação ──────────────────────────────────────────────────
    if (leadStep === "nome") {
      const nome = text || "Visitante";
      setLeadData((prev) => ({ ...prev, nome }));
      setLeadStep("email");
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            text: `Prazer, **${nome}**! 😊\n\nAgora me passa o seu **e-mail**:`,
            sender: "bot",
          },
        ]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (leadStep === "email") {
      if (!text.includes("@")) {
        setIsTyping(true);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-${Date.now()}`,
              text: "Hmm, esse e-mail não parece válido. Tenta de novo! 😊",
              sender: "bot",
            },
          ]);
          setIsTyping(false);
        }, 500);
        return;
      }
      setLeadData((prev) => ({ ...prev, email: text }));
      setLeadStep("telefone");
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            text: "Perfeito! 📧\n\nQual o seu **WhatsApp**? Assim o consultor pode te chamar direto!\n\n_(opcional — pressione Enter para pular)_",
            sender: "bot",
          },
        ]);
        setIsTyping(false);
      }, 600);
      return;
    }

    if (leadStep === "telefone") {
      // Limpa o telefone — salva só dígitos para o webhook do Uazapi funcionar
      const telefone = (text || "").replace(/\D/g, "");
      const finalData = { ...leadData, telefone };

      setLeadStep("none");
      setLeadData({ nome: "", email: "", telefone: "" });

      // Salva o lead com contexto completo de qualificação
      const mensagemRica = buildMensagem();
      await addLead({
        nome: finalData.nome,
        email: finalData.email,
        telefone: telefone || undefined,
        mensagem: mensagemRica,
        origem: "chatbot",
      });

      const primeiroNome = finalData.nome.split(" ")[0];

      // WhatsApp pro LEAD — confirmação imediata
      if (telefone) {
        await sendWhatsAppMessage(
          telefone,
          `Olá, *${primeiroNome}*! 👋\n\n` +
          `Recebi seu contato aqui na *NegociaAky*. ✅\n\n` +
          `Nosso consultor vai entrar em contato com você em breve pelo WhatsApp para te ajudar!\n\n` +
          `Enquanto isso, você pode ver nossas oportunidades em:\n` +
          `🔗 negociaaky.com.br`
        ).catch(() => {});
      }

      // WhatsApp pro ADMIN — alerta de novo lead
      const adminPhone = import.meta.env.VITE_ADMIN_PHONE;
      if (adminPhone) {
        const intencaoLabel = leadContext.intencao || "não identificada";
        await sendWhatsAppMessage(
          adminPhone,
          `🔔 *Novo lead pelo chat!*\n\n` +
          `👤 Nome: *${finalData.nome}*\n` +
          `📱 WhatsApp: *${telefone || "não informado"}*\n` +
          `📧 E-mail: *${finalData.email || "não informado"}*\n` +
          `🎯 Intenção: *${intencaoLabel}*\n` +
          (leadContext.categoria ? `📂 Setor: *${leadContext.categoria}*\n` : "") +
          (leadContext.mensagensLivres.length > 0 ? `💬 Disse: _"${leadContext.mensagensLivres[0]}"_\n` : "") +
          `\n⚡ Acesse o painel agora:\nnegociaaky.com.br/admin`
        ).catch(() => {});
      }

      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            text: telefone
              ? `Ótimo! Salvei tudo ✅\n\nNome: **${finalData.nome}**\nEmail: **${finalData.email}**\nWhatsApp: **${telefone}**\n\nUm consultor vai entrar em contato em breve!`
              : `Tudo certo! ✅ Salvei seu nome e e-mail.\n\nUm consultor vai entrar em contato com **${finalData.email}** em breve!`,
            sender: "bot",
            options: [
              { label: "Explorar negócios", action: "ver-todos" },
              { label: "Voltar ao início", action: "inicio" },
            ],
          },
        ]);
        setIsTyping(false);
      }, 700);
      return;
    }
    // ── Fim do fluxo de captação ───────────────────────────────────────────

    // ── Resposta IA com Gemini ─────────────────────────────────────────────
    // Salva mensagem livre no contexto de qualificação
    if (text) {
      const textoLower = text.toLowerCase();
      if (textoLower.includes("terreno") || textoLower.includes("lote") || textoLower.includes("área comercial")) {
        setLeadContext((prev) => ({ ...prev, intencao: prev.intencao || "Vende terreno / área comercial" }));
      }
      setLeadContext((prev) => ({
        ...prev,
        mensagensLivres: [...prev.mensagensLivres, text].slice(-3),
      }));
    }

    setAiMode(true);
    setIsTyping(true);

    try {
      // Monta histórico da conversa para contexto
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => `${m.sender === "bot" ? "Assistente" : "Visitante"}: ${m.text}`)
        .join("\n");

      const prompt = history
        ? `Histórico da conversa:\n${history}\n\nVisitante: ${text}`
        : `Visitante: ${text}`;

      const aiResponse = await callClaude(prompt, AI_SYSTEM_PROMPT);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          text: aiResponse,
          sender: "bot",
          options: [
            { label: "Falar com consultor", action: "contato-humano" },
            { label: "Ver negócios", action: "ver-todos" },
          ],
        },
      ]);
    } catch (e) {
      console.error("[AIChatbot] Erro Gemini:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          text: "Ops, tive um problema técnico. Posso te conectar com um consultor!",
          sender: "bot",
          options: [{ label: "Falar com consultor", action: "contato-humano" }],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // No step "telefone", Enter vazio pula o campo
      if (leadStep === "telefone" || vendedorStep === "telefone") {
        handleSend();
        return;
      }
      if (input.trim()) handleSend();
    }
  };

  const renderMessage = (text: string) => {
    // Detecta mensagem de imagem
    if (text.startsWith("[IMAGE]:")) {
      const url = text.replace("[IMAGE]:", "");
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="imagem enviada"
            className="max-w-[200px] rounded-xl border border-white/20 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </a>
      );
    }
    // Renderização de texto com markdown básico
    return text.split("\n").map((line, i) => (
      <span key={i}>
        {i > 0 && <br />}
        {line.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_)/).map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          if (part.startsWith("_") && part.endsWith("_"))
            return <em key={j} className="text-muted-foreground text-xs">{part.slice(1, -1)}</em>;
          if (part.startsWith("*") && part.endsWith("*"))
            return <em key={j}>{part.slice(1, -1)}</em>;
          return <span key={j}>{part}</span>;
        })}
      </span>
    ));
  };

  // Cor do input conforme etapa
  const inputFocusClass =
    leadStep === "telefone"
      ? "focus:ring-green-500/20 focus:border-green-500"
      : "focus:ring-primary/20 focus:border-primary";

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={openChat}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          aria-label="Fale conosco"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute h-14 w-14 animate-ping rounded-full bg-primary opacity-20" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-5 right-5 z-50 flex w-[340px] flex-col rounded-2xl border border-border bg-card shadow-2xl animate-fade-in sm:w-[380px]"
          style={{ maxHeight: "min(520px, calc(100vh - 100px))" }}
        >
          {/* Header */}
          <div className="gradient-hero flex items-center justify-between rounded-t-2xl px-4 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-white">Fale Conosco</p>
                  {aiMode && (
                    <span className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      <Sparkles className="h-2.5 w-2.5" /> IA
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] text-white/70">Online agora</span>
                </div>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Fechar chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.sender === "bot" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md shadow-sm"
                    }`}
                  >
                    {renderMessage(msg.text)}
                  </div>
                  {msg.sender === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {msg.options && (
                  <div className="mt-2 ml-9 flex flex-wrap gap-1.5">
                    {msg.options.map((opt) => (
                      <button
                        key={opt.action}
                        onClick={() => handleOption(opt)}
                        className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-card border border-border px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card rounded-b-2xl p-3 shrink-0">
            {/* Indicador de etapa */}
            {leadStep !== "none" && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className={`h-1.5 w-1.5 rounded-full ${leadStep === "nome" ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <div className={`h-1.5 w-1.5 rounded-full ${leadStep === "email" ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <div className={`h-1.5 w-1.5 rounded-full ${leadStep === "telefone" ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <span className="text-[10px] text-muted-foreground ml-1">
                  {leadStep === "nome" && "1/3 — Nome"}
                  {leadStep === "email" && "2/3 — E-mail"}
                  {leadStep === "telefone" && "3/3 — WhatsApp (opcional)"}
                </span>
              </div>
            )}
            {vendedorStep !== "none" && (
              <div className="flex items-center gap-1.5 mb-2 px-1">
                {(["setor","bairro","preco","faturamento","descricao","nome","telefone"] as VendedorStep[]).map((s) => (
                  <div key={s} className={`h-1.5 w-1.5 rounded-full ${vendedorStep === s ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">
                  {vendedorStep === "setor" && "Ramo do negócio"}
                  {vendedorStep === "bairro" && "Localização"}
                  {vendedorStep === "preco" && "Valor pedido"}
                  {vendedorStep === "faturamento" && "Faturamento"}
                  {vendedorStep === "descricao" && "Descrição"}
                  {vendedorStep === "nome" && "Seu nome"}
                  {vendedorStep === "telefone" && "WhatsApp (opcional)"}
                </span>
              </div>
            )}

            {/* Input de imagem oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            <div className="flex items-center gap-2">
              {/* Botão de anexar imagem */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Enviar imagem"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-primary transition-colors disabled:opacity-40"
              >
                {uploadingImage
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Paperclip className="h-4 w-4" />
                }
              </button>

              <input
                ref={inputRef}
                type={leadStep === "email" ? "email" : leadStep === "telefone" ? "tel" : "text"}
                placeholder={getPlaceholder()}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 ${inputFocusClass}`}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() && leadStep !== "telefone" && vendedorStep !== "telefone"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Dica de imagem */}
            {leadContext.imagens.length === 0 && leadStep === "none" && (
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
                <ImageIcon className="inline h-2.5 w-2.5 mr-0.5" />
                Clique no clipe para enviar fotos
              </p>
            )}
            {leadContext.imagens.length > 0 && (
              <p className="mt-1.5 text-center text-[10px] text-green-600">
                ✓ {leadContext.imagens.length} imagem{leadContext.imagens.length > 1 ? "ns" : ""} anexada{leadContext.imagens.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
