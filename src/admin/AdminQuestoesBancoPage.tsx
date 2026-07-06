import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuestaoRow } from '../lib/database.types';
import { searchQuestoes, fetchFiltrosQuestoes, type QuestaoSearchFilters, type FiltrosQuestoes } from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

const FILTROS_VAZIOS: FiltrosQuestoes = { bancas: [], disciplinas: [], cargos: [], niveis: [], orgaos: [] };

export default function AdminQuestoesBancoPage() {
  const [filters, setFilters] = useState<QuestaoSearchFilters>({ apenas: 'todas' });
  const [opcoes, setOpcoes] = useState<FiltrosQuestoes>(FILTROS_VAZIOS);
  const [results, setResults] = useState<QuestaoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchFiltrosQuestoes().then(setOpcoes);
  }, []);

  useEffect(() => {
    searchQuestoes(filters, page).then((r) => {
      setResults(r.rows);
      setTotal(r.total);
    });
  }, [filters, page]);

  function setFiltro<K extends keyof QuestaoSearchFilters>(key: K, value: QuestaoSearchFilters[K]) {
    setPage(0);
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  const temFiltroAtivo =
    filters.texto || filters.disciplina || filters.banca || filters.cargo || filters.nivel_escolaridade || filters.orgao || filters.assunto;

  return (
    <AdminLayout>
      <h1 className="text-xl font-extrabold text-gray-900">Banco de questões</h1>
      <p className="mt-1 text-sm text-gray-500">
        Referência para montar trilhas — o aluno nunca vê esta lista, só as questões escolhidas a dedo para um módulo.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          placeholder="Buscar no enunciado..."
          value={filters.texto ?? ''}
          onChange={(e) => setFiltro('texto', e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          placeholder="Assunto"
          value={filters.assunto ?? ''}
          onChange={(e) => setFiltro('assunto', e.target.value)}
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
              setPage(0);
              setFilters({ apenas: 'todas' });
            }}
            className="rounded-lg px-2 py-1.5 text-sm font-bold text-gray-500 hover:text-gray-800"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {results.map((q) => (
          <div key={q.id} className="flex items-start gap-3 border-t border-gray-100 p-3 first:border-t-0">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold text-gray-800">{q.enunciado}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>
                  {q.banca} · {q.ano} · {q.disciplina}
                  {q.cargo ? ` · ${q.cargo}` : ''}
                  {q.nivel_escolaridade ? ` · ${q.nivel_escolaridade}` : ''}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${q.revisado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {q.revisado ? 'Revisada' : 'Não revisada'}
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
