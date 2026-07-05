import { useEffect, useState } from 'react';
import { searchUsuarios, updateUsuarioAdmin } from '../lib/adminQueries';
import type { Usuario } from '../hooks/useUsuario';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from './AdminLayout';

const PAGE_SIZE = 20;

export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const [texto, setTexto] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    searchUsuarios(texto || undefined, page).then((r) => {
      setRows(r.rows);
      setTotal(r.total);
    });
  }

  useEffect(refresh, [texto, page]);

  async function toggle(usuario: Usuario, field: 'assinatura_ativa' | 'is_admin') {
    setBusyId(usuario.id);
    setError(null);
    try {
      await updateUsuarioAdmin(usuario.id, { [field]: !usuario[field] });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-xl font-extrabold text-gray-900">Usuários</h1>
      <p className="mt-1 text-sm text-gray-500">Gerencie assinatura e permissão de admin de cada usuário.</p>

      <input
        placeholder="Buscar por nome ou e-mail..."
        value={texto}
        onChange={(e) => {
          setPage(0);
          setTexto(e.target.value);
        }}
        className="mt-4 w-full max-w-sm rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
      />

      {error && <div className="mt-2 text-sm font-semibold text-red-600">{error}</div>}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Streak</th>
              <th className="px-4 py-3">XP</th>
              <th className="px-4 py-3">Assinatura</th>
              <th className="px-4 py-3">Admin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isSelf = u.id === user?.id;
              const busy = busyId === u.id;
              return (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{u.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{u.streak}</td>
                  <td className="px-4 py-3 text-gray-500">{u.xp}</td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busy}
                      onClick={() => toggle(u, 'assinatura_ativa')}
                      className={`rounded-full px-2 py-0.5 text-xs font-bold disabled:opacity-40 ${
                        u.assinatura_ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.assinatura_ativa ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busy || isSelf}
                      title={isSelf ? 'Você não pode alterar sua própria permissão de admin.' : undefined}
                      onClick={() => toggle(u, 'is_admin')}
                      className={`rounded-full px-2 py-0.5 text-xs font-bold disabled:opacity-40 ${
                        u.is_admin ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.is_admin ? 'Admin' : 'Aluno'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
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
