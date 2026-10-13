import { ChartBar, Fire, Lightning, Notebook, Target } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { fetchMeuDominio, fetchStats, type DominioAssunto, type StatsData } from '../lib/queries';
import { levelFromXp } from '../lib/format';
import { ErrorState, LoadingCards } from '../components/Feedback';

export default function Stats() {
  const { usuario, dailyDone, ofensiva } = useAppData();
  const usuarioId = usuario?.id;
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  // domínio por assunto calculado pelo algoritmo (migration 028)
  const [dominio, setDominio] = useState<DominioAssunto[] | null>(null);
  useEffect(() => {
    if (!usuarioId) return;
    fetchMeuDominio()
      .then(setDominio)
      .catch(() => setDominio([]));
  }, [usuarioId, tick]);
  const assuntos = (dominio ?? []).filter((d) => d.assunto !== '' && d.respostas >= 3);
  const listaDominio = (assuntos.length ? assuntos : (dominio ?? []).filter((d) => d.respostas >= 3))
    .sort((a, b) => a.dominio - b.dominio)
    .slice(0, 6);
  useEffect(() => {
    if (!usuarioId) return;
    let alive = true;
    setError('');
    setStats(null);
    fetchStats(usuarioId)
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(() => {
        if (alive) setError('Não conseguimos buscar seu desempenho. Tente novamente.');
      });
    return () => {
      alive = false;
    };
  }, [usuarioId, tick]);
  const dailyGoal = Math.max(1, usuario?.meta_diaria ?? 20);
  const weekMax = Math.max(1, ...(stats?.ultimos7Dias ?? []));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });
  const weakest = stats?.porDisciplina.length ? [...stats.porDisciplina].sort((a, b) => a.pct - b.pct)[0] : null;
  return (
    <div className="workspace-scroll">
      <div className="workspace-content">
        <header className="page-heading">
          <div>
            <span className="eyebrow">SEU ESFORÇO APARECE AQUI</span>
            <h1>Cada dia, um pouco melhor.</h1>
            <p>Acompanhe seu ritmo e descubra onde vale reforçar.</p>
          </div>
          <ChartBar size={32} weight="duotone" className="text-blue" />
        </header>
        {error ? (
          <ErrorState message={error} retry={() => setTick((t) => t + 1)} />
        ) : !stats ? (
          <LoadingCards />
        ) : (
          <>
            <div className="metrics-row">
              <div className="metric">
                <span className="metric-icon yellow">
                  <Fire size={23} />
                </span>
                <div>
                  <strong>{ofensiva}</strong>
                  <small>dias de constância</small>
                </div>
              </div>
              <div className="metric">
                <span className="metric-icon">
                  <Lightning size={23} />
                </span>
                <div>
                  <strong>{levelFromXp(usuario?.xp ?? 0)}</strong>
                  <small>nível · {usuario?.xp ?? 0} XP</small>
                </div>
              </div>
              <div className="metric">
                <span className="metric-icon green">
                  <Target size={23} />
                </span>
                <div>
                  <strong>{stats.taxaAcerto}%</strong>
                  <small>de acerto geral</small>
                </div>
              </div>
            </div>
            <div className="stats-grid">
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Seu ritmo de estudo</h2>
                    <p>Questões respondidas nos últimos 7 dias</p>
                  </div>
                  <span className="pill">{stats.ultimos7Dias.reduce((a, b) => a + b, 0)} questões</span>
                </div>
                <div
                  className="chart"
                  role="img"
                  aria-label={stats.ultimos7Dias
                    .map((n, i) => `${days[i].toLocaleDateString('pt-BR')}: ${n} questões`)
                    .join('; ')}
                >
                  {stats.ultimos7Dias.map((n, i) => (
                    <div className="chart-col" key={i}>
                      <strong>{n}</strong>
                      <div className="chart-bar" style={{ height: `${(n / weekMax) * 135}px` }} />
                      <span>{i === 6 ? 'Hoje' : days[i].toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Meta de hoje</h2>
                  <Target size={21} className="text-blue" />
                </div>
                <div
                  className="goal-ring"
                  style={{ background: `conic-gradient(#1557e6 ${Math.min(1, dailyDone / dailyGoal) * 360}deg, #eef3ff 0)` }}
                >
                  <div>
                    <strong>
                      {dailyDone}/{dailyGoal}
                    </strong>
                    <small>questões</small>
                  </div>
                </div>
                <p className="goal-copy">
                  {dailyDone >= dailyGoal
                    ? 'Meta concluída. Você cumpriu seu compromisso de hoje!'
                    : `Faltam ${dailyGoal - dailyDone} questões para alcançar sua meta.`}
                </p>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Por disciplina</h2>
                  <span className="pill neutral">Taxa de acerto</span>
                </div>
                {!stats.porDisciplina.length ? (
                  <p className="empty-state">Responda suas primeiras questões para acompanhar o desempenho por disciplina.</p>
                ) : (
                  stats.porDisciplina.map((d) => (
                    <div key={d.disciplina} className="discipline-item">
                      <div>
                        <span>{d.disciplina}</span>
                        <strong>{d.pct}%</strong>
                      </div>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${d.pct}%`,
                            background: d.pct >= 75 ? '#22a06b' : d.pct >= 50 ? '#1557e6' : '#e4ad18',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </section>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Seu domínio por assunto</h2>
                    <p>Chance de acertar uma questão média · os mais fracos primeiro</p>
                  </div>
                </div>
                {!listaDominio.length ? (
                  <p className="empty-state">Responda pelo menos 3 questões de um assunto para o Foco calcular seu domínio.</p>
                ) : (
                  listaDominio.map((d) => (
                    <div key={`${d.disciplina}|${d.assunto}`} className="discipline-item">
                      <div>
                        <span>
                          {d.assunto || d.disciplina}
                          {d.assunto && <small className="ml-1.5 font-semibold text-text3">{d.disciplina}</small>}
                        </span>
                        <strong>{d.dominio}%</strong>
                      </div>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${d.dominio}%`,
                            background: d.dominio >= 75 ? '#22a06b' : d.dominio >= 50 ? '#8b5cf6' : '#e4ad18',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </section>
              <section className="panel review-panel">
                <Notebook size={28} weight="duotone" />
                <h2>{weakest ? 'Dê atenção ao que precisa.' : 'Transforme dúvidas em aprendizado.'}</h2>
                <p>
                  {weakest ? (
                    <>
                      Seu menor aproveitamento está em <strong>{weakest.disciplina}</strong>, com {weakest.pct}% de acerto.
                      Revisar é parte da evolução.
                    </>
                  ) : (
                    'Seu caderno reúne as questões que merecem uma nova tentativa.'
                  )}
                </p>
                <Link className="button button-text" to="/caderno-de-erros">
                  Abrir caderno de erros →
                </Link>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
