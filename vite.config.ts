import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "logo-icon.png"],
      manifest: {
        name: "NegociaAky",
        short_name: "NegociaAky",
        description: "Marketplace de compra, venda e locação de negócios e imóveis comerciais",
        theme_color: "#0066ff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/corretor/dashboard",
        lang: "pt-BR",
        icons: [
          { src: "/logo-icon.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/logo-icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        shortcuts: [
          { name: "Mensagens", url: "/corretor/mensagens", icons: [{ src: "/logo-icon.png", sizes: "192x192" }] },
          { name: "Meus Leads", url: "/corretor/leads", icons: [{ src: "/logo-icon.png", sizes: "192x192" }] },
          { name: "Pipeline",  url: "/corretor/pipeline",  icons: [{ src: "/logo-icon.png", sizes: "192x192" }] },
        ],
        categories: ["business", "productivity"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Não cache rotas /admin nem chamadas Supabase — sempre fresh
        navigateFallbackDenylist: [/^\/admin/, /^\/api/, /supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/i,
            handler: "CacheFirst",
            options: { cacheName: "img-cache", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
