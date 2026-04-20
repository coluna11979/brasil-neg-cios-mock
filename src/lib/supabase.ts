import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ⚡ Listener GLOBAL registrado IMEDIATAMENTE após createClient().
// O createClient() dispara PASSWORD_RECOVERY de forma ASSÍNCRONA (microtask)
// ao detectar tokens na URL — então se registrarmos o listener aqui, antes
// do React montar, conseguimos capturar o evento mesmo quando o Login.tsx
// ainda não foi carregado.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      sessionStorage.setItem("sb_recovery", "1");
    }
  });
}
