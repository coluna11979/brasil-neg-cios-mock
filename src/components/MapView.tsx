import { useEffect, useRef, useState } from "react";
import type { Listing } from "@/data/mockListings";

interface MapViewProps {
  listings: Listing[];
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

function loadCSS(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const MapView = ({ listings }: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      try {
        loadCSS(LEAFLET_CSS);
        await loadScript(LEAFLET_JS);

        if (cancelled) return;

        const L = window.L;
        if (!L) throw new Error("Leaflet not available");

        // Wait for container to be in DOM
        if (!mapContainerRef.current) return;

        // Destroy existing map if any
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: [-23.5505, -46.6333],
          zoom: 12,
        });

        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Custom green div icon
        const createIcon = (L: typeof window.L) =>
          L.divIcon({
            className: "",
            html: `<div style="
              background-color: #2d6a4f;
              width: 28px;
              height: 28px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid #fff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            "></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -30],
          });

        listings.forEach((listing, index) => {
          const lat = -23.5505 + ((index % 5) * 0.02 - 0.04);
          const lng = -46.6333 + ((index % 7) * 0.025 - 0.07);

          const marker = L.marker([lat, lng], { icon: createIcon(L) }).addTo(map);

          marker.bindPopup(`
            <div style="font-family: sans-serif; min-width: 180px;">
              <strong style="font-size: 14px; display: block; margin-bottom: 4px;">${listing.titulo}</strong>
              <span style="color: #2d6a4f; font-weight: 600; font-size: 13px;">${formatPrice(listing.preco)}</span>
              <p style="margin: 4px 0; color: #666; font-size: 12px;">${listing.cidade}</p>
              <a href="/anuncio/${listing.id}" style="display: inline-block; margin-top: 6px; font-size: 12px; color: #2d6a4f; text-decoration: underline;">Ver detalhes</a>
            </div>
          `);
        });

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError("Não foi possível carregar o mapa.");
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [listings]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-xl border border-border bg-muted text-muted-foreground text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border shadow-sm">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm">Carregando mapa...</span>
          </div>
        </div>
      )}
      <div
        id="map-container"
        ref={mapContainerRef}
        style={{ height: "500px", width: "100%" }}
      />
    </div>
  );
};

export default MapView;
