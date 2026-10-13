// Edge Function: aluno cancela a própria assinatura.
//
// Remove a assinatura no Asaas (DELETE /subscriptions/{id}): para de gerar
// cobranças e apaga as faturas em aberto; as já pagas continuam. O acesso
// não é cortado aqui — acesso_ate é derivado dos pagamentos confirmados
// (migration 021), então o aluno usa até o fim do período que já pagou.
// O webhook SUBSCRIPTION_DELETED chega depois e confirma o status.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { asaas, registrarErro } from '../_shared/asaas.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado' }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Não autenticado' }, 401);
  const usuarioId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: ativas } = await admin
    .from('assinaturas')
    .select('asaas_subscription_id')
    .eq('usuario_id', usuarioId)
    .in('status', ['ACTIVE', 'INACTIVE']);
  if (!ativas?.length) return json({ error: 'Você não tem uma assinatura ativa para cancelar.' }, 404);

  try {
    for (const { asaas_subscription_id: id } of ativas) {
      try {
        await asaas('DELETE', `/subscriptions/${id}`);
      } catch (err) {
        // Já removida no Asaas (ex.: pelo painel): segue e acerta o espelho.
        if (!(err instanceof Error && err.message.includes('HTTP 404'))) throw err;
      }
      await admin.from('assinaturas').update({ status: 'DELETED', atualizado_em: new Date().toISOString() }).eq('asaas_subscription_id', id);
      await admin
        .from('pagamentos')
        .update({ status: 'DELETED', atualizado_em: new Date().toISOString() })
        .eq('asaas_subscription_id', id)
        .in('status', ['PENDING', 'OVERDUE']);
    }
    const { data: usuario } = await admin.from('usuarios').select('acesso_ate').eq('id', usuarioId).single();
    return json({ ok: true, acesso_ate: usuario?.acesso_ate ?? null });
  } catch (err) {
    await registrarErro(admin, usuarioId, 'asaas-cancelar', err);
    return json({ error: 'Não foi possível cancelar agora. Tente de novo em instantes.' }, 502);
  }
});
