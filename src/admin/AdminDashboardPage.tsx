import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats, fetchDashboardTrilhas, type DashboardStats, type DashboardTrilha } from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

function StatCard({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${warn ? 'border-amber-300' : 'border-gray-200'}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-1 font-display text-2xl font-extrabold ${warn ? 'text-amber-600' : 'text-gray-900'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs font-semibold text-gray-400">{sub}</div>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trilhas, setTrilhas] = useState<DashboardTrilha[] | null>(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
    fetchDashboardTrilhas().then(setTrilhas);
  }, []);

  const pendentes = stats ? stats.total_questoes - stats.questoes_revisadas : 0;
  const pctRevisado = stats && stats.total_questoes > 0 ? Math.round((stats.questoes_revisadas / stats.total_questoes) * 100) : 0;
  const isFullAdmin = stats?.total_alunos != null;

  return (
    <AdminLayout>
      <h1 className="text-xl font-extrabold text-gray-900">Visão geral</h1>
      <p className="mt-1 text-sm text-gray-500">O estado da curadoria e do app, num lugar só.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Questões no banco" value={stats?.total_questoes ?? '—'} />
        <StatCard
          label="Revisadas"
          value={stats ? `${stats.questoes_revisadas} (${pctRevisado}%)` : '—'}
          sub={stats ? `${pendentes} pendentes de revisão` : undefined}
          warn={!!stats && pendentes > 0}
        />
        {isFullAdmin && (
          <>
            <StatCard label="Alunos" value={stats?.total_alunos ?? '—'} sub={`${stats?.alunos_ativos_hoje ?? 0} ativos hoje`} />
            <StatCard
              label="Erros do app (7 dias)"
              value={stats?.erros_7d ?? '—'}
              sub={`Tutor IA hoje: ${stats?.tutor_usos_hoje ?? 0} perguntas`}
              warn={(stats?.erros_7d ?? 0) > 0}
            />
          </>
        )}
      </div>

      {pendentes > 0 && (
        <Link
          to="/admin/questoes"
          className="mt-4 block rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700 hover:bg-blue-100"
        >
          {pendentes} questões aguardando revisão — ir para o banco de questões ›
        </Link>
      )}

      <h2 className="mt-8 text-sm font-extrabold uppercase tracking-wide text-gray-500">Trilhas</h2>
      <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Trilha</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Módulos</th>
              <th className="px-4 py-3">Questões curadas</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(trilhas ?? []).map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-semibold text-gray-900">{t.nome}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {t.modulos}
                  {t.modulos_sem_questoes > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                      ⚠ {t.modulos_sem_questoes} sem questões
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{t.questoes}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/admin/trilhas/${t.id}`} className="font-bold text-blue-600 hover:underline">
                    Abrir ›
                  </Link>
                </td>
              </tr>
            ))}
            {trilhas?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
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
