import { supabase } from './supabase';

// Log de erro do client sem depender de um serviço externo (Sentry etc):
// fire-and-forget, nunca lança nem bloqueia a UI que chamou. Visível pro
// admin em /admin/erros.
export function logClientError(error: unknown, contexto?: string) {
  const mensagem = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;

  supabase.auth
    .getSession()
    .then(({ data }) =>
      supabase.from('client_errors').insert({
        usuario_id: data.session?.user.id ?? null,
        mensagem: mensagem.slice(0, 2000),
        stack: stack?.slice(0, 4000) ?? null,
        contexto: contexto?.slice(0, 500) ?? null,
        url: window.location.href,
        user_agent: navigator.userAgent,
      })
    )
    .then(({ error: insertError }) => {
      if (insertError) console.error('Falha ao registrar erro de cliente', insertError);
    });
}
