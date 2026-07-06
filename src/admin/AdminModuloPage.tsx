import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { QuestaoRow } from '../lib/database.types';
import {
  fetchModulo,
  fetchModuloQuestoesAdmin,
  addQuestaoToModulo,
  removeQuestaoFromModulo,
  reorderModuloQuestoes,
  searchQuestoes,
  fetchFiltrosQuestoes,
  type QuestaoSearchFilters,
  type FiltrosQuestoes,
} from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

const FILTROS_VAZIOS: FiltrosQuestoes = { bancas: [], disciplinas: [], cargos: [], niveis: [], orgaos: [] };

export default function AdminModuloPage() {
  const { moduloId } = useParams();
  const id = Number(moduloId);

  const [titulo, setTitulo] = useState('');
  const [trilhaId, setTrilhaId] = useState<number | null>(null);
  const [assigned, setAssigned] = useState<{ ordem: number; questao: QuestaoRow }[] | null>(null);
  const [filters, setFilters] = useState<QuestaoSearchFilters>({ apenas: 'todas' });
  const [opcoes, setOpcoes] = useState<FiltrosQuestoes>(FILTROS_VAZIOS);
  const [results, setResults] = useState<QuestaoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [addError, setAddError] = useState<string | null>(null);

  function refreshAssigned() {
    fetchModuloQuestoesAdmin(id).then(setAssigned);
  }

  useEffect(() => {
    fetchModulo(id).then((m) => {
      setTitulo(m.titulo);
      setTrilhaId(m.trilha_id);
    });
    refreshAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetchFiltrosQuestoes().then(setOpcoes);
  }, []);

  useEffect(() => {
    searchQuestoes(filters, page).then((r) => {
      setResults(r.rows);
      setTotal(r.total);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const assignedIds = new Set((assigned ?? []).map((a) => a.questao.id));

  async function handleAdd(q: QuestaoRow) {
    setAddError(null);
    try {
      await addQuestaoToModulo(id, q.id, assigned?.length ?? 0);
      refreshAssigned();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erro ao adicionar questão.');
    }
  }

  async function handleRemove(questaoId: string) {
    await removeQuestaoFromModulo(id, questaoId);
    refreshAssigned();
  }

  async function move(index: number, dir: -1 | 1) {
    if (!assigned) return;
    const ids = assigned.map((a) => a.questao.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await reorderModuloQuestoes(id, ids);
    refreshAssigned();
  }

  return (
    <AdminLayout>
      <Link to={`/admin/trilhas/${trilhaId}`} className="text-sm font-bold text-gray-500 hover:text-gray-800">
        ‹ Voltar para a trilha
      </Link>
      <h1 className="mt-2 text-xl font-extrabold text-gray-900">Módulo: {titulo}</h1>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">Questões no módulo ({assigned?.length ?? 0})</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {(assigned ?? []).map((a, i) => (
              <div key={a.questao.id} className="flex items-start gap-2 border-t border-gray-100 p-3 first:border-t-0">
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button disabled={i === 0} onClick={() => move(i, -1)} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">
                    ▲
                  </button>
                  <button
                    disabled={i === (assigned?.length ?? 0) - 1}
                    onClick={() => move(i, 1)}
                    className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold text-gray-800">{a.questao.enunciado}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {a.questao.banca} · {a.questao.ano} · {a.questao.disciplina}
                  </div>
                </div>
                <button onClick={() => handleRemove(a.questao.id)} className="flex-none text-xs font-bold text-red-600 hover:underline">
                  Remover
                </button>
              </div>
            ))}
            {assigned?.length === 0 && <div className="p-4 text-center text-sm text-gray-400">Nenhuma questão neste módulo ainda.</div>}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">Buscar no banco de questões</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              placeholder="Buscar no enunciado..."
              onChange={(e) => {
                setPage(0);
                setFilters((f) => ({ ...f, texto: e.target.value || undefined }));
              }}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
            <select
              onChange={(e) => {
                setPage(0);
                setFilters((f) => ({ ...f, disciplina: e.target.value || undefined }));
              }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Todas disciplinas</option>
              {opcoes.disciplinas.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              onChange={(e) => {
                setPage(0);
                setFilters((f) => ({ ...f, banca: e.target.value || undefined }));
              }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Todas bancas</option>
              {opcoes.bancas.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              onChange={(e) => {
                setPage(0);
                setFilters((f) => ({ ...f, apenas: e.target.value as QuestaoSearchFilters['apenas'] }));
              }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="todas">Revisadas e não revisadas</option>
              <option value="revisadas">Só revisadas</option>
              <option value="nao_revisadas">Só não revisadas</option>
            </select>
          </div>

          {addError && <div className="mt-2 text-sm font-semibold text-red-600">{addError}</div>}

          <div className="mt-2 max-h-[560px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
            {results.map((q) => {
              const already = assignedIds.has(q.id);
              return (
                <div key={q.id} className="flex items-start gap-2 border-t border-gray-100 p-3 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold text-gray-800">{q.enunciado}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      <span>
                        {q.banca} · {q.ano} · {q.disciplina}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 font-bold ${q.revisado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {q.revisado ? 'Revisada' : 'Não revisada'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1">
                    <Link to={`/admin/questoes/${q.id}?modulo=${id}`} className="text-xs font-bold text-blue-600 hover:underline">
                      Revisar
                    </Link>
                    <button
                      disabled={already || !q.revisado}
                      onClick={() => handleAdd(q)}
                      className="text-xs font-bold text-blue-600 hover:underline disabled:cursor-default disabled:text-gray-300 disabled:no-underline"
                    >
                      {already ? 'Já no módulo' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              );
            })}
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
        </div>
      </div>
    </AdminLayout>
  );
}
