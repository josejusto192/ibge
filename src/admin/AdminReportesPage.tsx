import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  atualizarTicket,
  fetchEmailsUsuarios,
  fetchNomesUsuarios,
  fetchTickets,
  type TicketAdminRow,
  type TicketStatus,
} from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

const STATUS: { value: TicketStatus; label: string; classe: string }[] = [
  { value: 'aberto', label: 'Aberto', classe: 'bg-amber-100 text-amber-700' },
  { value: 'em_andamento', label: 'Em andamento', classe: 'bg-blue-100 text-blue-700' },
  { value: 'resolvido', label: 'Resolvido', classe: 'bg-green-100 text-green-700' },
  { value: 'fechado', label: 'Fechado', classe: 'bg-gray-100 text-gray-600' },
];
const FILTROS = [
  { value: 'abertos', label: 'Em aberto' },
  { value: 'resolvidos', label: 'Resolvidos' },
  { value: 'todos', label: 'Todos' },
] as const;

// Reportes do botão "Reportar ou comentar questão" (tickets tipo 'questao',
// migration 025). A tabela também aceita tickets de suporte, mas o fluxo de
// suporte ficou para depois do MVP — por isso só questões aqui.
export default function AdminReportesPage() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['value']>('abertos');
  const [tickets, setTickets] = useState<TicketAdminRow[] | null>(null);
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  const [emails, setEmails] = useState<Map<string, string>>(new Map());
  const [salvando, setSalvando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setError(null);
    try {
      const rows = await fetchTickets({ status: filtro, tipo: 'questao' });
      setTickets(rows);
      const ids = rows.map((t) => t.usuario_id).filter((id): id is string => !!id);
      const [n, e] = await Promise.all([fetchNomesUsuarios(ids).catch(() => new Map<string, string>()), fetchEmailsUsuarios(ids)]);
      setNomes(n);
      setEmails(e);
    } catch {
      setError('Não foi possível carregar os reportes.');
    }
  }, [filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function mudarStatus(t: TicketAdminRow, status: TicketStatus) {
    setSalvando(t.id);
    setError(null);
    try {
      await atualizarTicket(t.id, { status });
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? `Erro ao salvar o reporte #${t.id}: ${err.message}` : 'Erro ao salvar.');
    } finally {
      setSalvando(null);
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-gray-900">Reportes de questões</h1>
        <div className="filter-tabs !pb-0" aria-label="Status">
          {FILTROS.map((f) => (
            <button key={f.value} className={filtro === f.value ? 'active' : ''} aria-pressed={filtro === f.value} onClick={() => setFiltro(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Enviados pelos alunos no botão "Reportar ou comentar questão". Abra a questão, corrija e marque como resolvido.
      </p>

      {error && <div className="mt-3 text-sm font-semibold text-red-600">{error}</div>}

      <div className="mt-4 flex flex-col gap-3">
        {!tickets && !error && <div className="text-gray-400">Carregando…</div>}
        {tickets?.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">Nenhum reporte por aqui. 🎉</div>
        )}
        {tickets?.map((t) => {
          const st = STATUS.find((s) => s.value === t.status)!;
          const ocupado = salvando === t.id;
          return (
            <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400">#{t.id}</span>
                <span className="text-sm font-bold text-gray-900">{t.motivo}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${st.classe}`}>{st.label}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {t.usuario_id ? nomes.get(t.usuario_id) || 'Aluno' : 'Conta excluída'}
                {t.usuario_id && emails.get(t.usuario_id) && ` · ${emails.get(t.usuario_id)}`} ·{' '}
                {new Date(t.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                {t.resolvido_em && ` · resolvido em ${new Date(t.resolvido_em).toLocaleDateString('pt-BR')}`}
              </div>
              {t.mensagem ? (
                <div className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-800">{t.mensagem}</div>
              ) : (
                <div className="mt-2 text-xs italic text-gray-400">Sem comentário.</div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {t.questao_id ? (
                  <Link to={`/admin/questoes/${t.questao_id}`} className="text-sm font-bold text-blue-600 hover:underline">
                    Abrir questão para corrigir ›
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400">Questão removida do banco</span>
                )}
                <select
                  value={t.status}
                  disabled={ocupado}
                  onChange={(e) => mudarStatus(t, e.target.value as TicketStatus)}
                  className="ml-auto rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  aria-label="Status do reporte"
                >
                  {STATUS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {t.status !== 'resolvido' && (
                  <button
                    disabled={ocupado}
                    onClick={() => mudarStatus(t, 'resolvido')}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Marcar como resolvido
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
