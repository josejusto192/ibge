import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuestaoRow } from '../lib/database.types';
import {
  searchQuestoes,
  fetchFiltrosQuestoes,
  fetchNomesUsuarios,
  reviewWithAI,
  type QuestaoSearchFilters,
  type FiltrosQuestoes,
} from '../lib/adminQueries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import AdminLayout from './AdminLayout';

const FILTROS_VAZIOS: FiltrosQuestoes = { bancas: [], disciplinas: [], cargos: [], niveis: [], orgaos: [] };

interface BatchState {
  running: boolean;
  done: number;
  total: number;
  falhas: string[];
}

function formatData(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
}

export default function AdminQuestoesBancoPage() {
  const [filters, setFilters] = useState<QuestaoSearchFilters>({ apenas: 'todas' });
  const [texto, setTexto] = useState('');
  const [assunto, setAssunto] = useState('');
  const textoDeb = useDebouncedValue(texto);
  const assuntoDeb = useDebouncedValue(assunto);
  const [opcoes, setOpcoes] = useState<FiltrosQuestoes>(FILTROS_VAZIOS);
  const [results, setResults] = useState<QuestaoRow[]>([]);
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState<BatchState | null>(null);
  const cancelRef = useRef(false);

  const effectiveFilters = useMemo(
    () => ({ ...filters, texto: textoDeb.trim() || undefined, assunto: assuntoDeb.trim() || undefined }),
    [filters, textoDeb, assuntoDeb]
  );

  useEffect(() => {
    fetchFiltrosQuestoes().then(setOpcoes);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [effectiveFilters]);

  function refresh() {
    searchQuestoes(effectiveFilters, page).then((r) => {
      setResults(r.rows);
      setTotal(r.total);
      const ids = r.rows.map((q) => q.revisado_por).filter((id): id is string => !!id);
      fetchNomesUsuarios(ids).then(setNomes);
    });
  }

  useEffect(refresh, [effectiveFilters, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function setFiltro<K extends keyof QuestaoSearchFilters>(key: K, value: QuestaoSearchFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  function toggleSelecionada(id: string) {
    setSelecionadas((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selecionarPagina() {
    const naoRevisadas = results.filter((q) => !q.revisado).map((q) => q.id);
    setSelecionadas((s) => {
      const todasJa = naoRevisadas.every((id) => s.has(id));
      const next = new Set(s);
      for (const id of naoRevisadas) {
        if (todasJa) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function revisarSelecionadasComIA() {
    const ids = [...selecionadas];
    if (!ids.length || batch?.running) return;
    cancelRef.current = false;
    setBatch({ running: true, done: 0, total: ids.length, falhas: [] });
    const falhas: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      if (cancelRef.current) break;
      try {
        await reviewWithAI(ids[i]);
      } catch (err) {
        falhas.push(err instanceof Error ? err.message : 'erro');
      }
      setBatch({ running: true, done: i + 1, total: ids.length, falhas });
    }
    setBatch((b) => (b ? { ...b, running: false } : null));
    setSelecionadas(new Set());
    refresh();
  }

  const temFiltroAtivo =
    texto || assunto || filters.disciplina || filters.banca || filters.cargo || filters.nivel_escolaridade || filters.orgao;

  return (
    <AdminLayout>
      <h1 className="text-xl font-extrabold text-gray-900">Banco de questões</h1>
      <p className="mt-1 text-sm text-gray-500">
        Referência para montar trilhas — o aluno nunca vê esta lista, só as questões escolhidas a dedo para um módulo.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          placeholder="Buscar no enunciado..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          placeholder="Assunto"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <select value={filters.disciplina ?? ''} onChange={(e) => setFiltro('disciplina', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
          <option value="">Todas disciplinas</option>
          {opcoes.disciplinas.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={filters.banca ?? ''} onChange={(e) => setFiltro('banca', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
          <option value="">Todas bancas</option>
          {opcoes.bancas.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={filters.cargo ?? ''} onChange={(e) => setFiltro('cargo', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
          <option value="">Todos cargos</option>
          {opcoes.cargos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.nivel_escolaridade ?? ''}
          onChange={(e) => setFiltro('nivel_escolaridade', e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">Toda escolaridade</option>
          {opcoes.niveis.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select value={filters.orgao ?? ''} onChange={(e) => setFiltro('orgao', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
          <option value="">Todos órgãos</option>
          {opcoes.orgaos.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={filters.apenas ?? 'todas'}
          onChange={(e) => setFiltro('apenas', e.target.value as QuestaoSearchFilters['apenas'])}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="todas">Revisadas e não revisadas</option>
          <option value="revisadas">Só revisadas</option>
          <option value="nao_revisadas">Só não revisadas</option>
        </select>
        {temFiltroAtivo && (
          <button
            onClick={() => {
              setTexto('');
              setAssunto('');
              setFilters({ apenas: 'todas' });
            }}
            className="rounded-lg px-2 py-1.5 text-sm font-bold text-gray-500 hover:text-gray-800"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={selecionarPagina} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50">
          Selecionar não revisadas da página
        </button>
        {selecionadas.size > 0 && !batch?.running && (
          <button
            onClick={revisarSelecionadasComIA}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            ✨ Revisar com IA ({selecionadas.size})
          </button>
        )}
        {batch && (
          <span className="flex items-center gap-2 text-xs font-bold text-gray-600">
            {batch.running ? (
              <>
                Revisando {batch.done}/{batch.total}…
                <button onClick={() => (cancelRef.current = true)} className="font-bold text-red-600 hover:underline">
                  Cancelar
                </button>
              </>
            ) : (
              <span className={batch.falhas.length ? 'text-amber-600' : 'text-green-600'}>
                Concluído: {batch.done - batch.falhas.length}/{batch.total} revisadas
                {batch.falhas.length > 0 && ` · ${batch.falhas.length} falharam (${batch.falhas[0]})`}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {results.map((q) => (
          <div key={q.id} className="flex items-start gap-3 border-t border-gray-100 p-3 first:border-t-0">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 flex-none"
              disabled={q.revisado || batch?.running}
              checked={selecionadas.has(q.id)}
              onChange={() => toggleSelecionada(q.id)}
              title={q.revisado ? 'Já revisada' : 'Selecionar pra revisão com IA em lote'}
            />
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold text-gray-800">{q.enunciado}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>
                  {q.banca} · {q.ano} · {q.disciplina}
                  {q.cargo ? ` · ${q.cargo}` : ''}
                  {q.nivel_escolaridade ? ` · ${q.nivel_escolaridade}` : ''}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${q.revisado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {q.revisado
                    ? `Revisada${q.revisado_metodo ? ` · ${q.revisado_metodo}` : ''}${q.revisado_por && nomes.get(q.revisado_por) ? ` · ${nomes.get(q.revisado_por)}` : ''}${q.revisado_em ? ` · ${formatData(q.revisado_em)}` : ''}`
                    : 'Não revisada'}
                </span>
              </div>
            </div>
            <Link to={`/admin/questoes/${q.id}`} className="flex-none text-xs font-bold text-blue-600 hover:underline">
              Revisar ›
            </Link>
          </div>
        ))}
        {results.length === 0 && <div className="p-4 text-center text-sm text-gray-400">Nenhuma questão encontrada.</div>}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{total} questões encontradas</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="font-bold disabled:opacity-30">
            ‹ Anterior
          </button>
          <button disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)} className="font-bold disabled:opacity-30">
            Próxima ›
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
