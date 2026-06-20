import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import CorretorProtectedRoute from "@/components/corretor/CorretorProtectedRoute";
import GlobalCaptureWidgets from "@/components/GlobalCaptureWidgets";
import { BuyerProvider } from "@/contexts/BuyerContext";
import BuyerAuthModal from "@/components/BuyerAuthModal";
import { CompareProvider } from "@/contexts/CompareContext";
import CompareBar from "@/components/CompareBar";
import { FloatingAgentHost } from "@/agents-platform/components/FloatingAgentHost";

const Index = lazy(() => import("./pages/Index"));
const Busca = lazy(() => import("./pages/Busca"));
const Anuncio = lazy(() => import("./pages/Anuncio"));
const Contato = lazy(() => import("./pages/Contato"));
const Anunciar = lazy(() => import("./pages/Anunciar"));
const Galerias = lazy(() => import("./pages/Galerias"));
const Links = lazy(() => import("./pages/Links"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminLeads = lazy(() => import("./pages/admin/Leads"));
const AdminPipeline = lazy(() => import("./pages/admin/Pipeline"));
const AdminWhatsApp = lazy(() => import("./pages/admin/WhatsAppCRM"));
const AdminNegocios = lazy(() => import("./pages/admin/Negocios"));
const AdminCorretores = lazy(() => import("./pages/admin/Corretores"));
const AdminCorretorDetail = lazy(() => import("./pages/admin/CorretorDetail"));
const AdminUsuarios = lazy(() => import("./pages/admin/Usuarios"));
const Obrigado = lazy(() => import("./pages/Obrigado"));
const VenderNegocio = lazy(() => import("./pages/VenderNegocio"));
const SejaCorretor = lazy(() => import("./pages/SejaCorretor"));
const MeusFavoritos = lazy(() => import("./pages/MeusFavoritos"));
const ImoveisComerciais = lazy(() => import("./pages/ImoveisComerciais"));
const Comparar = lazy(() => import("./pages/Comparar"));

// Corretor pages
const VenderTerreno = lazy(() => import("./pages/VenderTerreno"));
const CorretorLogin = lazy(() => import("./pages/corretor/Login"));
const CorretorMensagens = lazy(() => import("./pages/corretor/Mensagens"));
const CorretorLeads = lazy(() => import("./pages/corretor/Leads"));
const CorretorPipeline = lazy(() => import("./pages/corretor/Pipeline"));
const CorretorMeusNegocios = lazy(() => import("./pages/corretor/MeusNegocios"));
const CorretorDesempenho = lazy(() => import("./pages/corretor/Desempenho"));
const CorretorMateriais = lazy(() => import("./pages/corretor/Materiais"));
const CorretorRedesSociais = lazy(() => import("./pages/corretor/RedesSociais"));
const CorretorCalculadoraROI = lazy(() => import("./pages/corretor/CalculadoraROI"));
const CorretorDashboard = lazy(() => import("./pages/corretor/Dashboard"));
const CorretorPerfil = lazy(() => import("./pages/corretor/Perfil"));
const CorretorNovaSenha = lazy(() => import("./pages/corretor/NovaSenha"));
const AdminMateriais = lazy(() => import("./pages/admin/Materiais"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/Configuracoes"));
const AdminIntegracoes = lazy(() => import("./pages/admin/Integracoes"));
const AdminAgentesIA = lazy(() => import("./pages/admin/AgentesIA"));
const AdminSocialSelling = lazy(() => import("./pages/admin/SocialSelling"));

// Marketing — Email
const MarketingDashboard = lazy(() => import("./pages/admin/marketing/Dashboard"));
const MarketingTemplates = lazy(() => import("./pages/admin/marketing/Templates"));
const MarketingTemplateEditor = lazy(() => import("./pages/admin/marketing/TemplateEditor"));
const MarketingCampanhas = lazy(() => import("./pages/admin/marketing/Campanhas"));
const MarketingCampanhaNova = lazy(() => import("./pages/admin/marketing/CampanhaNova"));
const MarketingCampanhaDetail = lazy(() => import("./pages/admin/marketing/CampanhaDetail"));

// Marketing — Automações
const MarketingAutomacoes = lazy(() => import("./pages/admin/marketing/Automacoes"));
const MarketingAutomacaoEditor = lazy(() => import("./pages/admin/marketing/AutomacaoEditor"));

// Marketing — WhatsApp
const WhatsappDashboard = lazy(() => import("./pages/admin/marketing/WhatsappDashboard"));
const WhatsappCampanhas = lazy(() => import("./pages/admin/marketing/WhatsappCampanhas"));
const WhatsappCampanhaNova = lazy(() => import("./pages/admin/marketing/WhatsappCampanhaNova"));
const WhatsappCampanhaDetail = lazy(() => import("./pages/admin/marketing/WhatsappCampanhaDetail"));

// Plataforma de Agentes IA
const AgentList = lazy(() => import("./agents-platform/pages/AgentList"));
const AgentConfigPage = lazy(() => import("./agents-platform/pages/AgentConfigPage"));
const AgentChatPage = lazy(() => import("./agents-platform/pages/AgentChatPage"));
const AgentPlaygroundPage = lazy(() => import("./agents-platform/pages/AgentPlaygroundPage"));
const AgentSkillsLibraryPage = lazy(() => import("./agents-platform/pages/AgentSkillsLibraryPage"));
const AgentCredentialsPage = lazy(() => import("./agents-platform/pages/AgentCredentialsPage"));
const AgentSessionsPage = lazy(() => import("./agents-platform/pages/AgentSessionsPage"));
const AgentMetricsPage = lazy(() => import("./agents-platform/pages/AgentMetricsPage"));
const AgentOrgChartPage = lazy(() => import("./agents-platform/pages/AgentOrgChartPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <BuyerProvider>
            <CompareProvider>
              <BuyerAuthModal />
              <CompareBar />
              <GlobalCaptureWidgets />
              <FloatingAgentHost />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/busca" element={<Busca />} />
                  <Route path="/anuncio/:id" element={<Anuncio />} />
                  <Route path="/contato/:id" element={<Contato />} />
                  <Route path="/anunciar" element={<Anunciar />} />
                  <Route path="/galerias" element={<Galerias />} />
                  <Route path="/links" element={<Links />} />
                  <Route path="/vender" element={<VenderNegocio />} />
                  <Route path="/vender-terreno" element={<VenderTerreno />} />
                  <Route path="/seja-corretor" element={<SejaCorretor />} />
                  <Route path="/meus-favoritos" element={<MeusFavoritos />} />
                  <Route path="/imoveis" element={<ImoveisComerciais />} />
                  <Route path="/comparar" element={<Comparar />} />
                  <Route path="/obrigado" element={<Obrigado />} />

                  {/* Admin */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/pipeline" element={<ProtectedRoute><AdminPipeline /></ProtectedRoute>} />
                  <Route path="/admin/mensagens" element={<ProtectedRoute><AdminWhatsApp /></ProtectedRoute>} />
                  <Route path="/admin/leads" element={<ProtectedRoute><AdminLeads /></ProtectedRoute>} />
                  <Route path="/admin/negocios" element={<ProtectedRoute><AdminNegocios /></ProtectedRoute>} />
                  <Route path="/admin/corretores" element={<ProtectedRoute><AdminCorretores /></ProtectedRoute>} />
                  <Route path="/admin/corretores/:id" element={<ProtectedRoute><AdminCorretorDetail /></ProtectedRoute>} />
                  <Route path="/admin/materiais" element={<ProtectedRoute><AdminMateriais /></ProtectedRoute>} />
                  <Route path="/admin/configuracoes" element={<ProtectedRoute><AdminConfiguracoes /></ProtectedRoute>} />
                  <Route path="/admin/integracoes" element={<ProtectedRoute><AdminIntegracoes /></ProtectedRoute>} />
                  <Route path="/admin/agentes-ia" element={<ProtectedRoute><AdminAgentesIA /></ProtectedRoute>} />
                  <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsuarios /></ProtectedRoute>} />
                  <Route path="/admin/social-selling" element={<ProtectedRoute><AdminSocialSelling /></ProtectedRoute>} />

                  {/* Marketing — Email */}
                  <Route path="/admin/marketing" element={<ProtectedRoute><MarketingDashboard /></ProtectedRoute>} />
                  <Route path="/admin/marketing/templates" element={<ProtectedRoute><MarketingTemplates /></ProtectedRoute>} />
                  <Route path="/admin/marketing/templates/novo" element={<ProtectedRoute><MarketingTemplateEditor /></ProtectedRoute>} />
                  <Route path="/admin/marketing/templates/:id" element={<ProtectedRoute><MarketingTemplateEditor /></ProtectedRoute>} />
                  <Route path="/admin/marketing/campanhas" element={<ProtectedRoute><MarketingCampanhas /></ProtectedRoute>} />
                  <Route path="/admin/marketing/campanhas/nova" element={<ProtectedRoute><MarketingCampanhaNova /></ProtectedRoute>} />
                  <Route path="/admin/marketing/campanhas/:id" element={<ProtectedRoute><MarketingCampanhaDetail /></ProtectedRoute>} />

                  {/* Marketing — Automações */}
                  <Route path="/admin/marketing/automacoes" element={<ProtectedRoute><MarketingAutomacoes /></ProtectedRoute>} />
                  <Route path="/admin/marketing/automacoes/nova" element={<ProtectedRoute><MarketingAutomacaoEditor /></ProtectedRoute>} />
                  <Route path="/admin/marketing/automacoes/:id" element={<ProtectedRoute><MarketingAutomacaoEditor /></ProtectedRoute>} />

                  {/* Marketing — WhatsApp */}
                  <Route path="/admin/marketing/whatsapp" element={<ProtectedRoute><WhatsappDashboard /></ProtectedRoute>} />
                  <Route path="/admin/marketing/whatsapp/campanhas" element={<ProtectedRoute><WhatsappCampanhas /></ProtectedRoute>} />
                  <Route path="/admin/marketing/whatsapp/nova" element={<ProtectedRoute><WhatsappCampanhaNova /></ProtectedRoute>} />
                  <Route path="/admin/marketing/whatsapp/:id" element={<ProtectedRoute><WhatsappCampanhaDetail /></ProtectedRoute>} />

                  {/* Plataforma de Agentes IA — rotas fixas ANTES de :slug */}
                  <Route path="/agentes" element={<ProtectedRoute><AgentList /></ProtectedRoute>} />
                  <Route path="/agentes/habilidades" element={<ProtectedRoute><AgentSkillsLibraryPage /></ProtectedRoute>} />
                  <Route path="/agentes/credenciais" element={<ProtectedRoute><AgentCredentialsPage /></ProtectedRoute>} />
                  <Route path="/agentes/organograma" element={<ProtectedRoute><AgentOrgChartPage /></ProtectedRoute>} />
                  <Route path="/agentes/sessoes" element={<ProtectedRoute><AgentSessionsPage /></ProtectedRoute>} />
                  <Route path="/agentes/metricas" element={<ProtectedRoute><AgentMetricsPage /></ProtectedRoute>} />
                  <Route path="/agentes/playground" element={<ProtectedRoute><AgentPlaygroundPage /></ProtectedRoute>} />
                  <Route path="/agentes/:slug" element={<ProtectedRoute><AgentConfigPage /></ProtectedRoute>} />
                  <Route path="/agentes/:slug/config" element={<ProtectedRoute><AgentConfigPage /></ProtectedRoute>} />
                  <Route path="/agentes/:slug/chat" element={<ProtectedRoute><AgentChatPage /></ProtectedRoute>} />
                  <Route path="/agentes/:slug/playground" element={<ProtectedRoute><AgentPlaygroundPage /></ProtectedRoute>} />
                  <Route path="/agentes/:slug/sessoes" element={<ProtectedRoute><AgentSessionsPage /></ProtectedRoute>} />
                  <Route path="/agentes/:slug/metricas" element={<ProtectedRoute><AgentMetricsPage /></ProtectedRoute>} />

                  {/* Corretor — públicas */}
                  <Route path="/corretor/login" element={<CorretorLogin />} />
                  <Route path="/corretor/nova-senha" element={<CorretorNovaSenha />} />
                  <Route path="/corretor" element={<Navigate to="/corretor/dashboard" replace />} />

                  {/* Corretor — protegidas */}
                  <Route path="/corretor/dashboard"      element={<CorretorProtectedRoute><CorretorDashboard /></CorretorProtectedRoute>} />
                  <Route path="/corretor/mensagens"      element={<CorretorProtectedRoute><CorretorMensagens /></CorretorProtectedRoute>} />
                  <Route path="/corretor/leads"          element={<CorretorProtectedRoute><CorretorLeads /></CorretorProtectedRoute>} />
                  <Route path="/corretor/pipeline"       element={<CorretorProtectedRoute><CorretorPipeline /></CorretorProtectedRoute>} />
                  <Route path="/corretor/negocios"       element={<CorretorProtectedRoute><CorretorMeusNegocios /></CorretorProtectedRoute>} />
                  <Route path="/corretor/desempenho"     element={<CorretorProtectedRoute><CorretorDesempenho /></CorretorProtectedRoute>} />
                  <Route path="/corretor/redes-sociais"  element={<CorretorProtectedRoute><CorretorRedesSociais /></CorretorProtectedRoute>} />
                  <Route path="/corretor/materiais"      element={<CorretorProtectedRoute><CorretorMateriais /></CorretorProtectedRoute>} />
                  <Route path="/corretor/calculadora-roi" element={<CorretorProtectedRoute><CorretorCalculadoraROI /></CorretorProtectedRoute>} />
                  <Route path="/corretor/perfil"         element={<CorretorProtectedRoute><CorretorPerfil /></CorretorProtectedRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </CompareProvider>
          </BuyerProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
