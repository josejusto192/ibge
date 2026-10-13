// Edge Function: cria/atualiza o cliente do usuário no Asaas.
//
// Chamada pelo trigger trg_usuarios_sync_asaas (migration 020, via pg_net)
// sempre que nome/e-mail/WhatsApp/CPF mudam — nunca pelo navegador. Por
// isso roda sem JWT (deploy com --no-verify-jwt) e se protege com o
// cabeçalho x-sync-secret, que precisa bater com ASAAS_SYNC_SECRET (o mesmo
// valor do segredo 'asaas_sync_secret' no vault).
//
// Resultado gravado em usuarios.asaas_customer_id / asaas_sincronizado_em /
// asaas_sync_erro; falhas também vão para client_errors ("Saúde do app").
import { createClient } from 'npm:@supabase/supabase-js@2';
import { registrarErro, sincronizarCliente } from '../_shared/asaas.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ASAAS_SYNC_SECRET = Deno.env.get('ASAAS_SYNC_SECRET');

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  if (!ASAAS_SYNC_SECRET || req.headers.get('x-sync-secret') !== ASAAS_SYNC_SECRET) {
    return json({ error: 'Não autorizado' }, 401);
  }

  let usuarioId: string;
  try {
    ({ usuario_id: usuarioId } = await req.json());
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }
  if (!usuarioId) return json({ error: 'usuario_id é obrigatório' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: usuario, error: uErr } = await admin
    .from('usuarios')
    .select('id, nome, email, whatsapp, cpf, asaas_customer_id')
    .eq('id', usuarioId)
    .single();
  if (uErr || !usuario) return json({ error: 'Usuário não encontrado' }, 404);

  try {
    const customerId = await sincronizarCliente(usuario);
    if (!customerId) return json({ ok: true, ignorado: 'sem CPF' });
    await admin
      .from('usuarios')
      .update({ asaas_customer_id: customerId, asaas_sincronizado_em: new Date().toISOString(), asaas_sync_erro: null })
      .eq('id', usuario.id);
    return json({ ok: true, asaas_customer_id: customerId });
  } catch (err) {
    const mensagem = await registrarErro(admin, usuario.id, 'asaas-sync-cliente', err);
    await admin.from('usuarios').update({ asaas_sync_erro: mensagem.slice(0, 1000) }).eq('id', usuario.id);
    return json({ error: mensagem }, 502);
  }
});
