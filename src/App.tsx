import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import GlobalCaptureWidgets from "@/components/GlobalCaptureWidgets";
import { BuyerProvider } from "@/contexts/BuyerContext";
import BuyerAuthModal from "@/components/BuyerAuthModal";
import { CompareProvider } from "@/contexts/CompareContext";
import CompareBar from "@/components/CompareBar";

const Index = lazy(() => import("./pages/Index"));
const Busca = lazy(() => import("./pages/Busca"));
const Anuncio = lazy(() => import("./pages/Anuncio"));
const Contato = lazy(() => import("./pages/Contato"));
const Anunciar = lazy(() => import("./pages/Anunciar"));
const Galerias = lazy(() => import("./pages/Galerias"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminLeads = lazy(() => import("./pages/admin/Leads"));
const AdminPipeline = lazy(() => import("./pages/admin/Pipeline"));
const AdminWhatsApp = lazy(() => import("./pages/admin/WhatsAppCRM"));
const AdminNegocios = lazy(() => import("./pages/admin/Negocios"));
const AdminCorretores = lazy(() => import("./pages/admin/Corretores"));
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
const CorretorDesempenho = lazy(() => import("./pages/corretor/Desempenho"));
const CorretorMateriais = lazy(() => import("./pages/corretor/Materiais"));
const CorretorRedesSociais = lazy(() => import("./pages/corretor/RedesSociais"));
const CorretorCalculadoraROI = lazy(() => import("./pages/corretor/CalculadoraROI"));
const CorretorProposta = lazy(() => import("./pages/corretor/Proposta"));
const CorretorPerfil = lazy(() => import("./pages/corretor/Perfil"));
const AdminMateriais = lazy(() => import("./pages/admin/Materiais"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/Configuracoes"));

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
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/busca" element={<Busca />} />
                  <Route path="/anuncio/:id" element={<Anuncio />} />
                  <Route path="/contato/:id" element={<Contato />} />
                  <Route path="/anunciar" element={<Anunciar />} />
                  <Route path="/galerias" element={<Galerias />} />
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
                  <Route path="/admin/materiais" element={<ProtectedRoute><AdminMateriais /></ProtectedRoute>} />
                  <Route path="/admin/configuracoes" element={<ProtectedRoute><AdminConfiguracoes /></ProtectedRoute>} />
                  <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsuarios /></ProtectedRoute>} />

                  {/* Corretor */}
                  <Route path="/corretor/login" element={<CorretorLogin />} />
                  <Route path="/corretor" element={<Navigate to="/corretor/mensagens" replace />} />
                  <Route path="/corretor/mensagens" element={<CorretorMensagens />} />
                  <Route path="/corretor/leads" element={<CorretorLeads />} />
                  <Route path="/corretor/pipeline" element={<CorretorPipeline />} />
                  <Route path="/corretor/desempenho" element={<CorretorDesempenho />} />
                  <Route path="/corretor/redes-sociais" element={<CorretorRedesSociais />} />
                  <Route path="/corretor/materiais" element={<CorretorMateriais />} />
                  <Route path="/corretor/calculadora-roi" element={<CorretorCalculadoraROI />} />
                  <Route path="/corretor/proposta" element={<CorretorProposta />} />
                  <Route path="/corretor/perfil" element={<CorretorPerfil />} />

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
