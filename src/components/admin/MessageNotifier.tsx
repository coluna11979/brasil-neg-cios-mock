/**
 * MessageNotifier — toca som + notificação ao chegar mensagem nova de lead.
 *
 * Subscreve a INSERTs em lead_messages (sender_type='lead'), toca um beep
 * sintetizado via Web Audio (zero asset) e dispara notificação do browser
 * se o user tiver dado permissão. Som persistido em localStorage.
 *
 * Ignora mensagens que chegam nos primeiros 3s (evita disparar pro histórico
 * que vem na conexão inicial do Realtime).
 */
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "msg_sound_enabled";

function playBeep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;

    // Dois beeps curtos estilo WhatsApp/iMessage
    const tones = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 1320, start: 0.13, dur: 0.18 },
    ];
    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = t.freq;
      gain.gain.setValueAtTime(0, now + t.start);
      gain.gain.linearRampToValueAtTime(0.25, now + t.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur + 0.02);
    }
    setTimeout(() => ctx.close(), 600);
  } catch (e) {
    console.warn("[MessageNotifier] Erro tocando beep:", e);
  }
}

export default function MessageNotifier() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "1";
  });
  const mountedAtRef = useRef<number>(Date.now());
  const unlockedRef = useRef<boolean>(false);

  // iOS/Android exigem interação do user antes do audio context
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          // Beep imperceptível pra desbloquear
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001;
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.01);
          setTimeout(() => ctx.close(), 100);
          unlockedRef.current = true;
        }
      } catch {/* ignore */}
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Realtime: subscribe a novas mensagens de leads
  useEffect(() => {
    const channel = supabase
      .channel("admin_global_lead_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_messages", filter: "sender_type=eq.lead" },
        (payload) => {
          // Ignora mensagens dos primeiros 3s (replay histórico)
          if (Date.now() - mountedAtRef.current < 3000) return;
          if (!enabled) return;

          playBeep();

          // Browser notification (se autorizado)
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              const msg = (payload.new as { message?: string })?.message || "Mensagem recebida";
              const preview = msg.length > 80 ? msg.slice(0, 80) + "…" : msg;
              const n = new Notification("Nova mensagem", { body: preview, icon: "/logo-icon.png", tag: "lead-msg" });
              setTimeout(() => n.close(), 6000);
            } catch {/* ignore */}
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [enabled]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    if (next) {
      // Pede permissão de notificação quando liga
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      // Toca um beep de confirmação
      playBeep();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "Notificações ligadas — clique pra silenciar" : "Notificações silenciadas — clique pra ligar"}
      className={`flex items-center justify-center h-9 w-9 rounded-lg transition-colors ${
        enabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {enabled ? <Bell className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
