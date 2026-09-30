import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchTrilhas, type TrilhaRow } from '../lib/queries';
import { CONFIG_PADRAO, createTrilha, fetchDashboardTrilhas, saveTrilhaConfig, type DashboardTrilha } from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

export default function AdminTrilhasPage() {
  const [trilhas, setTrilhas] = useState<TrilhaRow[] | null>(null);
  const [contagens, setContagens] = useState<Map<number, DashboardTrilha>>(new Map());
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'manual' | 'inteligente'>('manual');
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetchTrilhas().then(setTrilhas);
    fetchDashboardTrilhas().then((rows) => setContagens(new Map(rows.map((r) => [r.id, r]))));
  }

  useEffect(refresh, []);

  async function handleCreate() {
    if (!nome.trim() || !slug.trim()) {
      setError('Nome e slug são obrigatórios.');
      return;
    }
    setError(null);
    try {
      const nova = await createTrilha({ nome: nome.trim(), slug: slug.trim(), descricao: descricao.trim(), ativa: false, ordem: trilhas?.length ?? 0, tipo });
      if (tipo === 'inteligente') {
        await saveTrilhaConfig(CONFIG_PADRAO(nova.id));
        navigate(`/admin/trilhas/${nova.id}`);
        return;
      }
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
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(
              [
                ['manual', 'Manual', 'Você monta cada módulo escolhendo as questões a dedo.'],
                ['inteligente', '✨ Inteligente', 'Você define concurso, filtros, etapas e regras; o algoritmo monta as sessões de cada aluno.'],
              ] as const
            ).map(([valor, titulo, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setTipo(valor)}
                className={`rounded-lg border-2 p-3 text-left ${tipo === valor ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="text-sm font-extrabold text-gray-900">{titulo}</div>
                <div className="mt-0.5 text-xs text-gray-500">{texto}</div>
              </button>
            ))}
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
              <th className="px-4 py-3">Módulos</th>
              <th className="px-4 py-3">Questões</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(trilhas ?? []).map((t) => {
              const c = contagens.get(t.id);
              return (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {t.nome}
                    {t.tipo === 'inteligente' && (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">✨ Inteligente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {t.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c?.modulos ?? '—'}
                    {(c?.modulos_sem_questoes ?? 0) > 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        ⚠ {c!.modulos_sem_questoes} sem questões
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c?.questoes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/trilhas/${t.id}`} className="font-bold text-blue-600 hover:underline">
                      Editar ›
                    </Link>
                  </td>
                </tr>
              );
            })}
            {trilhas?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
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
