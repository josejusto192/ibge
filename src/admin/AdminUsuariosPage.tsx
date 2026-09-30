import { CaretDown, CaretRight, WhatsappLogo } from '@phosphor-icons/react';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { fetchAlunoDetalhe, searchUsuarios, updateUsuarioAdmin, type AlunoDetalhe } from '../lib/adminQueries';
import type { Usuario } from '../hooks/useUsuario';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from './AdminLayout';

const PAGE_SIZE = 20;

const NIVEL: Record<string, string> = { zero: 'Começando do zero', pouco: 'Já estudou um pouco', reta: 'Reta final' };
const PRAZO: Record<string, string> = { menos1: 'Menos de 1 mês', '1a3': '1 a 3 meses', '3a6': '3 a 6 meses', naosei: 'Ainda não sabe' };

const data = (v: string | null | undefined) => (v ? new Date(v.length === 10 ? `${v}T12:00:00` : v).toLocaleDateString('pt-BR') : '—');
const dataHora = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const [texto, setTexto] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  function refresh() {
    searchUsuarios(texto || undefined, page)
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao buscar usuários.'));
  }

  useEffect(refresh, [texto, page]);

  // Assinatura paga vem só do Asaas (webhooks); o admin controla a cortesia
  // (acesso liberado sem pagamento).
  async function toggleCortesia(usuario: Usuario) {
    setBusyId(usuario.id);
    setError(null);
    try {
      await updateUsuarioAdmin(usuario.id, { assinatura_cortesia: !usuario.assinatura_cortesia });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário.');
    } finally {
      setBusyId(null);
    }
  }

  async function setPapel(usuario: Usuario, papel: 'aluno' | 'editor' | 'admin') {
    setBusyId(usuario.id);
    setError(null);
    try {
      await updateUsuarioAdmin(usuario.id, { is_admin: papel === 'admin', is_editor: papel === 'editor' });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-xl font-extrabold text-gray-900">Alunos e equipe</h1>
      <p className="mt-1 text-sm text-gray-500">
        Toque em uma pessoa para ver a ficha completa: contato, respostas do cadastro, origem (UTM), estudo e assinatura. Editor cura
        trilhas e revisa questões, mas não vê usuários, erros nem configurações.
      </p>

      <input
        placeholder="Buscar por nome, e-mail, WhatsApp ou campanha..."
        value={texto}
        onChange={(e) => {
          setPage(0);
          setAberto(null);
          setTexto(e.target.value);
        }}
        className="mt-4 w-full max-w-md rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
      />

      {error && <div className="mt-2 text-sm font-semibold text-red-600">{error}</div>}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="Expandir" />
              <th className="px-4 py-3">Pessoa</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Ofensiva</th>
              <th className="px-4 py-3">XP</th>
              <th className="px-4 py-3">Assinatura</th>
              <th className="px-4 py-3">Papel</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isSelf = u.id === user?.id;
              const busy = busyId === u.id;
              const expandido = aberto === u.id;
              const alternar = () => setAberto(expandido ? null : u.id);
              return (
                <Fragment key={u.id}>
                  <tr className={`border-t border-gray-100 ${expandido ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-2 py-3">
                      <button
                        onClick={alternar}
                        aria-expanded={expandido}
                        aria-label={expandido ? `Fechar ficha de ${u.nome ?? u.email}` : `Abrir ficha de ${u.nome ?? u.email}`}
                        className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:bg-gray-100"
                      >
                        {expandido ? <CaretDown size={15} weight="bold" /> : <CaretRight size={15} weight="bold" />}
                      </button>
                    </td>
                    <td className="cursor-pointer px-4 py-3" onClick={alternar}>
                      <div className="font-semibold text-gray-900">{u.nome ?? '—'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{data(u.created_at)}</td>
                    <td className="px-4 py-3">
                      {u.utm_source ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700" title={u.utm_campaign ?? undefined}>
                          {u.utm_source}
                          {u.utm_campaign ? ` · ${u.utm_campaign}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">direto</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.streak}</td>
                    <td className="px-4 py-3 text-gray-500">{u.xp}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            u.assinatura_ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                          title={u.acesso_ate ? `Pago até ${new Date(u.acesso_ate).toLocaleDateString('pt-BR')}` : undefined}
                        >
                          {u.acesso_ate && new Date(u.acesso_ate) > new Date() ? 'Assinante' : u.assinatura_ativa ? 'Ativa' : 'Inativa'}
                        </span>
                        <button
                          disabled={busy}
                          onClick={() => toggleCortesia(u)}
                          title="Cortesia libera o acesso sem pagamento"
                          className={`rounded-full border px-2 py-0.5 text-xs font-bold disabled:opacity-40 ${
                            u.assinatura_cortesia ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-400'
                          }`}
                        >
                          {u.assinatura_cortesia ? 'Cortesia ✓' : 'Dar cortesia'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={busy || isSelf}
                        title={isSelf ? 'Você não pode alterar seu próprio papel.' : undefined}
                        value={u.is_admin ? 'admin' : u.is_editor ? 'editor' : 'aluno'}
                        onChange={(e) => setPapel(u, e.target.value as 'aluno' | 'editor' | 'admin')}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-bold disabled:opacity-40"
                      >
                        <option value="aluno">Aluno</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                  {expandido && (
                    <tr className="border-t border-blue-100 bg-blue-50/40">
                      <td colSpan={8} className="px-4 pb-5 pt-1">
                        <FichaAluno usuario={u} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{total} usuários encontrados</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="font-bold disabled:opacity-30">
            ‹ Anterior
          </button>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)} className="font-bold disabled:opacity-30">
            Próxima ›
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

function FichaAluno({ usuario: u }: { usuario: Usuario }) {
  const [det, setDet] = useState<AlunoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetchAlunoDetalhe(u.id)
      .then((d) => vivo && setDet(d))
      .catch(() => vivo && setErro('Não foi possível carregar o estudo desta pessoa (rode a migration 032).'));
    return () => {
      vivo = false;
    };
  }, [u.id]);

  const whats = u.whatsapp?.replace(/\D/g, '') ?? '';
  const maxDia = Math.max(1, ...(det?.ultimos_14d ?? []));

  return (
    <div className="ficha-aluno">
      <Bloco titulo="Contato e perfil">
        <Linha rotulo="WhatsApp">
          {u.whatsapp ? (
            <a href={`https://wa.me/55${whats.replace(/^55(?=\d{10,11}$)/, '')}`} target="_blank" rel="noreferrer" className="ficha-link">
              <WhatsappLogo size={14} weight="fill" /> {u.whatsapp}
            </a>
          ) : (
            '—'
          )}
        </Linha>
        <Linha rotulo="E-mail">{u.email}</Linha>
        <Linha rotulo="Faixa etária">{u.faixa_etaria ?? '—'}</Linha>
        <Linha rotulo="Já prestou concurso">{u.ja_prestou_concurso == null ? '—' : u.ja_prestou_concurso ? 'Sim' : 'Primeira vez'}</Linha>
        <Linha rotulo="Nível de preparo">{u.nivel_preparo ? (NIVEL[u.nivel_preparo] ?? u.nivel_preparo) : '—'}</Linha>
        <Linha rotulo="Prova em">{u.prazo_prova ? (PRAZO[u.prazo_prova] ?? u.prazo_prova) : '—'}</Linha>
        <Linha rotulo="Meta diária">{u.meta_diaria} questões</Linha>
        <Linha rotulo="Cadastro">{dataHora(u.created_at)}</Linha>
        <Linha rotulo="Último acesso">{data(u.ultimo_acesso)}</Linha>
        <Linha rotulo="Termos aceitos">{dataHora(u.termos_aceitos_em)}</Linha>
      </Bloco>

      <Bloco titulo="Origem do cadastro">
        <Linha rotulo="Fonte (utm_source)">{u.utm_source ?? 'direto / sem UTM'}</Linha>
        <Linha rotulo="Mídia (utm_medium)">{u.utm_medium ?? '—'}</Linha>
        <Linha rotulo="Campanha">{u.utm_campaign ?? '—'}</Linha>
        <Linha rotulo="Conteúdo (utm_content)">{u.utm_content ?? '—'}</Linha>
        <Linha rotulo="Termo (utm_term)">{u.utm_term ?? '—'}</Linha>
        <Linha rotulo="Site de origem">{u.origem_referrer ?? '—'}</Linha>
        <Linha rotulo="Página de entrada">{u.origem_pagina ?? '—'}</Linha>
        <Linha rotulo="Primeiro clique">{dataHora(u.origem_em)}</Linha>
        <Linha rotulo="Indicado por">{det?.indicado_por ?? '—'}</Linha>
      </Bloco>

      <Bloco titulo="Estudo">
        {erro ? (
          <p className="text-xs font-semibold text-red-600">{erro}</p>
        ) : !det ? (
          <p className="text-xs text-gray-400">Carregando…</p>
        ) : (
          <>
            <Linha rotulo="Trilha">{det.trilha ?? '—'}</Linha>
            <Linha rotulo="Progresso">
              {det.modulos_feitos}/{det.modulos_total} etapas concluídas
            </Linha>
            <Linha rotulo="Questões respondidas">
              {det.respostas} · {pct(det.acertos, det.respostas)}% de acerto
            </Linha>
            <Linha rotulo="Últimos 7 / 30 dias">
              {det.respostas_7d} / {det.respostas_30d} questões
            </Linha>
            <Linha rotulo="Dias que estudou (30d)">{det.dias_estudo_30d}</Linha>
            <Linha rotulo="Ofensiva / último estudo">
              {u.streak} dias · {data(u.ultimo_estudo)}
            </Linha>
            <Linha rotulo="Revisões pendentes">{det.revisoes_pendentes}</Linha>
            <div className="ficha-dias" aria-label="Questões por dia nos últimos 14 dias">
              {det.ultimos_14d.map((n, i) => (
                <span key={i} title={`${n} questões`} style={{ height: `${Math.max(3, (n / maxDia) * 100)}%` }} className={n ? '' : 'zero'} />
              ))}
            </div>
            <small className="ficha-nota">Questões por dia · últimos 14 dias</small>
          </>
        )}
      </Bloco>

      <Bloco titulo="Desempenho por disciplina">
        {!det ? (
          <p className="text-xs text-gray-400">{erro ? '—' : 'Carregando…'}</p>
        ) : det.por_disciplina.length === 0 ? (
          <p className="text-xs text-gray-400">Ainda não respondeu questões.</p>
        ) : (
          <ul className="ficha-barras">
            {det.por_disciplina.map((d) => {
              const dom = det.dominio.find((x) => x.disciplina === d.disciplina);
              return (
                <li key={d.disciplina} title={`${d.acertos} de ${d.total} certas`}>
                  <span className="ficha-barras-nome">{d.disciplina}</span>
                  <span className="ficha-barras-trilho">
                    <span style={{ width: `${pct(d.acertos, d.total)}%` }} />
                  </span>
                  <span className="ficha-barras-valor">
                    {pct(d.acertos, d.total)}% <small>de {d.total}</small>
                    {dom && <em title="Domínio estimado pelo algoritmo"> · domínio {dom.dominio}%</em>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Bloco>

      <Bloco titulo="Assinatura e indicações">
        <Linha rotulo="Situação">
          {u.acesso_ate && new Date(u.acesso_ate) > new Date() ? 'Assinante' : u.assinatura_cortesia ? 'Cortesia' : 'Sem assinatura'}
        </Linha>
        <Linha rotulo="Acesso pago até">{data(u.acesso_ate)}</Linha>
        <Linha rotulo="Cliente no Asaas">{u.asaas_customer_id ?? '—'}</Linha>
        {u.asaas_sync_erro && <Linha rotulo="Erro no Asaas">{u.asaas_sync_erro}</Linha>}
        <Linha rotulo="Indicou">{det ? `${det.indicacoes} pessoas · ${det.indicacoes_assinaram} assinaram` : '—'}</Linha>
      </Bloco>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="ficha-bloco">
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="ficha-linha">
      <span>{rotulo}</span>
      <strong>{children}</strong>
    </div>
  );
}
