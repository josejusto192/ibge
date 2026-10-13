// Edge Function: aluno assina um plano.
//
// Chamada pelo app (com o JWT do aluno) com { plano_id, cpf }. O CPF só é
// pedido aqui, na hora de assinar. Passos:
//   1. valida o CPF e cria/atualiza o cliente no Asaas (o Asaas exige CPF);
//   2. cria a assinatura no Asaas (billingType UNDEFINED: o aluno escolhe
//      Pix, boleto ou cartão na fatura), 1º vencimento hoje;
//   3. devolve o invoiceUrl da 1ª cobrança pro app redirecionar.
// O acesso NÃO é liberado aqui: só quando o webhook confirmar o pagamento
// (asaas-webhook → asaas_processar_evento).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { asaas, registrarErro, sincronizarCliente } from '../_shared/asaas.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
// Endereço do app (ex.: https://app.seudominio.com.br). Com ele, a fatura do
// Asaas manda o aluno de volta pra /assinar depois de pagar (Pix/cartão).
// O domínio precisa ser o mesmo cadastrado em Asaas → Configurações da
// conta → Informações; sem APP_URL não há redirecionamento.
const APP_URL = Deno.env.get('APP_URL')?.replace(/\/$/, '');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9)) === Number(cpf[9]) && digito(cpf.slice(0, 10)) === Number(cpf[10]);
}

interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  billingType: string;
  invoiceUrl: string;
  subscription: string;
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

  let planoId: number;
  let cpf: string;
  try {
    const body = await req.json();
    planoId = Number(body.plano_id);
    cpf = String(body.cpf ?? '').replace(/\D/g, '');
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }
  if (!cpfValido(cpf)) return json({ error: 'CPF inválido. Confira os números e tente de novo.' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: plano } = await admin.from('planos').select('*').eq('id', planoId).eq('ativo', true).maybeSingle();
  if (!plano) return json({ error: 'Plano indisponível.' }, 404);

  const { data: usuario } = await admin
    .from('usuarios')
    .select('id, nome, email, whatsapp, cpf, asaas_customer_id, acesso_ate')
    .eq('id', usuarioId)
    .single();
  if (!usuario) return json({ error: 'Usuário não encontrado' }, 404);

  if (usuario.cpf && usuario.cpf !== cpf) {
    return json({ error: 'Este não é o CPF cadastrado na sua conta. Fale com o suporte para trocar.' }, 409);
  }
  const { data: cpfEmUso } = await admin.from('usuarios').select('id').eq('cpf', cpf).neq('id', usuarioId).maybeSingle();
  if (cpfEmUso) return json({ error: 'Este CPF já está em uso em outra conta.' }, 409);

  try {
    // Assinatura ativa já existente: não cria outra — devolve a fatura em
    // aberto (aluno que fechou a página antes de pagar).
    const { data: existente } = await admin
      .from('assinaturas')
      .select('asaas_subscription_id')
      .eq('usuario_id', usuarioId)
      .eq('status', 'ACTIVE')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existente) {
      if (usuario.acesso_ate && new Date(usuario.acesso_ate) > new Date()) {
        return json({ error: 'Você já tem uma assinatura ativa.' }, 409);
      }
      const cobrancas = await asaas<{ data: AsaasPayment[] }>(
        'GET',
        `/subscriptions/${existente.asaas_subscription_id}/payments?status=PENDING`,
      );
      const vencidas = cobrancas.data?.length
        ? cobrancas
        : await asaas<{ data: AsaasPayment[] }>('GET', `/subscriptions/${existente.asaas_subscription_id}/payments?status=OVERDUE`);
      const emAberto = vencidas.data?.[0];
      if (emAberto) return json({ invoice_url: emAberto.invoiceUrl });
      return json({ error: 'Sua assinatura está sendo processada. Tente de novo em alguns minutos.' }, 409);
    }

    // Cliente no Asaas com o CPF informado. CPF e customer id são gravados
    // juntos: o trigger de sync dispara em seguida, já encontra o customer
    // id e só faz PUT (não cria outro cliente).
    const customerId = await sincronizarCliente({ ...usuario, cpf });
    if (!customerId) throw new Error('Não foi possível criar o cliente no Asaas.');
    const { error: upErr } = await admin
      .from('usuarios')
      .update({ cpf, asaas_customer_id: customerId, asaas_sincronizado_em: new Date().toISOString(), asaas_sync_erro: null })
      .eq('id', usuarioId);
    if (upErr) throw upErr;

    const dataBrasilia = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const hoje = dataBrasilia(new Date());
    // Cancelou e voltou antes do acesso acabar: a 1ª cobrança da nova
    // assinatura vence quando termina o período já pago (acesso_ate tem 3
    // dias de tolerância somados — ver asaas_recalcular_acesso), pra não
    // cobrar duas vezes o mesmo período.
    const fimPeriodoPago = usuario.acesso_ate
      ? dataBrasilia(new Date(new Date(usuario.acesso_ate).getTime() - 3 * 86400000))
      : null;
    const primeiroVencimento = fimPeriodoPago && fimPeriodoPago > hoje ? fimPeriodoPago : hoje;
    type AsaasSubscription = { id: string; status: string; billingType: string; value: number; cycle: string; nextDueDate: string };
    const dadosAssinatura = {
      customer: customerId,
      billingType: 'UNDEFINED',
      value: Number(plano.valor),
      nextDueDate: primeiroVencimento,
      cycle: plano.ciclo,
      description: plano.nome,
      externalReference: usuarioId,
    };
    let assinatura: AsaasSubscription;
    if (APP_URL) {
      try {
        assinatura = await asaas<AsaasSubscription>('POST', '/subscriptions', {
          ...dadosAssinatura,
          callback: { successUrl: `${APP_URL}/assinar?pagamento=ok`, autoRedirect: true },
        });
      } catch (err) {
        // Domínio do APP_URL diferente do cadastrado no Asaas: não deixa
        // isso impedir a venda — assina sem redirecionamento e registra.
        // Só em recusa de validação (400): falha de rede poderia ter criado
        // a assinatura, e repetir duplicaria.
        if (!(err instanceof Error && err.message.includes('HTTP 400'))) throw err;
        await registrarErro(admin, usuarioId, 'asaas-assinar · callback recusado (confira APP_URL e o domínio no Asaas)', err);
        assinatura = await asaas<AsaasSubscription>('POST', '/subscriptions', dadosAssinatura);
      }
    } else {
      assinatura = await asaas<AsaasSubscription>('POST', '/subscriptions', dadosAssinatura);
    }

    await admin.from('assinaturas').upsert(
      {
        asaas_subscription_id: assinatura.id,
        usuario_id: usuarioId,
        plano_id: plano.id,
        status: assinatura.status ?? 'ACTIVE',
        billing_type: assinatura.billingType,
        valor: assinatura.value,
        ciclo: assinatura.cycle,
        proximo_vencimento: assinatura.nextDueDate,
      },
      { onConflict: 'asaas_subscription_id' },
    );

    // A 1ª cobrança é gerada na criação (vencimento hoje).
    const cobrancas = await asaas<{ data: AsaasPayment[] }>('GET', `/subscriptions/${assinatura.id}/payments`);
    const primeira = cobrancas.data?.[0];
    // Reativação com vencimento futuro: nada a pagar agora (a cobrança pode
    // nem ter sido gerada ainda — o Asaas gera até 40 dias antes).
    if (primeiroVencimento > hoje) return json({ reativada: true, proximo_vencimento: primeiroVencimento });
    if (!primeira) return json({ error: 'Assinatura criada, mas a cobrança ainda não está disponível. Tente de novo em instantes.' }, 202);

    await admin.from('pagamentos').upsert(
      {
        asaas_payment_id: primeira.id,
        asaas_subscription_id: assinatura.id,
        usuario_id: usuarioId,
        status: primeira.status,
        billing_type: primeira.billingType,
        valor: primeira.value,
        vencimento: primeira.dueDate,
        invoice_url: primeira.invoiceUrl,
      },
      { onConflict: 'asaas_payment_id', ignoreDuplicates: true },
    );

    return json({ invoice_url: primeira.invoiceUrl });
  } catch (err) {
    await registrarErro(admin, usuarioId, 'asaas-assinar', err);
    return json({ error: 'Não foi possível iniciar a assinatura agora. Tente de novo em instantes.' }, 502);
  }
});
