import { useEffect, useState } from 'react';
import { fetchClientErrors, type ClientErrorRow } from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

const PAGE_SIZE = 30;

export default function AdminErrosPage() {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ClientErrorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetchClientErrors(page).then((r) => {
      setRows(r.rows);
      setTotal(r.total);
    });
  }, [page]);

  return (
    <AdminLayout>
      <h1 className="text-xl font-extrabold text-gray-900">Erros do app</h1>
      <p className="mt-1 text-sm text-gray-500">
        Erros capturados no navegador dos alunos (crash de tela, falha ao carregar dados). Mais recentes primeiro.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {rows.map((e) => (
          <div key={e.id} className="border-t border-gray-100 p-3 first:border-t-0">
            <div className="flex cursor-pointer items-start justify-between gap-3" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-semibold text-gray-800">{e.mensagem}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span>{new Date(e.criado_em).toLocaleString('pt-BR')}</span>
                  {e.contexto && <span className="rounded-full bg-gray-100 px-2 py-0.5 font-bold text-gray-600">{e.contexto.split(':')[0]}</span>}
                  {e.usuario_id && <span>usuário {e.usuario_id.slice(0, 8)}</span>}
                </div>
              </div>
              <span className="flex-none text-xs font-bold text-blue-600">{expanded === e.id ? 'fechar' : 'detalhes'}</span>
            </div>
            {expanded === e.id && (
              <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                {e.url && (
                  <div>
                    <b>URL:</b> {e.url}
                  </div>
                )}
                {e.contexto && (
                  <div>
                    <b>Contexto:</b> {e.contexto}
                  </div>
                )}
                {e.user_agent && (
                  <div>
                    <b>Navegador:</b> {e.user_agent}
                  </div>
                )}
                {e.stack && <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-gray-500">{e.stack}</pre>}
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="p-6 text-center text-gray-400">Nenhum erro registrado. 🎉</div>}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{total} erros registrados</span>
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
