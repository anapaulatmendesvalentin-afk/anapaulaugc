/* =====================================================================
   LIGAÇÃO COM O SUPABASE (usada pelo site, pelo login e pelo painel)
   Aqui ficam só o endereço do projeto e a chave PÚBLICA.
   A chave pública pode aparecer no site: quem protege os dados é a
   tranca (RLS) que está no banco.sql. Nunca coloque a chave secreta aqui.
   ===================================================================== */
window.BANCO_URL = "https://brwpxmchypwydvvamyut.supabase.co";
window.BANCO_CHAVE = "sb_publishable_nrbc-lTpnot50uQSgOHM_A_WSmJzqOO";

/* Cria a conexão. lembrarLogin = true no login e no painel;
   no site público fica false, porque ninguém faz login lá. */
window.criarBanco = function (lembrarLogin) {
  if (!window.supabase || !window.supabase.createClient) return null;
  return window.supabase.createClient(window.BANCO_URL, window.BANCO_CHAVE, {
    auth: {
      persistSession: !!lembrarLogin,
      autoRefreshToken: !!lembrarLogin,
      detectSessionInUrl: !!lembrarLogin
    }
  });
};
