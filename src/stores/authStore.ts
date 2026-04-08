import { supabase } from "@/lib/supabase";

export async function login(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function getAdminEmail(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email || "";
}

// Reactive listener for auth state changes
export function onAuthStateChange(callback: (isLoggedIn: boolean) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });
  return data.subscription;
}
