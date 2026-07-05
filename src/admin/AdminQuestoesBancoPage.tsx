import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuestaoRow } from '../lib/database.types';
import { searchQuestoes, type QuestaoSearchFilters } from '../lib/adminQueries';
import { FILTER_BANCAS } from '../data/mock';
import AdminLayout from './AdminLayout';

export default function AdminQuestoesBancoPage() {
  const [filters, setFilters] = useState<QuestaoSearchFilters>({ apenas: 'todas' });
  const [results, setResults] = useState<QuestaoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    searchQuestoes(filters, page).then((r) => {
      setResults(r.rows);
      setTotal(r.total);
    });
  }, [filters, page]);

  return (
    <AdminLayout>
      <h1 className="text-xl font-extrabold text-gray-900">Banco de questões</h1>
      <p className="mt-1 text-sm text-gray-500">
        Referência para montar trilhas — o aluno nunca vê esta lista, só as questões escolhidas a dedo para um módulo.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          placeholder="Buscar no enunciado..."
          onChange={(e) => {
            setPage(0);
            setFilters((f) => ({ ...f, texto: e.target.value || undefined }));
          }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          placeholder="Disciplina"
          onChange={(e) => {
            setPage(0);
            setFilters((f) => ({ ...f, disciplina: e.target.value || undefined }));
          }}
          className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          onChange={(e) => {
            setPage(0);
            setFilters((f) => ({ ...f, banca: e.target.value || undefined }));
          }}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todas bancas</option>
          {FILTER_BANCAS.map((b) => (
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

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {results.map((q) => (
          <div key={q.id} className="flex items-start gap-3 border-t border-gray-100 p-3 first:border-t-0">
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
