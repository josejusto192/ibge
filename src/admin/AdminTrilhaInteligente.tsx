import { useEffect, useMemo, useState } from 'react';
import {
  CONFIG_PADRAO,
  contarEstoque,
  createModulo,
  createSecao,
  deleteModulo,
  deleteSecao,
  fetchAssuntos,
  fetchEstoqueTrilha,
  fetchFiltrosQuestoes,
  fetchRegrasTrilha,
  fetchTrilhaConfig,
  removerRegra,
  salvarRegra,
  saveTrilhaConfig,
  searchQuestoes,
  sugerirEstrutura,
  updateModulo,
  updateSecao,
  type AssuntoEstoque,
  type EstoqueAssunto,
  type EstoqueContado,
  type EstoqueEtapa,
  type FiltrosQuestoes,
  type RegraQuestao,
  type TrilhaConfig,
} from '../lib/adminQueries';
import { fetchModulos, fetchSecoes, fetchSessaoInteligente, type ModuloRow, type SecaoRow } from '../lib/queries';
import type { QuestaoRow } from '../lib/database.types';
import type { Questao } from '../data/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

// Trilha inteligente (migrations 028 e 030): o admin define concurso,
// filtros do banco, banca-alvo, seções e unidades (disciplina/assuntos e
// quantas lições) e questões obrigatórias/excluídas; o algoritmo monta cada
// lição de cada aluno dentro dessas regras. Para o aluno é um caminho
// estilo Duolingo: seções → unidades → bolinhas, sem meta nem nota mínima.

const MOTIVO_ROTULO: Record<string, string> = {
  nova: 'Nova',
  obrigatoria: 'Obrigatória',
  revisao: 'Revisão',
  reforco: 'Reforço',
  repeticao: 'Refazendo',
  relembrar: 'Relembrar',
};

const input = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const rotulo = 'text-xs font-bold text-gray-500';

export default function AdminTrilhaInteligente({ trilhaId }: { trilhaId: number }) {
  const [config, setConfig] = useState<TrilhaConfig | null>(null);
  const [configSalva, setConfigSalva] = useState<string>('');
  const [filtros, setFiltros] = useState<FiltrosQuestoes | null>(null);
  const [etapas, setEtapas] = useState<ModuloRow[] | null>(null);
  const [secoes, setSecoes] = useState<SecaoRow[]>([]);
  const [estoque, setEstoque] = useState<Map<number, EstoqueEtapa>>(new Map());
  const [regras, setRegras] = useState<RegraQuestao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  function recarregar() {
    fetchModulos(trilhaId).then((rows) => setEtapas(rows.filter((m) => m.tipo === 'inteligente')));
    fetchSecoes(trilhaId).then(setSecoes).catch(() => setSecoes([]));
    fetchEstoqueTrilha(trilhaId).then(setEstoque).catch(() => setEstoque(new Map()));
    fetchRegrasTrilha(trilhaId).then(setRegras).catch(() => setRegras([]));
  }

  useEffect(() => {
    fetchTrilhaConfig(trilhaId)
      .then((c) => {
        setConfig(c);
        setConfigSalva(JSON.stringify(c));
      })
      .catch(() => setConfig(CONFIG_PADRAO(trilhaId)));
    fetchFiltrosQuestoes().then(setFiltros);
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trilhaId]);

  const configMudou = !!config && JSON.stringify(config) !== configSalva;

  async function salvarConfig() {
    if (!config) return;
    setSalvando(true);
    setAviso(null);
    try {
      await saveTrilhaConfig(config);
      setConfigSalva(JSON.stringify(config));
      setAviso('Filtros salvos. O estoque das etapas foi recalculado.');
      recarregar();
    } catch (err) {
      setAviso(err instanceof Error ? `Erro ao salvar: ${err.message}` : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  if (!config || !filtros || !etapas) return <div className="mt-6 text-gray-400">Carregando trilha inteligente…</div>;

  const set = <K extends keyof TrilhaConfig>(k: K, v: TrilhaConfig[K]) => setConfig({ ...config, [k]: v });

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <strong>✨ Trilha inteligente.</strong> O aluno vê um caminho como o do Duolingo: <b>seções</b> (blocos grandes, ex.: uma
        disciplina) → <b>unidades</b> (um tema) → <b>bolinhas</b> (lições). Cada unidade tem N lições e, no fim, uma bolinha de{' '}
        <b>revisão da unidade</b>. Terminou a lição, a próxima libera — sem nota mínima. Por trás, o algoritmo escolhe as questões
        de cada lição no nível do aluno (chance de ~70% de acerto), intercala revisões vencidas e reforça o que ele mais erra,
        priorizando a banca-alvo.
      </div>

      {/* ---------- Concurso e filtros ---------- */}
      <Secao titulo="1. Concurso e filtros do banco" subtitulo="Só questões revisadas, não anuladas e não desatualizadas entram.">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>CONCURSO</label>
            <input value={config.concurso ?? ''} onChange={(e) => set('concurso', e.target.value || null)} placeholder="Ex.: TJ-SP 2026" className={input} />
          </div>
          <div>
            <label className={rotulo}>CARGO ALVO</label>
            <input
              value={config.cargo_alvo ?? ''}
              onChange={(e) => set('cargo_alvo', e.target.value || null)}
              placeholder="Ex.: Escrevente Técnico Judiciário"
              className={input}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <MultiEscolha rotulo="BANCAS (vazio = todas)" opcoes={filtros.bancas} valor={config.bancas} onChange={(v) => set('bancas', v)} />
          <div>
            <label className={rotulo}>BANCA-ALVO (prioridade)</label>
            <select value={config.banca_alvo ?? ''} onChange={(e) => set('banca_alvo', e.target.value || null)} className={input}>
              <option value="">Nenhuma — sem prioridade</option>
              {(config.bancas.length ? config.bancas : filtros.bancas).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {config.banca_alvo && (
              <div className="mt-2">
                <label className={rotulo}>
                  {config.banca_alvo_pct}% DAS QUESTÕES NOVAS DA BANCA-ALVO (quando houver estoque)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={config.banca_alvo_pct}
                  onChange={(e) => set('banca_alvo_pct', Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </div>
            )}
          </div>
          <MultiEscolha rotulo="ÓRGÃOS (vazio = todos)" opcoes={filtros.orgaos} valor={config.orgaos} onChange={(v) => set('orgaos', v)} />
          <MultiEscolha rotulo="CARGOS (vazio = todos)" opcoes={filtros.cargos} valor={config.cargos} onChange={(v) => set('cargos', v)} />
          <MultiEscolha rotulo="ESCOLARIDADE (vazio = todas)" opcoes={filtros.niveis} valor={config.niveis} onChange={(v) => set('niveis', v)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={rotulo}>ANO DE</label>
              <input
                type="number"
                value={config.ano_min ?? ''}
                onChange={(e) => set('ano_min', e.target.value ? Number(e.target.value) : null)}
                placeholder="qualquer"
                className={input}
              />
            </div>
            <div>
              <label className={rotulo}>ATÉ</label>
              <input
                type="number"
                value={config.ano_max ?? ''}
                onChange={(e) => set('ano_max', e.target.value ? Number(e.target.value) : null)}
                placeholder="qualquer"
                className={input}
              />
            </div>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={config.apenas_certo_errado} onChange={(e) => set('apenas_certo_errado', e.target.checked)} />
          Só questões Certo/Errado (estilo Cebraspe)
        </label>

        {/* TEMPORÁRIO (migration 029): remover antes do lançamento — procure por "permitir_nao_revisadas" */}
        <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={config.permitir_nao_revisadas}
            onChange={(e) => set('permitir_nao_revisadas', e.target.checked)}
          />
          <span>
            Usar também questões ainda não revisadas <span className="rounded bg-amber-200 px-1.5 text-xs">TEMPORÁRIO</span>
            <span className="block text-xs font-medium text-amber-800">
              O aluno vê o comentário original da questão. Útil enquanto o banco não está todo revisado — desligar antes do lançamento.
            </span>
          </span>
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>QUESTÕES POR SESSÃO (5–30)</label>
            <input
              type="number"
              min={5}
              max={30}
              value={config.questoes_por_sessao}
              onChange={(e) => set('questoes_por_sessao', limitar(Number(e.target.value), 5, 30))}
              className={input}
            />
          </div>
          <div>
            <label className={rotulo}>REVISÕES POR SESSÃO (0–5)</label>
            <input
              type="number"
              min={0}
              max={5}
              value={config.revisoes_por_sessao}
              onChange={(e) => set('revisoes_por_sessao', limitar(Number(e.target.value), 0, 5))}
              className={input}
            />
            <p className="mt-1 text-xs text-gray-400">Erros e revisões programadas (1, 7 e 30 dias) que venceram entram no começo.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={salvarConfig}
            disabled={!configMudou || salvando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {salvando ? 'Salvando…' : 'Salvar filtros'}
          </button>
          {configMudou && <span className="text-xs font-bold text-amber-600">Alterações não salvas — o estoque abaixo usa os filtros salvos.</span>}
          {aviso && !configMudou && <span className="text-xs font-semibold text-gray-500">{aviso}</span>}
        </div>
      </Secao>

      {/* ---------- Seções e unidades ---------- */}
      <Secao
        titulo="2. Seções e unidades"
        subtitulo="A 1ª unidade do caminho é grátis; as demais exigem assinatura. Trilhas longas: muitas unidades pequenas funcionam melhor que poucas enormes."
      >
        <SugerirEstrutura
          trilhaId={trilhaId}
          secoes={secoes}
          etapas={etapas}
          questoesPorLicao={config.questoes_por_sessao}
          configMudou={configMudou}
          onCriada={recarregar}
        />
        <div className="mt-4 space-y-5">
          {gruposDe(etapas, secoes).map((g) => (
            <div key={g.secao?.id ?? 'sem'} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
              {g.secao ? (
                <CabecalhoSecao
                  secao={g.secao}
                  indice={secoes.indexOf(g.secao)}
                  total={secoes.length}
                  unidades={g.unidades.length}
                  onMudou={recarregar}
                  onMover={async (dir) => {
                    const i = secoes.indexOf(g.secao!);
                    const outra = secoes[i + dir];
                    if (!outra) return;
                    await Promise.all([updateSecao(g.secao!.id, { ordem: outra.ordem }), updateSecao(outra.id, { ordem: g.secao!.ordem })]);
                    recarregar();
                  }}
                />
              ) : (
                <div className="mb-2 text-xs font-bold text-gray-500">
                  {secoes.length ? 'SEM SEÇÃO (aparecem antes da 1ª seção)' : 'UNIDADES'}
                </div>
              )}
              <div className="space-y-3">
                {g.unidades.map((m, i) => (
                  <EtapaEditor
                    key={m.id}
                    etapa={m}
                    numero={numeroDa(m, etapas, secoes)}
                    indice={i}
                    total={g.unidades.length}
                    secoes={secoes}
                    disciplinas={filtros.disciplinas}
                    estoque={estoque.get(m.id)}
                    trilhaId={trilhaId}
                    bancaAlvo={config.banca_alvo}
                    questoesPorLicao={config.questoes_por_sessao}
                    onSalva={recarregar}
                    onMover={async (dir) => {
                      const outra = g.unidades[i + dir];
                      if (!outra) return;
                      const [a, b] = outra.ordem === m.ordem ? [m.ordem + dir, m.ordem] : [outra.ordem, m.ordem];
                      await Promise.all([updateModulo(m.id, { ordem: a }), updateModulo(outra.id, { ordem: b })]);
                      recarregar();
                    }}
                    onExcluir={async () => {
                      if (!confirm(`Excluir a unidade "${m.titulo}"? O progresso dos alunos nela é perdido.`)) return;
                      await deleteModulo(m.id);
                      recarregar();
                    }}
                  />
                ))}
                {g.unidades.length === 0 && <div className="rounded-lg bg-white p-3 text-center text-xs text-gray-400">Nenhuma unidade nesta seção.</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.6fr]">
          <NovaSecao trilhaId={trilhaId} ordem={secoes.length ? Math.max(...secoes.map((x) => x.ordem)) + 1 : 0} onCriada={recarregar} />
          <NovaEtapa
            trilhaId={trilhaId}
            disciplinas={filtros.disciplinas}
            secoes={secoes}
            ordem={etapas.length ? Math.max(...etapas.map((e) => e.ordem)) + 1 : 0}
            onCriada={recarregar}
          />
        </div>
      </Secao>

      {/* ---------- Questões fixas ---------- */}
      <Secao
        titulo="3. Questões obrigatórias e excluídas"
        subtitulo="Obrigatórias aparecem para todo aluno na unidade escolhida (antes das novas). Excluídas nunca aparecem nesta trilha."
      >
        <QuestoesFixas
          trilhaId={trilhaId}
          etapas={etapas}
          regras={regras}
          disciplinas={filtros.disciplinas}
          permitirNaoRevisadas={config.permitir_nao_revisadas}
          onMudou={recarregar}
        />
      </Secao>
    </div>
  );
}

function limitar(n: number, min: number, max: number) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : min;
}

// Lições sugeridas para uma unidade: cada questão nova aparece ~2 vezes
// no caminho (lição + revisões), entre 2 e 8 bolinhas.
function licoesSugeridas(estoque: number, questoesPorLicao: number) {
  return limitar(estoque / (Math.max(5, questoesPorLicao) * 1.5), 2, 8);
}

interface GrupoAdmin {
  secao: SecaoRow | null;
  unidades: ModuloRow[];
}

// Mesma ordem que o aluno vê: sem seção primeiro, depois cada seção.
function gruposDe(etapas: ModuloRow[], secoes: SecaoRow[]): GrupoAdmin[] {
  const ids = new Set(secoes.map((x) => x.id));
  const porOrdem = (a: ModuloRow, b: ModuloRow) => a.ordem - b.ordem || a.id - b.id;
  const soltas = etapas.filter((m) => m.secao_id == null || !ids.has(m.secao_id)).sort(porOrdem);
  const grupos: GrupoAdmin[] = soltas.length || !secoes.length ? [{ secao: null, unidades: soltas }] : [];
  for (const sec of secoes) grupos.push({ secao: sec, unidades: etapas.filter((m) => m.secao_id === sec.id).sort(porOrdem) });
  return grupos;
}

function numeroDa(m: ModuloRow, etapas: ModuloRow[], secoes: SecaoRow[]) {
  return gruposDe(etapas, secoes).flatMap((g) => g.unidades).findIndex((u) => u.id === m.id) + 1;
}

function CabecalhoSecao({
  secao,
  indice,
  total,
  unidades,
  onMudou,
  onMover,
}: {
  secao: SecaoRow;
  indice: number;
  total: number;
  unidades: number;
  onMudou: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  const [titulo, setTitulo] = useState(secao.titulo);
  const mudou = titulo.trim() !== secao.titulo && !!titulo.trim();
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="flex flex-col">
        <button disabled={indice === 0} onClick={() => onMover(-1)} className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Subir seção">
          ▲
        </button>
        <button disabled={indice === total - 1} onClick={() => onMover(1)} className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Descer seção">
          ▼
        </button>
      </div>
      <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-extrabold text-violet-700">SEÇÃO {indice + 1}</span>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="min-w-[200px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold" />
      {mudou && (
        <button
          onClick={async () => {
            await updateSecao(secao.id, { titulo: titulo.trim() });
            onMudou();
          }}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
        >
          Salvar nome
        </button>
      )}
      <span className="text-xs text-gray-500">{unidades} unidade(s)</span>
      <button
        onClick={async () => {
          if (!confirm(`Excluir a seção "${secao.titulo}"? As unidades dela não são apagadas: ficam "sem seção".`)) return;
          await deleteSecao(secao.id);
          onMudou();
        }}
        className="text-xs font-bold text-red-600 hover:underline"
      >
        Excluir seção
      </button>
    </div>
  );
}

function NovaSecao({ trilhaId, ordem, onCriada }: { trilhaId: number; ordem: number; onCriada: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  async function criar() {
    if (!titulo.trim()) return setErro('Dê um nome à seção.');
    setErro(null);
    try {
      await createSecao(trilhaId, titulo.trim(), ordem);
      setTitulo('');
      onCriada();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar seção.');
    }
  }
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3">
      <div className="text-xs font-bold text-gray-500">NOVA SEÇÃO</div>
      <div className="mt-2 flex gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && criar()}
          placeholder="Ex.: Língua Portuguesa"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button onClick={criar} className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700">
          Criar
        </button>
      </div>
      {erro && <div className="mt-1 text-xs font-semibold text-red-600">{erro}</div>}
    </div>
  );
}

// ---------- Sugerir estrutura: seções por disciplina, unidades por assunto ----------

interface UnidadeSugerida {
  chave: string;
  titulo: string;
  disciplina: string;
  assuntos: string[];
  estoque: number;
  licoes: number;
  jaExiste: boolean;
}

interface SecaoSugerida {
  disciplina: string;
  estoque: number;
  unidades: UnidadeSugerida[];
}

function montarSugestao(linhas: EstoqueAssunto[], etapas: ModuloRow[], questoesPorLicao: number): SecaoSugerida[] {
  const minimo = Math.max(5, questoesPorLicao);
  const cobertos = new Set(etapas.flatMap((e) => (e.assuntos ?? []).map((a) => `${e.disciplina}§${a}`)));
  const disciplinasInteiras = new Set(etapas.filter((e) => e.disciplina && !(e.assuntos ?? []).length).map((e) => e.disciplina));
  const porDisciplina = new Map<string, EstoqueAssunto[]>();
  for (const l of linhas) porDisciplina.set(l.disciplina, [...(porDisciplina.get(l.disciplina) ?? []), l]);
  const secoes: SecaoSugerida[] = [];
  for (const [disciplina, itens] of porDisciplina) {
    const comNome = itens.filter((i) => i.assunto.trim()).sort((a, b) => b.estoque - a.estoque);
    const grandes = comNome.filter((i) => i.estoque >= minimo);
    const pequenos = comNome.filter((i) => i.estoque < minimo);
    const unidades: UnidadeSugerida[] = grandes.map((i) => ({
      chave: `${disciplina}§${i.assunto}`,
      titulo: i.assunto,
      disciplina,
      assuntos: [i.assunto],
      estoque: i.estoque,
      licoes: licoesSugeridas(i.estoque, questoesPorLicao),
      jaExiste: cobertos.has(`${disciplina}§${i.assunto}`) || disciplinasInteiras.has(disciplina),
    }));
    // assuntos com pouca questão viram uma unidade só ("Mais de X")
    const somaPequenos = pequenos.reduce((t, i) => t + i.estoque, 0);
    if (pequenos.length && somaPequenos >= minimo)
      unidades.push({
        chave: `${disciplina}§+outros`,
        titulo: grandes.length ? `Mais de ${disciplina}` : disciplina,
        disciplina,
        assuntos: pequenos.map((i) => i.assunto),
        estoque: somaPequenos,
        licoes: licoesSugeridas(somaPequenos, questoesPorLicao),
        jaExiste: disciplinasInteiras.has(disciplina) || pequenos.every((i) => cobertos.has(`${disciplina}§${i.assunto}`)),
      });
    if (unidades.length) secoes.push({ disciplina, estoque: unidades.reduce((t, u) => t + u.estoque, 0), unidades });
  }
  return secoes.sort((a, b) => b.estoque - a.estoque);
}

function SugerirEstrutura({
  trilhaId,
  secoes,
  etapas,
  questoesPorLicao,
  configMudou,
  onCriada,
}: {
  trilhaId: number;
  secoes: SecaoRow[];
  etapas: ModuloRow[];
  questoesPorLicao: number;
  configMudou: boolean;
  onCriada: () => void;
}) {
  const [sugestao, setSugestao] = useState<SecaoSugerida[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function sugerir() {
    setCarregando(true);
    setAviso(null);
    try {
      const s = montarSugestao(await sugerirEstrutura(trilhaId), etapas, questoesPorLicao);
      setSugestao(s);
      setMarcadas(new Set(s.flatMap((sec) => sec.unidades.filter((u) => !u.jaExiste).map((u) => u.chave))));
      if (!s.length) setAviso('Não há questões suficientes com os filtros salvos. Amplie os filtros (seção 1) e tente de novo.');
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'Não foi possível sugerir.');
    } finally {
      setCarregando(false);
    }
  }

  async function criar() {
    if (!sugestao) return;
    setCriando(true);
    setAviso(null);
    try {
      let ordemSecao = secoes.length ? Math.max(...secoes.map((x) => x.ordem)) + 1 : 0;
      let ordemUnidade = etapas.length ? Math.max(...etapas.map((e) => e.ordem)) + 1 : 0;
      let criadas = 0;
      for (const sec of sugestao) {
        const escolhidas = sec.unidades.filter((u) => marcadas.has(u.chave));
        if (!escolhidas.length) continue;
        // reaproveita a seção de mesmo nome, se já existir
        const existente = secoes.find((x) => x.titulo.trim().toLowerCase() === sec.disciplina.trim().toLowerCase());
        const secaoId = existente?.id ?? (await createSecao(trilhaId, sec.disciplina, ordemSecao++)).id;
        for (const u of escolhidas) {
          await createModulo(trilhaId, {
            titulo: u.titulo,
            ordem: ordemUnidade++,
            tipo: 'inteligente',
            disciplina: u.disciplina,
            assuntos: u.assuntos,
            secao_id: secaoId,
            licoes: u.licoes,
          });
          criadas++;
        }
      }
      setSugestao(null);
      setAviso(`${criadas} unidade(s) criada(s). Ajuste nomes, ordem e lições à vontade.`);
      onCriada();
    } catch (err) {
      setAviso(err instanceof Error ? `Erro ao criar: ${err.message}` : 'Erro ao criar.');
    } finally {
      setCriando(false);
    }
  }

  const alternar = (chave: string) =>
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(chave)) nova.delete(chave);
      else nova.add(chave);
      return nova;
    });

  const escolhidas = sugestao?.flatMap((x) => x.unidades).filter((u) => marcadas.has(u.chave)) ?? [];
  const licoesTotal = escolhidas.reduce((t, u) => t + u.licoes + 1, 0);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 text-sm text-blue-900">
          <strong>💡 Não sabe o que colocar?</strong> Eu olho o banco com os filtros salvos e sugiro uma seção por disciplina e uma
          unidade por assunto (com as lições calculadas pelo estoque). Você marca o que quer e cria tudo de uma vez.
        </div>
        <button
          onClick={sugestao ? () => setSugestao(null) : sugerir}
          disabled={carregando || configMudou}
          title={configMudou ? 'Salve os filtros antes' : ''}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          {carregando ? 'Analisando o banco…' : sugestao ? 'Fechar sugestão' : 'Sugerir estrutura'}
        </button>
      </div>
      {aviso && <div className="mt-2 text-xs font-semibold text-blue-900">{aviso}</div>}
      {sugestao && sugestao.length > 0 && (
        <div className="mt-3 space-y-3">
          {sugestao.map((sec) => (
            <div key={sec.disciplina} className="rounded-lg border border-blue-100 bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                Seção: {sec.disciplina}
                <span className="text-xs font-semibold text-gray-400">{sec.estoque} questões</span>
              </div>
              <div className="mt-2 grid gap-1.5">
                {sec.unidades.map((u) => (
                  <label key={u.chave} className={`flex items-center gap-2 text-xs ${u.jaExiste ? 'text-gray-400' : 'text-gray-700'}`}>
                    <input type="checkbox" checked={marcadas.has(u.chave)} onChange={() => alternar(u.chave)} />
                    <span className="min-w-0 flex-1 truncate font-semibold" title={u.assuntos.join(', ')}>
                      {u.titulo}
                      {u.assuntos.length > 1 && <span className="font-normal text-gray-400"> ({u.assuntos.length} assuntos)</span>}
                    </span>
                    {u.jaExiste && <span className="rounded bg-gray-100 px-1.5 font-bold">já tem na trilha</span>}
                    <span className="w-24 text-right">{u.estoque} questões</span>
                    <span className="w-16 text-right font-bold text-blue-700">{u.licoes} lições</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={criar}
              disabled={!escolhidas.length || criando}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:bg-gray-300"
            >
              {criando ? 'Criando…' : `Criar ${escolhidas.length} unidade(s)`}
            </button>
            <span className="text-xs font-semibold text-gray-600">
              ≈ {licoesTotal} bolinhas no caminho · {licoesTotal * questoesPorLicao} questões respondidas por aluno
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Secao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-base font-extrabold text-gray-900">{titulo}</h2>
      {subtitulo && <p className="mt-0.5 text-xs text-gray-500">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Escolha múltipla: chips removíveis + lista para adicionar.
function MultiEscolha({
  rotulo: titulo,
  opcoes,
  valor,
  onChange,
  rotuloOpcao,
}: {
  rotulo: string;
  opcoes: string[];
  valor: string[];
  onChange: (v: string[]) => void;
  rotuloOpcao?: (o: string) => string;
}) {
  const restantes = opcoes.filter((o) => !valor.includes(o));
  return (
    <div>
      <label className={rotulo}>{titulo}</label>
      <div className="mt-1 flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 p-1.5">
        {valor.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
            {v}
            <button type="button" onClick={() => onChange(valor.filter((x) => x !== v))} className="text-blue-400 hover:text-blue-800" aria-label={`Remover ${v}`}>
              ×
            </button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...valor, e.target.value])}
          className="min-w-[120px] flex-1 border-none bg-transparent text-xs text-gray-500 outline-none"
        >
          <option value="">{restantes.length ? '+ adicionar…' : 'nada para adicionar'}</option>
          {restantes.map((o) => (
            <option key={o} value={o}>
              {rotuloOpcao ? rotuloOpcao(o) : o}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AvisosEstoque({ total, porUnidade, naoRevisadas, bancaAlvo, daBanca }: { total: number; porUnidade: number; naoRevisadas?: number; bancaAlvo: string | null; daBanca: number }) {
  return (
    <div className="mt-2 space-y-1 text-xs font-semibold">
      <div className="text-gray-600">
        <strong className="text-gray-900">{total}</strong> questões no estoque
        {bancaAlvo && (
          <>
            {' '}
            · <strong className="text-gray-900">{daBanca}</strong> da {bancaAlvo}
          </>
        )}
      </div>
      {total === 0 ? (
        <div className="text-red-600">⛔ Nenhuma questão com esses filtros — a unidade ficaria vazia.</div>
      ) : total < porUnidade * 0.6 ? (
        <div className="text-amber-600">⚠ Poucas questões para tantas lições: o aluno vai repetir bastante. Diminua as lições ou amplie os assuntos.</div>
      ) : total < 30 ? (
        <div className="text-amber-600">⚠ Pouco estoque: o ideal é 30+ para o algoritmo ter onde escolher no nível de cada aluno.</div>
      ) : (
        <div className="text-green-700">✓ Estoque bom para o algoritmo trabalhar.</div>
      )}
      {!!naoRevisadas && (
        <div className="text-gray-500">
          ℹ {naoRevisadas} questões desse recorte ainda não têm comentário revisado e não entram — revise no Banco de questões ou ligue “usar não revisadas” nos filtros.
        </div>
      )}
    </div>
  );
}

function EtapaEditor({
  etapa,
  numero,
  indice,
  total,
  secoes,
  disciplinas,
  estoque,
  trilhaId,
  bancaAlvo,
  questoesPorLicao,
  onSalva,
  onMover,
  onExcluir,
}: {
  etapa: ModuloRow;
  numero: number;
  indice: number;
  total: number;
  secoes: SecaoRow[];
  disciplinas: string[];
  estoque: EstoqueEtapa | undefined;
  trilhaId: number;
  bancaAlvo: string | null;
  questoesPorLicao: number;
  onSalva: () => void;
  onMover: (dir: -1 | 1) => void;
  onExcluir: () => void;
}) {
  const [titulo, setTitulo] = useState(etapa.titulo);
  const [disciplina, setDisciplina] = useState(etapa.disciplina ?? '');
  const [assuntos, setAssuntos] = useState<string[]>(etapa.assuntos ?? []);
  const [licoes, setLicoes] = useState(etapa.licoes);
  const [secaoId, setSecaoId] = useState<number | null>(etapa.secao_id);
  const [opcoesAssunto, setOpcoesAssunto] = useState<AssuntoEstoque[]>([]);
  const [contagem, setContagem] = useState<EstoqueContado | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [simulacao, setSimulacao] = useState<Questao[] | null>(null);
  const [erroSim, setErroSim] = useState<string | null>(null);

  const mudou =
    titulo !== etapa.titulo ||
    disciplina !== (etapa.disciplina ?? '') ||
    assuntos.join('|') !== (etapa.assuntos ?? []).join('|') ||
    licoes !== etapa.licoes ||
    secaoId !== etapa.secao_id;

  useEffect(() => {
    if (!disciplina) {
      setOpcoesAssunto([]);
      return;
    }
    fetchAssuntos(disciplina).then(setOpcoesAssunto).catch(() => setOpcoesAssunto([]));
  }, [disciplina]);

  // estoque ao vivo enquanto edita
  const chave = useDebouncedValue(`${disciplina}§${assuntos.join('|')}`, 400);
  useEffect(() => {
    const [d, a] = chave.split('§');
    contarEstoque(trilhaId, d || null, a ? a.split('|') : [])
      .then(setContagem)
      .catch(() => setContagem(null));
  }, [chave, trilhaId]);

  const rotuloAssunto = useMemo(() => {
    const porNome = new Map(opcoesAssunto.map((a) => [a.assunto, a]));
    return (nome: string) => {
      const a = porNome.get(nome);
      return a ? `${nome} (${a.revisadas} revisadas de ${a.total})` : nome;
    };
  }, [opcoesAssunto]);

  const totalEstoque = contagem?.total ?? estoque?.total ?? 0;
  const sugeridas = licoesSugeridas(totalEstoque, questoesPorLicao);

  async function salvar() {
    setSalvando(true);
    try {
      await updateModulo(etapa.id, {
        titulo: titulo.trim() || etapa.titulo,
        disciplina: disciplina || null,
        assuntos,
        licoes: limitar(licoes, 1, 20),
        secao_id: secaoId,
      });
      onSalva();
    } finally {
      setSalvando(false);
    }
  }

  async function simular() {
    setErroSim(null);
    try {
      setSimulacao(await fetchSessaoInteligente(etapa.id));
    } catch (err) {
      setErroSim(err instanceof Error ? err.message : 'Não foi possível simular.');
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1 pt-6">
          <button disabled={indice === 0} onClick={() => onMover(-1)} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">
            ▲
          </button>
          <button disabled={indice === total - 1} onClick={() => onMover(1)} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">
            ▼
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[1fr_1fr_1fr_120px] gap-3">
            <div>
              <label className={rotulo}>
                UNIDADE {numero}
                {numero === 1 && <span className="ml-1 rounded bg-green-100 px-1.5 text-green-700">GRÁTIS</span>}
              </label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={input} />
            </div>
            <div>
              <label className={rotulo}>DISCIPLINA</label>
              <select
                value={disciplina}
                onChange={(e) => {
                  setDisciplina(e.target.value);
                  setAssuntos([]);
                }}
                className={input}
              >
                <option value="">Todas (misturadas)</option>
                {disciplinas.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={rotulo}>SEÇÃO</label>
              <select value={secaoId ?? ''} onChange={(e) => setSecaoId(e.target.value ? Number(e.target.value) : null)} className={input}>
                <option value="">Sem seção</option>
                {secoes.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.titulo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={rotulo} title="Bolinhas desta unidade (fora a revisão final)">LIÇÕES (1–20)</label>
              <input type="number" min={1} max={20} value={licoes} onChange={(e) => setLicoes(Number(e.target.value))} className={input} />
              {totalEstoque > 0 && sugeridas !== licoes && (
                <button type="button" onClick={() => setLicoes(sugeridas)} className="mt-1 text-[11px] font-bold text-blue-600 hover:underline">
                  Sugerido: {sugeridas}
                </button>
              )}
            </div>
          </div>
          {disciplina && (
            <div className="mt-3">
              <MultiEscolha
                rotulo="ASSUNTOS (vazio = a disciplina inteira)"
                opcoes={opcoesAssunto.map((a) => a.assunto)}
                valor={assuntos}
                onChange={setAssuntos}
                rotuloOpcao={rotuloAssunto}
              />
            </div>
          )}
          <AvisosEstoque
            total={totalEstoque}
            daBanca={contagem?.banca_alvo ?? estoque?.banca_alvo ?? 0}
            porUnidade={limitar(licoes, 1, 20) * questoesPorLicao}
            naoRevisadas={contagem?.nao_revisadas}
            bancaAlvo={bancaAlvo}
          />
          {!!estoque?.obrigatorias && <div className="mt-1 text-xs font-semibold text-violet-700">★ {estoque.obrigatorias} questões obrigatórias nesta unidade</div>}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={salvar}
              disabled={!mudou || salvando}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              {salvando ? 'Salvando…' : 'Salvar unidade'}
            </button>
            {mudou && <span className="text-xs font-bold text-amber-600">Alterações não salvas</span>}
            <button onClick={simulacao ? () => setSimulacao(null) : simular} className="text-xs font-bold text-violet-700 hover:underline">
              {simulacao ? 'Fechar simulação' : 'Simular uma lição (como se fosse você)'}
            </button>
            <button onClick={onExcluir} className="ml-auto text-xs font-bold text-red-600 hover:underline">
              Excluir unidade
            </button>
          </div>
          {erroSim && <div className="mt-2 text-xs font-semibold text-red-600">{erroSim}</div>}
          {simulacao && (
            <ol className="mt-3 space-y-1 rounded-lg bg-gray-50 p-3 text-xs">
              {simulacao.length === 0 && <li className="text-gray-400">A lição veio vazia — confira os filtros e o estoque.</li>}
              {simulacao.map((q, i) => (
                <li key={`${q.id}-${i}`} className="flex gap-2">
                  <span className="w-5 flex-none text-right font-bold text-gray-400">{i + 1}.</span>
                  <span className="w-20 flex-none font-bold text-violet-700">{MOTIVO_ROTULO[q.motivo ?? 'nova'] ?? q.motivo}</span>
                  <span className="w-24 flex-none text-gray-500">
                    {q.banca} {q.ano || ''}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-gray-700">{q.enunciado}</span>
                </li>
              ))}
              <li className="pt-1 text-gray-400">A lição real de cada aluno muda conforme o histórico e o nível dele.</li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function NovaEtapa({
  trilhaId,
  disciplinas,
  secoes,
  ordem,
  onCriada,
}: {
  trilhaId: number;
  disciplinas: string[];
  secoes: SecaoRow[];
  ordem: number;
  onCriada: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [secaoId, setSecaoId] = useState<number | ''>('');
  const [erro, setErro] = useState<string | null>(null);

  async function criar() {
    const nome = titulo.trim() || disciplina;
    if (!nome) {
      setErro('Dê um título ou escolha a disciplina.');
      return;
    }
    setErro(null);
    try {
      await createModulo(trilhaId, {
        titulo: nome,
        ordem,
        tipo: 'inteligente',
        disciplina: disciplina || null,
        assuntos: [],
        secao_id: secaoId || (secoes.length ? secoes[secoes.length - 1].id : null),
        licoes: 4,
      });
      setTitulo('');
      setDisciplina('');
      onCriada();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar unidade.');
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-3">
      <div className="text-xs font-bold text-gray-500">NOVA UNIDADE</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && criar()}
          placeholder="Título (ex.: Crase e regência)"
          className="min-w-[160px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {secoes.length > 0 && (
          <select
            value={secaoId || secoes[secoes.length - 1].id}
            onChange={(e) => setSecaoId(Number(e.target.value))}
            className="w-44 rounded-lg border border-gray-300 px-2 py-2 text-sm"
            title="Seção"
          >
            {secoes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.titulo}
              </option>
            ))}
          </select>
        )}
        <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className="w-48 rounded-lg border border-gray-300 px-2 py-2 text-sm">
          <option value="">Disciplina…</option>
          {disciplinas.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button onClick={criar} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          Adicionar
        </button>
      </div>
      <p className="mt-1.5 text-xs text-gray-400">Depois de criar, escolha os assuntos e quantas lições a unidade tem.</p>
      {erro && <div className="mt-1 text-xs font-semibold text-red-600">{erro}</div>}
    </div>
  );
}

function QuestoesFixas({
  trilhaId,
  etapas,
  regras,
  disciplinas,
  permitirNaoRevisadas,
  onMudou,
}: {
  trilhaId: number;
  etapas: ModuloRow[];
  regras: RegraQuestao[];
  disciplinas: string[];
  permitirNaoRevisadas: boolean;
  onMudou: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [resultados, setResultados] = useState<QuestaoRow[] | null>(null);
  const [etapaEscolhida, setEtapaEscolhida] = useState<number | ''>(etapas[0]?.id ?? '');
  const busca = useDebouncedValue(`${texto}§${disciplina}`, 400);

  useEffect(() => {
    const [t, d] = busca.split('§');
    if (!t.trim() && !d) {
      setResultados(null);
      return;
    }
    searchQuestoes({ texto: t.trim() || undefined, disciplina: d || undefined, situacao: 'regulares' }, 0)
      .then((r) => setResultados(r.rows))
      .catch(() => setResultados([]));
  }, [busca]);

  const regraPorId = new Map(regras.map((r) => [r.questao_id, r]));
  const obrigatorias = regras.filter((r) => r.regra === 'obrigatoria');
  const excluidas = regras.filter((r) => r.regra === 'excluida');
  const nomeEtapa = (id: number | null) => etapas.find((e) => e.id === id)?.titulo ?? '—';

  async function aplicar(q: QuestaoRow, regra: 'obrigatoria' | 'excluida') {
    if (regra === 'obrigatoria' && !etapaEscolhida) return;
    await salvarRegra(trilhaId, q.id, regra, regra === 'obrigatoria' ? Number(etapaEscolhida) : null);
    onMudou();
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <ListaRegras
          titulo={`★ Obrigatórias (${obrigatorias.length})`}
          vazio="Nenhuma. O algoritmo escolhe tudo sozinho dentro dos filtros."
          regras={obrigatorias}
          detalhe={(r) => `Unidade: ${nomeEtapa(r.modulo_id)}`}
          onRemover={async (r) => {
            await removerRegra(trilhaId, r.questao_id);
            onMudou();
          }}
        />
        <ListaRegras
          titulo={`⛔ Excluídas (${excluidas.length})`}
          vazio="Nenhuma questão excluída."
          regras={excluidas}
          onRemover={async (r) => {
            await removerRegra(trilhaId, r.questao_id);
            onMudou();
          }}
        />
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="text-xs font-bold text-gray-500">BUSCAR QUESTÕES NO BANCO</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Trecho do enunciado"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className="w-56 rounded-lg border border-gray-300 px-2 py-2 text-sm">
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={etapaEscolhida}
            onChange={(e) => setEtapaEscolhida(e.target.value ? Number(e.target.value) : '')}
            className="w-56 rounded-lg border border-gray-300 px-2 py-2 text-sm"
            title="Unidade em que a questão obrigatória aparece"
          >
            <option value="">Obrigatória em qual unidade?</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.titulo}
              </option>
            ))}
          </select>
        </div>
        {resultados && (
          <div className="mt-3 max-h-[420px] divide-y divide-gray-200 overflow-y-auto rounded-lg border border-gray-200 bg-white">
            {resultados.length === 0 && <div className="p-3 text-center text-xs text-gray-400">Nada encontrado.</div>}
            {resultados.map((q) => {
              const atual = regraPorId.get(q.id);
              return (
                <div key={q.id} className="flex items-center gap-3 p-2.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-gray-800">{q.enunciado}</div>
                    <div className="text-gray-500">
                      {q.banca} · {q.ano} · {q.disciplina}
                      {q.assunto ? ` · ${q.assunto}` : ''}
                      {!q.revisado && <span className="ml-1 font-bold text-amber-600">· não revisada</span>}
                    </div>
                  </div>
                  {atual ? (
                    <span className="flex-none rounded-full bg-gray-100 px-2 py-0.5 font-bold text-gray-600">
                      {atual.regra === 'obrigatoria' ? '★ obrigatória' : '⛔ excluída'}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => aplicar(q, 'obrigatoria')}
                        disabled={(!q.revisado && !permitirNaoRevisadas) || !etapaEscolhida}
                        title={
                          !q.revisado && !permitirNaoRevisadas
                            ? 'Revise o comentário antes de tornar obrigatória (ou ligue "usar não revisadas" nos filtros)'
                            : !etapaEscolhida
                              ? 'Escolha a unidade acima'
                              : ''
                        }
                        className="flex-none rounded-lg bg-violet-600 px-2.5 py-1 font-bold text-white hover:bg-violet-700 disabled:bg-gray-300"
                      >
                        Obrigatória
                      </button>
                      <button onClick={() => aplicar(q, 'excluida')} className="flex-none rounded-lg border border-red-300 px-2.5 py-1 font-bold text-red-600 hover:bg-red-50">
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ListaRegras({
  titulo,
  vazio,
  regras,
  detalhe,
  onRemover,
}: {
  titulo: string;
  vazio: string;
  regras: RegraQuestao[];
  detalhe?: (r: RegraQuestao) => string;
  onRemover: (r: RegraQuestao) => void;
}) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-700">{titulo}</div>
      <div className="mt-2 max-h-[260px] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
        {regras.length === 0 && <div className="p-3 text-xs text-gray-400">{vazio}</div>}
        {regras.map((r) => (
          <div key={r.questao_id} className="flex items-center gap-2 p-2 text-xs">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-gray-800">{r.questao?.enunciado ?? r.questao_id}</div>
              <div className="text-gray-500">
                {r.questao ? `${r.questao.banca ?? ''} · ${r.questao.ano ?? ''} · ${r.questao.disciplina ?? ''}` : ''}
                {detalhe ? ` · ${detalhe(r)}` : ''}
              </div>
            </div>
            <button onClick={() => onRemover(r)} className="flex-none font-bold text-red-600 hover:underline">
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
