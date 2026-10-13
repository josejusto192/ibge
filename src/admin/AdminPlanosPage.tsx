import { useEffect, useState } from 'react';
import {
  createPlano,
  deletePlano,
  fetchPlanosAdmin,
  fetchUsoPlanos,
  updatePlano,
  type PlanoAdminRow,
  type PlanoInput,
} from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

// Ciclos aceitos pelo Asaas (e pela check constraint de planos.ciclo).
const CICLOS = [
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'SEMIANNUALLY', label: 'Semestral' },
  { value: 'YEARLY', label: 'Anual' },
  { value: 'BIMONTHLY', label: 'Bimestral' },
  { value: 'BIWEEKLY', label: 'Quinzenal' },
  { value: 'WEEKLY', label: 'Semanal' },
];
const nomeCiclo = (c: string) => CICLOS.find((x) => x.value === c)?.label ?? c;
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Aceita "29,90", "29.90", "R$ 1.299,90", "1.299" (milhar no formato BR).
function parseValor(texto: string): number | null {
  if (texto.includes('-')) return null;
  const limpo = texto.replace(/[^\d,.]/g, '');
  const soMilhar = /^\d{1,3}(\.\d{3})+$/.test(limpo);
  const normalizado = limpo.includes(',') || soMilhar ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const valor = Number(normalizado);
  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : null;
}

const formatarValorInput = (valor: number) => valor.toFixed(2).replace('.', ',');

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<PlanoAdminRow[] | null>(null);
  const [uso, setUso] = useState<Map<number, { total: number; ativas: number }>>(new Map());
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [ciclo, setCiclo] = useState('MONTHLY');
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetchPlanosAdmin()
      .then(setPlanos)
      .catch(() => setError('Não foi possível carregar os planos.'));
    fetchUsoPlanos()
      .then(setUso)
      .catch(() => setUso(new Map()));
  }

  useEffect(refresh, []);

  async function run(acao: () => Promise<void>, mensagemErro: string) {
    setError(null);
    try {
      await acao();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? `${mensagemErro} (${err.message})` : mensagemErro);
    }
  }

  async function handleCreate() {
    const v = parseValor(valor);
    if (!nome.trim() || v === null) {
      setError('Informe o nome e um valor válido (ex.: 29,90).');
      return;
    }
    const input: PlanoInput = { nome: nome.trim(), descricao: descricao.trim() || null, valor: v, ciclo, ativo: true, ordem: planos?.length ?? 0 };
    await run(async () => {
      await createPlano(input);
      setNome('');
      setDescricao('');
      setValor('');
      setCiclo('MONTHLY');
      setCreating(false);
    }, 'Erro ao criar plano.');
  }

  function salvarValor(p: PlanoAdminRow, texto: string) {
    const v = parseValor(texto);
    if (v === null) {
      setError(`Valor inválido em "${p.nome}". Use o formato 29,90.`);
      return;
    }
    if (v === Number(p.valor)) return;
    run(() => updatePlano(p.id, { valor: v }), 'Erro ao salvar valor.');
  }

  async function move(p: PlanoAdminRow, dir: -1 | 1) {
    if (!planos) return;
    const idx = planos.findIndex((x) => x.id === p.id);
    const vizinho = planos[idx + dir];
    if (!vizinho) return;
    // Reescreve a ordem de todos (0..n) pra não depender de valores repetidos.
    const nova = [...planos];
    [nova[idx], nova[idx + dir]] = [nova[idx + dir], nova[idx]];
    await run(async () => {
      await Promise.all(nova.map((x, i) => (x.ordem === i ? null : updatePlano(x.id, { ordem: i }))));
    }, 'Erro ao reordenar.');
  }

  async function remove(p: PlanoAdminRow) {
    if (!confirm(`Excluir o plano "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    await run(() => deletePlano(p.id), 'Erro ao excluir plano.');
  }

  const mensal = planos?.find((p) => p.ciclo === 'MONTHLY' && p.ativo);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">Planos</h1>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          {creating ? 'Cancelar' : 'Novo plano'}
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Planos ativos aparecem para o aluno na tela de assinatura, nesta ordem. Mudar valor ou ciclo vale só para{' '}
        <strong>novas assinaturas</strong> — quem já assina continua com o valor que contratou. Plano com assinaturas não pode
        ser excluído, só desativado.
      </p>

      {creating && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500">NOME</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Plano Mensal"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">VALOR (R$)</label>
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder="29,90"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">COBRANÇA</label>
              <select value={ciclo} onChange={(e) => setCiclo(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm">
                {CICLOS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold text-gray-500">DESCRIÇÃO (opcional)</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Acesso completo"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button onClick={handleCreate} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Criar plano
          </button>
        </div>
      )}

      {error && <div className="mt-3 text-sm font-semibold text-red-600">{error}</div>}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {(planos ?? []).map((p, i) => {
          const u = uso.get(p.id);
          const meses = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUALLY: 6, YEARLY: 12 }[p.ciclo] ?? 0;
          const economia =
            mensal && p.id !== mensal.id && meses > 1
              ? Math.round((1 - Number(p.valor) / (Number(mensal.valor) * meses)) * 100)
              : null;
          return (
            <div
              key={p.id}
              className={`flex items-start gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0 ${p.ativo ? '' : 'bg-gray-50'}`}
            >
              <div className="flex flex-col gap-1 pt-1">
                <button disabled={i === 0} onClick={() => move(p, -1)} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">
                  ▲
                </button>
                <button
                  disabled={i === (planos?.length ?? 0) - 1}
                  onClick={() => move(p, 1)}
                  className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <input
                  key={`n-${p.id}-${p.nome}`}
                  defaultValue={p.nome}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== p.nome) run(() => updatePlano(p.id, { nome: v }), 'Erro ao salvar nome.');
                  }}
                  className="w-full rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-gray-900 hover:border-gray-300 focus:border-gray-300"
                />
                <div className="flex flex-wrap items-center gap-2 px-2">
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    R$
                    <input
                      key={`v-${p.id}-${p.valor}`}
                      defaultValue={formatarValorInput(Number(p.valor))}
                      inputMode="decimal"
                      onBlur={(e) => salvarValor(p, e.target.value)}
                      className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-xs"
                    />
                  </label>
                  <select
                    value={p.ciclo}
                    onChange={(e) => run(() => updatePlano(p.id, { ciclo: e.target.value }), 'Erro ao salvar cobrança.')}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                  >
                    {CICLOS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400">
                    {BRL.format(Number(p.valor))} {nomeCiclo(p.ciclo).toLowerCase()}
                    {meses > 1 && ` · ${BRL.format(Number(p.valor) / meses)}/mês`}
                    {economia !== null && economia > 0 && ` · aparece como "Economize ${economia}%"`}
                  </span>
                </div>
                <input
                  key={`d-${p.id}-${p.descricao ?? ''}`}
                  defaultValue={p.descricao ?? ''}
                  placeholder="Descrição (opcional)"
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== p.descricao) run(() => updatePlano(p.id, { descricao: v }), 'Erro ao salvar descrição.');
                  }}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div className="flex flex-none flex-col items-end gap-1.5 pt-1">
                <button
                  onClick={() => run(() => updatePlano(p.id, { ativo: !p.ativo }), 'Erro ao alterar plano.')}
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                  title={p.ativo ? 'Clique para esconder dos alunos' : 'Clique para mostrar aos alunos'}
                >
                  {p.ativo ? 'Ativo' : 'Desativado'}
                </button>
                <span className="text-xs text-gray-500">
                  {u?.ativas ?? 0} assinante{(u?.ativas ?? 0) === 1 ? '' : 's'}
                </span>
                {!u?.total && (
                  <button onClick={() => remove(p)} className="text-xs font-bold text-red-600 hover:underline">
                    Excluir
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {planos?.length === 0 && <div className="px-4 py-6 text-center text-gray-400">Nenhum plano ainda.</div>}
        {!planos && !error && <div className="px-4 py-6 text-center text-gray-400">Carregando…</div>}
      </div>
    </AdminLayout>
  );
}
