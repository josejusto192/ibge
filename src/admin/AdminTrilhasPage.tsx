import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTrilhas, type TrilhaRow } from '../lib/queries';
import { createTrilha } from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

export default function AdminTrilhasPage() {
  const [trilhas, setTrilhas] = useState<TrilhaRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetchTrilhas().then(setTrilhas);
  }

  useEffect(refresh, []);

  async function handleCreate() {
    if (!nome.trim() || !slug.trim()) {
      setError('Nome e slug são obrigatórios.');
      return;
    }
    setError(null);
    try {
      await createTrilha({ nome: nome.trim(), slug: slug.trim(), descricao: descricao.trim(), ativa: false, ordem: trilhas?.length ?? 0 });
      setNome('');
      setSlug('');
      setDescricao('');
      setCreating(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar trilha.');
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">Trilhas</h1>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          {creating ? 'Cancelar' : 'Nova trilha'}
        </button>
      </div>

      {creating && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500">NOME</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">SLUG</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold text-gray-500">DESCRIÇÃO</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <div className="mt-2 text-sm font-semibold text-red-600">{error}</div>}
          <button onClick={handleCreate} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Criar trilha
          </button>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(trilhas ?? []).map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-semibold text-gray-900">{t.nome}</td>
                <td className="px-4 py-3 text-gray-500">{t.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {t.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/admin/trilhas/${t.id}`} className="font-bold text-blue-600 hover:underline">
                    Editar ›
                  </Link>
                </td>
              </tr>
            ))}
            {trilhas?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Nenhuma trilha ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
