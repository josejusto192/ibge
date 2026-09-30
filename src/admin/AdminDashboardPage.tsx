import { ArrowRight, ArrowUpRight, CheckCircle, ListChecks, Plus, Stack, Users, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats, fetchDashboardTrilhas, type DashboardStats, type DashboardTrilha } from '../lib/adminQueries';
import { ErrorState, LoadingCards } from '../components/Feedback';
import AdminLayout from './AdminLayout';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trilhas, setTrilhas] = useState<DashboardTrilha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([fetchDashboardStats(), fetchDashboardTrilhas()])
      .then(([s, t]) => {
        if (!cancelled) {
          setStats(s);
          setTrilhas(t);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Verifique a conexão e tente novamente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);
  const pending = Math.max(0, (stats?.total_questoes ?? 0) - (stats?.questoes_revisadas ?? 0));
  const reviewedPct = stats?.total_questoes ? Math.round((stats.questoes_revisadas / stats.total_questoes) * 100) : 0;
  return (
    <AdminLayout>
      <div className="admin-intro">
        <div>
          <span className="eyebrow">TUDO PRONTO PARA EVOLUIR</span>
          <h1>Uma visão de todo o Foco.</h1>
          <p>Acompanhe o conteúdo, encontre prioridades e cuide da experiência dos alunos.</p>
        </div>
        <Link to="/admin/trilhas" className="button button-primary">
          <Plus size={18} />
          Gerenciar trilhas
        </Link>
      </div>
      {loading ? (
        <LoadingCards />
      ) : error ? (
        <ErrorState message={error} retry={() => setTick((t) => t + 1)} />
      ) : (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <div className="admin-stat-top">
                Questões no banco
                <Stack size={20} className="text-blue" />
              </div>
              <strong>{stats?.total_questoes.toLocaleString('pt-BR') ?? '—'}</strong>
              <small>Conteúdo disponível para curadoria</small>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-top">
                Questões revisadas
                <CheckCircle size={20} className="text-success" />
              </div>
              <strong>{stats?.questoes_revisadas.toLocaleString('pt-BR') ?? '—'}</strong>
              <small>{reviewedPct}% do banco pronto para usar</small>
            </div>
            {stats?.total_alunos != null && (
              <>
                <div className="admin-stat">
                  <div className="admin-stat-top">
                    Alunos cadastrados
                    <Users size={20} className="text-blue" />
                  </div>
                  <strong>{stats.total_alunos.toLocaleString('pt-BR')}</strong>
                  <small>{stats.alunos_ativos_hoje ?? 0} ativos hoje</small>
                </div>
                <div className="admin-stat">
                  <div className="admin-stat-top">
                    Erros nos últimos 7 dias
                    <WarningCircle size={20} className={stats.erros_7d ? 'text-error' : 'text-success'} />
                  </div>
                  <strong>{stats.erros_7d ?? 0}</strong>
                  <small>
                    <Link to="/admin/erros" className="text-blue">
                      Ver saúde do aplicativo →
                    </Link>
                  </small>
                </div>
              </>
            )}
          </div>
          <section className="admin-focus">
            <ListChecks size={36} weight="duotone" />
            <div>
              <span className="hero-kicker">PRÓXIMO PASSO DA CURADORIA</span>
              <h2>
                {pending > 0 ? `${pending.toLocaleString('pt-BR')} questões esperando seu olhar.` : 'Sua revisão está em dia.'}
              </h2>
              <p>
                {pending > 0
                  ? 'Revise os comentários e deixe mais conteúdo pronto para os alunos.'
                  : 'Continue organizando os módulos e construindo boas trilhas.'}
              </p>
            </div>
            <Link to={pending > 0 ? '/admin/questoes?status=nao_revisadas' : '/admin/trilhas'} className="button button-yellow">
              {pending > 0 ? 'Revisar questões' : 'Organizar trilhas'}
              <ArrowRight size={17} />
            </Link>
          </section>
          <div className="section-heading">
            <div>
              <h2>Trilhas em um olhar</h2>
              <p>Publicação, módulos e conteúdo selecionado.</p>
            </div>
            <Link to="/admin/trilhas" className="button button-text">
              Ver todas
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="admin-table-wrap mobile-card-table">
            <table>
              <thead>
                <tr>
                  <th>Trilha</th>
                  <th>Status</th>
                  <th>Módulos</th>
                  <th>Questões</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {trilhas.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Trilha" className="font-bold">
                      {t.nome}
                    </td>
                    <td data-label="Status">
                      <span className={`pill ${t.ativa ? 'green' : 'neutral'}`}>{t.ativa ? 'Publicada' : 'Rascunho'}</span>
                    </td>
                    <td data-label="Módulos">
                      {t.modulos}
                      {t.modulos_sem_questoes > 0 && (
                        <span className="pill amber ml-2">{t.modulos_sem_questoes} sem questões</span>
                      )}
                    </td>
                    <td data-label="Questões">{t.questoes}</td>
                    <td>
                      <Link to={`/admin/trilhas/${t.id}`} className="text-blue font-bold">
                        Gerenciar →
                      </Link>
                    </td>
                  </tr>
                ))}
                {!trilhas.length && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <Stack size={28} />
                        <h3>Sua primeira trilha começa aqui</h3>
                        <p>Organize o conteúdo em módulos e publique quando estiver pronta.</p>
                        <Link to="/admin/trilhas" className="button button-primary mt-4">
                          Criar uma trilha
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
