import { ChartBar, Crown, Lightning, Users, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { fetchPublico, type Publico } from '../lib/adminQueries';
import { ErrorState, LoadingCards } from '../components/Feedback';
import AdminLayout from './AdminLayout';

// Quem usa o Foco: respostas do onboarding, meta x estudo real e onde as
// pessoas desistem do cadastro (migration 031).

const PERIODOS: Array<[number, string]> = [
  [7, '7 dias'],
  [30, '30 dias'],
  [90, '90 dias'],
  [0, 'Tudo'],
];

const ROTULOS: Record<string, Record<string, string>> = {
  nivel: { zero: 'Começando do zero', pouco: 'Já estudou um pouco', reta: 'Reta final' },
  prazo: { menos1: 'Menos de 1 mês', '1a3': '1 a 3 meses', '3a6': '3 a 6 meses', naosei: 'Ainda não sabe' },
};

const ETAPAS: Record<string, string> = {
  welcome: 'Boas-vindas',
  contact: 'Nome, e-mail e WhatsApp',
  faixa: 'Faixa etária',
  prestou: 'Já prestou concurso?',
  concurso: 'Escolha do concurso',
  prazo: 'Data da prova',
  nivel: 'Nível de preparo',
  meta: 'Tempo por dia',
  commit: 'Compromisso',
  plan: 'Plano + senha',
  conta_criada: 'Conta criada',
};

const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

export default function AdminPublicoPage() {
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState<Publico | null>(null);
  const [erro, setErro] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let vivo = true;
    setDados(null);
    setErro('');
    fetchPublico(dias)
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setErro('Não foi possível carregar os dados. Rode a migration 031 e tente de novo.'));
    return () => {
      vivo = false;
    };
  }, [dias, tick]);

  const grupo = (campo: string) =>
    (dados?.contagens ?? [])
      .filter((c) => c.campo === campo)
      .map((c) => ({ rotulo: ROTULOS[campo]?.[c.valor] ?? c.valor, total: c.total, vazio: c.valor === 'não informado' }));

  return (
    <AdminLayout>
      <div className="admin-intro">
        <div>
          <span className="eyebrow">QUEM ESTUDA COM O FOCO</span>
          <h1>Público</h1>
          <p>Respostas do cadastro, quanto cada um estuda de verdade e onde as pessoas desistem do onboarding.</p>
        </div>
        <div className="publico-periodo" role="group" aria-label="Período">
          {PERIODOS.map(([d, rotulo]) => (
            <button key={d} className={dias === d ? 'ativo' : ''} onClick={() => setDias(d)} aria-pressed={dias === d}>
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro ? (
        <ErrorState message={erro} retry={() => setTick((t) => t + 1)} />
      ) : !dados ? (
        <LoadingCards />
      ) : (
        <>
          <p className="publico-legenda">
            {dias ? `Alunos que criaram conta nos últimos ${dias} dias` : 'Todos os alunos'} (a equipe não entra na conta).
          </p>
          <div className="admin-stats">
            <Numero icone={<Users size={20} className="text-blue" />} titulo="Novos alunos" valor={dados.total} detalhe="criaram conta no período" />
            <Numero
              icone={<Lightning size={20} className="text-blue" />}
              titulo="Estudaram na semana"
              valor={dados.ativos_7d}
              detalhe={`${pct(dados.ativos_7d, dados.total)}% responderam questões nos últimos 7 dias`}
            />
            <Numero
              icone={<Crown size={20} className="text-blue" />}
              titulo="Assinantes"
              valor={dados.assinantes}
              detalhe={`${pct(dados.assinantes, dados.total)}% dos novos alunos`}
            />
            <Numero
              icone={<ChartBar size={20} className="text-blue" />}
              titulo="Cadastro concluído"
              valor={`${pct(dados.funil.find((f) => f.etapa === 'conta_criada')?.sessoes ?? 0, dados.funil[0]?.sessoes ?? 0)}%`}
              detalhe="de quem abriu o onboarding criou a conta"
            />
          </div>

          <Funil funil={dados.funil} />

          <Origens origens={dados.origens ?? []} />

          <div className="publico-grade">
            <Barras titulo="Faixa etária" itens={grupo('faixa')} />
            <Barras titulo="Concurso (trilha atual)" itens={grupo('trilha')} />
            <Barras titulo="Nível de preparo" itens={grupo('nivel')} />
            <Barras titulo="Quando é a prova" itens={grupo('prazo')} />
            <Barras titulo="Já prestou concurso?" itens={grupo('prestou')} />
            <MetaReal metas={dados.metas} />
          </div>
        </>
      )}
    </AdminLayout>
  );
}

function Numero({ icone, titulo, valor, detalhe }: { icone: React.ReactNode; titulo: string; valor: number | string; detalhe: string }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-top">
        {titulo}
        {icone}
      </div>
      <strong>{typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}</strong>
      <small>{detalhe}</small>
    </div>
  );
}

function Barras({ titulo, itens }: { titulo: string; itens: Array<{ rotulo: string; total: number; vazio?: boolean }> }) {
  const soma = itens.reduce((t, i) => t + i.total, 0);
  const maior = Math.max(1, ...itens.map((i) => i.total));
  return (
    <section className="panel publico-painel">
      <h2>{titulo}</h2>
      {itens.length === 0 ? (
        <p className="publico-vazio">Sem dados no período.</p>
      ) : (
        <ul className="publico-barras">
          {itens.map((i) => (
            <li key={i.rotulo} title={`${i.rotulo}: ${i.total} (${pct(i.total, soma)}%)`} className={i.vazio ? 'vazio' : ''}>
              <span className="publico-rotulo">{i.rotulo}</span>
              <span className="publico-trilho">
                <span style={{ width: `${(i.total / maior) * 100}%` }} />
              </span>
              <span className="publico-valor">
                {i.total} <small>{pct(i.total, soma)}%</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Funil({ funil }: { funil: Publico['funil'] }) {
  const inicio = funil[0]?.sessoes ?? 0;
  // tela em que mais gente parou (queda até a próxima)
  let pior: { etapa: string; perda: number } | null = null;
  for (let i = 0; i < funil.length - 1; i++) {
    const perda = funil[i].sessoes - funil[i + 1].sessoes;
    if (funil[i].sessoes > 0 && (!pior || perda > pior.perda)) pior = { etapa: funil[i].etapa, perda };
  }
  return (
    <section className="panel publico-painel publico-funil">
      <div className="publico-funil-topo">
        <div>
          <h2>Onde as pessoas desistem do cadastro</h2>
          <p>Cada barra mostra quantas pessoas chegaram até aquela tela do onboarding.</p>
        </div>
        {pior && pior.perda > 0 && (
          <div className="publico-alerta">
            <WarningCircle size={18} weight="fill" />
            <span>
              Maior desistência: <b>{ETAPAS[pior.etapa] ?? pior.etapa}</b> ({pct(pior.perda, inicio)}% de quem começou para aqui)
            </span>
          </div>
        )}
      </div>
      {inicio === 0 ? (
        <p className="publico-vazio">Ainda não há visitas ao onboarding registradas no período.</p>
      ) : (
        <ol className="publico-barras">
          {funil.map((f, i) => {
            const anterior = i > 0 ? funil[i - 1].sessoes : f.sessoes;
            const queda = anterior - f.sessoes;
            return (
              <li
                key={f.etapa}
                className={pior && pior.perda > 0 && f.etapa === pior.etapa ? 'pior' : ''}
                title={`${ETAPAS[f.etapa] ?? f.etapa}: ${f.sessoes} pessoas (${pct(f.sessoes, inicio)}% de quem começou)`}
              >
                <span className="publico-rotulo">
                  {i + 1}. {ETAPAS[f.etapa] ?? f.etapa}
                </span>
                <span className="publico-trilho">
                  <span style={{ width: `${pct(f.sessoes, inicio)}%` }} />
                </span>
                <span className="publico-valor">
                  {f.sessoes} <small>{pct(f.sessoes, inicio)}%</small>
                  {i > 0 && queda > 0 && <em>−{queda}</em>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function MetaReal({ metas }: { metas: Publico['metas'] }) {
  return (
    <section className="panel publico-painel">
      <h2>Meta escolhida × estudo real</h2>
      <p className="publico-sub">Média de questões por dia nos últimos 14 dias.</p>
      {metas.length === 0 ? (
        <p className="publico-vazio">Sem dados no período.</p>
      ) : (
        <table className="publico-tabela">
          <thead>
            <tr>
              <th>Meta/dia</th>
              <th>Alunos</th>
              <th>Média real</th>
              <th>Batem a meta</th>
            </tr>
          </thead>
          <tbody>
            {metas.map((m) => (
              <tr key={m.meta}>
                <td>{m.meta} questões</td>
                <td>{m.alunos}</td>
                <td>{m.media_real.toLocaleString('pt-BR')}</td>
                <td>
                  {m.batem_meta} <small>({pct(m.batem_meta, m.alunos)}%)</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Origens({ origens }: { origens: NonNullable<Publico['origens']> }) {
  return (
    <section className="panel publico-painel publico-funil">
      <h2>De onde vêm os cadastros (UTM)</h2>
      <p className="publico-sub">
        Pela fonte e campanha do link (utm_source e utm_campaign). “Visitas” = pessoas que abriram o cadastro; “(direto)” = sem UTM.
      </p>
      {origens.length === 0 ? (
        <p className="publico-vazio">Sem dados no período.</p>
      ) : (
        <table className="publico-tabela">
          <thead>
            <tr>
              <th>Fonte</th>
              <th>Campanha</th>
              <th>Visitas</th>
              <th>Cadastros</th>
              <th>Conversão</th>
              <th>Assinantes</th>
            </tr>
          </thead>
          <tbody>
            {origens.map((o) => (
              <tr key={`${o.fonte}§${o.campanha}`}>
                <td>{o.fonte}</td>
                <td>{o.campanha}</td>
                <td>{o.visitas}</td>
                <td>{o.cadastros}</td>
                <td>{o.visitas ? `${pct(o.cadastros, o.visitas)}%` : '—'}</td>
                <td>
                  {o.assinantes} <small>({pct(o.assinantes, o.cadastros)}%)</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
