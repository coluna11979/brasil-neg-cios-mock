// ⚡ EXECUTADO ANTES DE QUALQUER OUTRO MÓDULO — especialmente antes do Supabase
// O Supabase `createClient()` processa e LIMPA tokens da URL automaticamente.
// Precisamos capturar o flag de recovery ANTES disso acontecer para que o
// Login.tsx possa mostrar o form de "Criar Nova Senha" em vez do login normal.
//
// Esse arquivo é importado como PRIMEIRA LINHA de main.tsx — ESM hoisting garante
// que ele executa antes de qualquer `import` subsequente (incluindo o cliente
// Supabase que é inicializado dentro de src/lib/supabase.ts).

(function captureRecoveryEarly() {
  if (typeof window === "undefined") return;

  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const params = new URLSearchParams(search);

  const hasRecoveryHash =
    hash.includes("type=recovery") || hash.includes("access_token=");
  const hasRecoveryQuery =
    params.get("type") === "recovery" || !!params.get("token_hash");

  if (hasRecoveryHash || hasRecoveryQuery) {
    sessionStorage.setItem("sb_recovery", "1");

    // Se o usuário caiu em qualquer rota que NÃO seja /corretor/login
    // (o Supabase às vezes redireciona para home quando a allowlist dá match
    // parcial), redirecionamos preservando os tokens.
    const currentPath = window.location.pathname;
    if (currentPath !== "/corretor/login") {
      window.location.replace(
        "/corretor/login" + search + hash
      );
    }
  }
})();
