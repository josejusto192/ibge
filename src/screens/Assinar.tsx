import { ArrowSquareOut, Check, CheckCircle, CircleNotch, Crown, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { assinarPlano, cancelarAssinatura, fetchMinhaAssinatura, fetchPlanos, type MinhaAssinatura, type PlanoRow } from '../lib/queries';
import { EdgeFunctionError } from '../lib/edgeFunctions';
import PatternBackground from '../components/PatternBackground';
import PrimaryButton from '../components/PrimaryButton';
import { LoadingExperience } from '../components/Feedback';
import Dialog from '../components/Dialog';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES_POR_CICLO: Record<string, number> = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUALLY: 6, YEARLY: 12 };
const NOME_CICLO: Record<string, string> = {
  MONTHLY: 'por mês',
  BIMONTHLY: 'a cada 2 meses',
  QUARTERLY: 'por trimestre',
  SEMIANNUALLY: 'por semestre',
  YEARLY: 'por ano',
};
const BENEFICIOS = ['Todos os módulos de todas as trilhas', 'Caderno de erros completo', 'Tutor com IA nas questões que você errar'];

function formatarCpf(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export default function Assinar() {
  const { usuario, temAcesso, refreshUsuario } = useAppData();
  const navigate = useNavigate();
  const [planos, setPlanos] = useState<PlanoRow[] | null>(null);
  const [assinatura, setAssinatura] = useState<MinhaAssinatura | null>(null);
  const [planoId, setPlanoId] = useState<number | null>(null);
  const [cpf, setCpf] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erroCancelamento, setErroCancelamento] = useState('');
  // Cancelou mas ainda tem acesso: mostra os planos só se pedir pra reativar.
  const [reativando, setReativando] = useState(false);
  const [aviso, setAviso] = useState('');

  const acessoAte = usuario?.acesso_ate;
  const pago = useMemo(() => !!acessoAte && new Date(acessoAte) > new Date(), [acessoAte]);
  // Voltou da fatura do Asaas (callback.successUrl da assinatura). O acesso
  // só é liberado pelo webhook, que pode levar alguns segundos: confere de
  // 3 em 3 s por até 1 minuto.
  const [params] = useSearchParams();
  const voltouDoPagamento = params.get('pagamento') === 'ok';
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(voltouDoPagamento);

  useEffect(() => {
    if (!aguardandoConfirmacao) return;
    if (pago) {
      setAguardandoConfirmacao(false);
      return;
    }
    let tentativas = 0;
    const id = window.setInterval(() => {
      tentativas += 1;
      refreshUsuario();
      if (tentativas >= 20) {
        window.clearInterval(id);
        setAguardandoConfirmacao(false);
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [aguardandoConfirmacao, pago, refreshUsuario]);

  const carregar = useCallback(async () => {
    if (!usuario) return;
    try {
      const [p, a] = await Promise.all([fetchPlanos(), fetchMinhaAssinatura(usuario.id)]);
      setPlanos(p);
      setAssinatura(a);
      // Anual pré-selecionado quando existe (melhor preço por mês).
      setPlanoId((atual) => atual ?? (p.find((x) => x.ciclo === 'YEARLY') ?? p[0])?.id ?? null);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [usuario]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (usuario?.cpf) setCpf(formatarCpf(usuario.cpf));
  }, [usuario?.cpf]);

  async function continuar() {
    if (!planoId || enviando) return;
    if (cpf.replace(/\D/g, '').length !== 11) {
      setErro('Informe seu CPF completo (11 números).');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      const resultado = await assinarPlano(planoId, cpf);
      if (resultado.invoice_url) {
        window.location.assign(resultado.invoice_url);
        return;
      }
      await carregar();
      setReativando(false);
      setEnviando(false);
      setAviso(
        resultado.proximo_vencimento
          ? `Assinatura reativada! A próxima cobrança vence em ${new Date(`${resultado.proximo_vencimento}T12:00:00`).toLocaleDateString('pt-BR')}.`
          : 'Assinatura reativada!',
      );
    } catch (err) {
      setErro(
        err instanceof EdgeFunctionError && err.status && err.status < 500
          ? err.message
          : 'Não foi possível iniciar sua assinatura agora. Tente de novo em instantes.',
      );
      setEnviando(false);
    }
  }

  async function cancelar() {
    setCancelando(true);
    setErroCancelamento('');
    try {
      await cancelarAssinatura();
      await Promise.all([carregar(), refreshUsuario()]);
      setConfirmarCancelamento(false);
      setAviso('Assinatura cancelada. Nenhuma nova cobrança será feita.');
    } catch (err) {
      setErroCancelamento(
        err instanceof EdgeFunctionError && err.status && err.status < 500
          ? err.message
          : 'Não foi possível cancelar agora. Tente de novo em instantes.',
      );
    } finally {
      setCancelando(false);
    }
  }

  async function verificarPagamento() {
    setVerificando(true);
    await Promise.all([refreshUsuario(), carregar()]);
    setVerificando(false);
  }

  const fechar = () => navigate('/trilha');

  const cabecalho = (
    <div className="z-[3] flex items-center gap-3 bg-surface p-[14px_16px_12px]" style={{ borderBottom: '1px solid #EDF0F8' }}>
      <button
        onClick={fechar}
        aria-label="Fechar"
        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border-none bg-app-bg text-text2"
      >
        <X weight="bold" size={17} />
      </button>
      <div className="font-sans text-[15px] font-extrabold text-ink">Assinatura</div>
    </div>
  );

  if (loadError) {
    return (
      <>
        {cabecalho}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="font-sans text-[13.5px] font-semibold text-text2">Não conseguimos carregar os planos agora.</div>
          <button onClick={carregar} className="font-sans text-[13px] font-extrabold text-blue">
            Tentar de novo
          </button>
        </div>
      </>
    );
  }

  if (!planos || !usuario) return <LoadingExperience message="Buscando os planos" />;

  if (aguardandoConfirmacao && !pago) {
    return (
      <>
        {cabecalho}
        <PatternBackground scrollClassName="p-[28px_20px_60px]">
          <div className="mx-auto flex max-w-[440px] flex-col items-center gap-3 text-center" role="status">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-tint text-blue">
              <CircleNotch size={34} weight="bold" className="animate-spin" />
            </div>
            <div className="font-display text-[20px] font-extrabold text-ink">Pagamento recebido!</div>
            <div className="font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">
              Estamos liberando seu acesso. Isso leva só alguns segundos.
            </div>
          </div>
        </PatternBackground>
      </>
    );
  }

  // Período pago em vigor. Assinatura ativa no Asaas → pode cancelar;
  // cancelada → acesso segue até o fim do período e pode reativar.
  const assinaturaAtiva = assinatura?.status === 'ACTIVE';
  if (pago && !reativando) {
    const ate = new Date(usuario.acesso_ate!).toLocaleDateString('pt-BR');
    return (
      <>
        {cabecalho}
        <PatternBackground scrollClassName="p-[28px_20px_60px]">
          <div className="mx-auto flex max-w-[440px] flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-tint text-success">
              <CheckCircle size={36} weight="fill" />
            </div>
            <div className="font-display text-[20px] font-extrabold text-ink">
              {!assinaturaAtiva ? 'Assinatura cancelada' : voltouDoPagamento ? 'Pagamento confirmado! 🎉' : 'Sua assinatura está ativa'}
            </div>
            <div className="font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">
              {assinaturaAtiva
                ? `${assinatura?.planoNome ? `${assinatura.planoNome} · ` : ''}renova automaticamente · acesso liberado até ${ate}.`
                : `Você continua com acesso completo até ${ate}. Depois disso, só o primeiro módulo de cada trilha fica liberado.`}
            </div>
            {aviso && (
              <div role="status" className="font-sans text-[12.5px] font-bold text-success">
                {aviso}
              </div>
            )}
            <PrimaryButton className="mt-3" onClick={fechar}>
              Ir para a trilha
            </PrimaryButton>
            {assinaturaAtiva ? (
              <button onClick={() => setConfirmarCancelamento(true)} className="mt-2 font-sans text-[13px] font-bold text-text3 underline">
                Cancelar assinatura
              </button>
            ) : (
              <button onClick={() => setReativando(true)} className="mt-2 font-sans text-[13px] font-extrabold text-blue">
                Reativar assinatura
              </button>
            )}
          </div>
        </PatternBackground>

        {confirmarCancelamento && (
          <Dialog title="Cancelar assinatura?" onClose={() => !cancelando && setConfirmarCancelamento(false)}>
            <p className="dialog-description">
              Você mantém o acesso completo até {ate}. Nenhuma nova cobrança será feita e você pode reativar quando quiser.
            </p>
            {erroCancelamento && (
              <p role="alert" className="mb-3 font-sans text-[12.5px] font-bold text-error">
                {erroCancelamento}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <PrimaryButton onClick={() => setConfirmarCancelamento(false)} disabled={cancelando} icon={null}>
                Manter assinatura
              </PrimaryButton>
              <button
                onClick={cancelar}
                disabled={cancelando}
                className="h-[48px] rounded-2xl border-[1.5px] border-border bg-surface font-sans text-[14px] font-extrabold text-error disabled:opacity-50"
              >
                {cancelando ? 'Cancelando…' : 'Sim, cancelar'}
              </button>
            </div>
          </Dialog>
        )}
      </>
    );
  }

  // Assinatura criada, fatura ainda não paga (ex.: voltou do Asaas sem pagar,
  // ou pagou e o webhook ainda não chegou).
  if (assinatura?.status === 'ACTIVE' && assinatura.faturaPendente) {
    return (
      <>
        {cabecalho}
        <PatternBackground scrollClassName="p-[28px_20px_60px]">
          <div className="mx-auto flex max-w-[440px] flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-tint text-yellow-text">
              <Crown size={34} weight="fill" />
            </div>
            <div className="font-display text-[20px] font-extrabold text-ink">Falta só o pagamento</div>
            <div className="font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">
              Sua assinatura {assinatura.planoNome ? `(${assinatura.planoNome}) ` : ''}foi criada. Assim que o pagamento for
              confirmado, todos os módulos são liberados. Pix costuma confirmar em segundos; boleto, em até 3 dias úteis.
            </div>
            <PrimaryButton className="mt-3" icon={<ArrowSquareOut weight="bold" size={18} />} onClick={() => window.location.assign(assinatura.faturaPendente!)}>
              Abrir fatura
            </PrimaryButton>
            <button onClick={verificarPagamento} disabled={verificando} className="mt-1 font-sans text-[13px] font-extrabold text-blue disabled:opacity-50">
              {verificando ? 'Verificando…' : 'Já paguei, verificar'}
            </button>
          </div>
        </PatternBackground>
      </>
    );
  }

  const mensal = planos.find((p) => p.ciclo === 'MONTHLY');

  return (
    <>
      {cabecalho}
      <PatternBackground scrollClassName="p-[22px_20px_60px]">
        <div className="mx-auto max-w-[480px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow text-ink">
            <Crown size={26} weight="fill" />
          </div>
          <div className="mt-3 font-display text-[23px] font-extrabold leading-[1.25] text-ink">Desbloqueie a trilha completa</div>
          <div className="mt-2 font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">
            {temAcesso ? 'Você está com acesso cortesia. ' : 'O primeiro módulo é grátis. '}
            Assine para continuar sua preparação sem limites.
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-center gap-2 font-sans text-[13px] font-bold text-ink">
                <Check size={16} weight="bold" className="flex-none text-success" />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2.5" role="radiogroup" aria-label="Planos">
            {planos.map((p) => {
              const meses = MESES_POR_CICLO[p.ciclo] ?? 1;
              const porMes = Number(p.valor) / meses;
              const economia =
                mensal && meses > 1 ? Math.round((1 - Number(p.valor) / (Number(mensal.valor) * meses)) * 100) : 0;
              const selecionado = p.id === planoId;
              return (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={selecionado}
                  onClick={() => setPlanoId(p.id)}
                  className="relative flex w-full items-center gap-3 rounded-2xl p-[15px_16px] text-left transition-all"
                  style={{ border: `2px solid ${selecionado ? '#1557E6' : '#E6EAF5'}`, background: selecionado ? '#EEF3FF' : '#fff' }}
                >
                  <span
                    className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full"
                    style={{ border: `2px solid ${selecionado ? '#1557E6' : '#c9d2e8'}`, background: selecionado ? '#1557E6' : '#fff' }}
                  >
                    {selecionado && <Check size={12} weight="bold" color="#fff" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-[15px] font-extrabold text-ink">{p.nome}</span>
                    <span className="block font-sans text-[12px] font-semibold text-text2">
                      {BRL.format(Number(p.valor))} {NOME_CICLO[p.ciclo] ?? ''}
                      {meses > 1 && ` · ${BRL.format(porMes)}/mês`}
                    </span>
                  </span>
                  {economia > 0 && (
                    <span className="flex-none rounded-lg bg-success px-2 py-1 font-sans text-[11px] font-extrabold text-white">
                      Economize {economia}%
                    </span>
                  )}
                </button>
              );
            })}
            {!planos.length && (
              <div className="rounded-2xl bg-surface p-4 text-center font-sans text-[13px] font-semibold text-text2">
                Nenhum plano disponível no momento.
              </div>
            )}
          </div>

          <div className="mt-5">
            <label htmlFor="cpf" className="mb-1.5 block font-sans text-[12px] font-bold text-text2">
              CPF DO TITULAR
            </label>
            <input
              id="cpf"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              readOnly={!!usuario.cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              className="h-[50px] w-full rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] px-3.5 font-sans text-[16px] font-semibold text-ink outline-none read-only:text-text2"
            />
            <div className="mt-1.5 font-sans text-[11.5px] font-semibold text-text3">Exigido pelo Asaas para emitir a cobrança.</div>
          </div>

          {erro && (
            <div role="alert" className="mt-3 font-sans text-[12.5px] font-bold text-error">
              {erro}
            </div>
          )}

          <div className="mt-5">
            <PrimaryButton onClick={continuar} disabled={enviando || !planoId} variant={enviando || !planoId ? 'disabled' : 'blue'}>
              {enviando ? 'Preparando pagamento…' : 'Continuar para o pagamento'}
            </PrimaryButton>
          </div>
          <div className="mt-3 text-center font-sans text-[11.5px] font-semibold text-text3">
            Pagamento seguro pelo Asaas · Pix, boleto ou cartão
          </div>
        </div>
      </PatternBackground>
    </>
  );
}
