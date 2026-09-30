// Edge Function: recebe os webhooks do Asaas (cobranças e assinaturas).
//
// Deploy com --no-verify-jwt (quem chama é o Asaas). Autenticação pelo
// header asaas-access-token, que precisa bater com ASAAS_WEBHOOK_TOKEN — o
// mesmo authToken cadastrado no webhook do Asaas (NÃO é a API key).
//
// Segue a recomendação de idempotência do Asaas (entrega "at least once"):
// persiste o evento com o id como chave única ANTES de processar e responde
// 200 assim que ele está salvo. O processamento (asaas_processar_evento, no
// banco) é idempotente; se falhar, o evento fica com status ERRO e pode ser
// reprocessado no SQL Editor: select asaas_processar_evento(<id>);
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  if (!ASAAS_WEBHOOK_TOKEN || req.headers.get('asaas-access-token') !== ASAAS_WEBHOOK_TOKEN) {
    return json({ error: 'Não autorizado' }, 401);
  }

  let payload: { id?: string; event?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo inválido' }, 400);
  }
  if (!payload.id || !payload.event) return json({ error: 'Evento sem id/event' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: salvo, error } = await admin
    .from('asaas_webhook_eventos')
    .upsert({ asaas_event_id: payload.id, evento: payload.event, payload }, { onConflict: 'asaas_event_id', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();
  // Sem persistir não dá 200: o Asaas reenvia depois.
  if (error) return json({ error: 'Falha ao registrar evento' }, 500);
  if (!salvo) return json({ received: true, duplicado: true });

  // Erro de processamento já fica registrado no próprio evento e em
  // client_errors (dentro da função) — o evento foi salvo, então 200.
  const { data: resultado } = await admin.rpc('asaas_processar_evento', { p_evento_id: salvo.id });
  return json({ received: true, resultado });
});
