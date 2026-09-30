// Acesso à API do Asaas compartilhado pelas Edge Functions asaas-*.
//
// Secrets (supabase secrets set …):
//   ASAAS_API_KEY   chave da API do Asaas ($aact_…)
//   ASAAS_BASE_URL  https://api-sandbox.asaas.com/v3 (padrão) ou https://api.asaas.com/v3
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
const ASAAS_BASE_URL = (Deno.env.get('ASAAS_BASE_URL') ?? 'https://api-sandbox.asaas.com/v3').replace(/\/$/, '');

export async function asaas<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada nas secrets da Edge Function.');
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'foco-app/1.0.0',
      access_token: ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let detalhe = text;
    try {
      const parsed = JSON.parse(text);
      detalhe = (parsed.errors ?? []).map((e: { description: string }) => e.description).join('; ') || text;
    } catch {
      // resposta não-JSON: mantém o texto cru
    }
    throw new Error(`Asaas ${method} ${path} → HTTP ${res.status}: ${detalhe}`);
  }
  return JSON.parse(text) as T;
}

export interface UsuarioAsaas {
  id: string;
  nome: string | null;
  email: string;
  whatsapp: string | null;
  cpf: string | null;
  asaas_customer_id: string | null;
}

// Cria (POST) ou atualiza (PUT) o cliente no Asaas e devolve o customer id,
// ou null se ainda não há CPF pra criar. Não grava nada no banco.
export async function sincronizarCliente(usuario: UsuarioAsaas): Promise<string | null> {
  // Só manda campo preenchido: no PUT, campo ausente = mantém o valor atual
  // no Asaas (vazio/null apagaria o dado de lá).
  const whatsappDigitos = (usuario.whatsapp ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  const payload: Record<string, string> = { name: usuario.nome?.trim() || usuario.email, externalReference: usuario.id };
  if (usuario.cpf) payload.cpfCnpj = usuario.cpf;
  if (usuario.email) payload.email = usuario.email;
  if (whatsappDigitos) payload.mobilePhone = whatsappDigitos;

  let customerId = usuario.asaas_customer_id;
  if (!customerId) {
    // O Asaas aceita cliente duplicado: antes de criar, procura um já
    // criado pra este usuário (ex.: dois disparos seguidos do trigger).
    // Cliente removido no painel do Asaas não serve (PUT falharia): nesse
    // caso cria outro.
    const existentes = await asaas<{ data: { id: string; deleted?: boolean }[] }>(
      'GET',
      `/customers?externalReference=${encodeURIComponent(usuario.id)}`,
    );
    customerId = existentes.data?.find((c) => !c.deleted)?.id ?? null;
  }

  if (customerId) {
    await asaas('PUT', `/customers/${customerId}`, payload);
    return customerId;
  }
  if (!payload.cpfCnpj) return null;
  return (await asaas<{ id: string }>('POST', '/customers', payload)).id;
}

export async function registrarErro(admin: SupabaseClient, usuarioId: string | null, contexto: string, err: unknown) {
  const mensagem = err instanceof Error ? err.message : String(err);
  await admin.from('client_errors').insert({ usuario_id: usuarioId, mensagem: mensagem.slice(0, 2000), contexto });
  return mensagem;
}
