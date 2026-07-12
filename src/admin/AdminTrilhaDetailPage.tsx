import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchModulos, fetchTrilhas, type ModuloRow, type TrilhaRow } from '../lib/queries';
import { createModulo, deleteModulo, deleteTrilha, fetchContagemQuestoesPorModulo, updateModulo, updateTrilha } from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

export default function AdminTrilhaDetailPage() {
  const { id } = useParams();
  const trilhaId = Number(id);
  const navigate = useNavigate();

  const [trilha, setTrilha] = useState<TrilhaRow | null>(null);
  const [modulos, setModulos] = useState<ModuloRow[] | null>(null);
  const [contagens, setContagens] = useState<Map<number, number>>(new Map());
  const [novoTipo, setNovoTipo] = useState<'questoes' | 'aula'>('questoes');
  const [novoModulo, setNovoModulo] = useState('');
  const [novoVideoUrl, setNovoVideoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetchTrilhas().then((all) => setTrilha(all.find((t) => t.id === trilhaId) ?? null));
    fetchModulos(trilhaId).then((rows) => {
      setModulos(rows);
      fetchContagemQuestoesPorModulo(rows.map((m) => m.id)).then(setContagens);
    });
  }

  useEffect(refresh, [trilhaId]);

  async function saveField(patch: Partial<TrilhaRow>) {
    if (!trilha) return;
    const next = { ...trilha, ...patch };
    setTrilha(next);
    await updateTrilha(trilhaId, patch);
  }

  async function addModulo() {
    if (!novoModulo.trim()) return;
    if (novoTipo === 'aula' && !novoVideoUrl.trim()) {
      setError('Informe a URL do vídeo do YouTube.');
      return;
    }
    setError(null);
    try {
      await createModulo(trilhaId, {
        titulo: novoModulo.trim(),
        ordem: modulos?.length ?? 0,
        tipo: novoTipo,
        video_url: novoTipo === 'aula' ? novoVideoUrl.trim() : null,
      });
      setNovoModulo('');
      setNovoVideoUrl('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar módulo.');
    }
  }

  async function saveVideoUrl(m: ModuloRow, videoUrl: string) {
    await updateModulo(m.id, { video_url: videoUrl.trim() || null });
    refresh();
  }

  async function move(m: ModuloRow, dir: -1 | 1) {
    if (!modulos) return;
    const idx = modulos.findIndex((x) => x.id === m.id);
    const swapWith = modulos[idx + dir];
    if (!swapWith) return;
    await Promise.all([updateModulo(m.id, { ordem: swapWith.ordem }), updateModulo(swapWith.id, { ordem: m.ordem })]);
    refresh();
  }

  async function removeModulo(m: ModuloRow) {
    if (!confirm(`Excluir o módulo "${m.titulo}"? Isso remove o progresso dos alunos nele também.`)) return;
    await deleteModulo(m.id);
    refresh();
  }

  async function removeTrilha() {
    if (!trilha) return;
    if (!confirm(`Excluir a trilha "${trilha.nome}" e todos os seus módulos?`)) return;
    await deleteTrilha(trilhaId);
    navigate('/admin/trilhas');
  }

  if (!trilha) {
    return (
      <AdminLayout>
        <div className="text-gray-400">Carregando…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link to="/admin/trilhas" className="text-sm font-bold text-gray-500 hover:text-gray-800">
        ‹ Trilhas
      </Link>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500">NOME</label>
            <input
              value={trilha.nome}
              onChange={(e) => setTrilha({ ...trilha, nome: e.target.value })}
              onBlur={(e) => saveField({ nome: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">SLUG</label>
            <input
              value={trilha.slug}
              onChange={(e) => setTrilha({ ...trilha, slug: e.target.value })}
              onBlur={(e) => saveField({ slug: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs font-bold text-gray-500">NOME DA SEÇÃO (opcional)</label>
          <input
            value={trilha.secao_nome ?? ''}
            onChange={(e) => setTrilha({ ...trilha, secao_nome: e.target.value })}
            onBlur={(e) => saveField({ secao_nome: e.target.value.trim() || null })}
            placeholder="Se deixar em branco, aparece “SEÇÃO 1”"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3">
          <label className="text-xs font-bold text-gray-500">DESCRIÇÃO</label>
          <textarea
            value={trilha.descricao ?? ''}
            onChange={(e) => setTrilha({ ...trilha, descricao: e.target.value })}
            onBlur={(e) => saveField({ descricao: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={trilha.ativa} onChange={(e) => saveField({ ativa: e.target.checked })} />
            Trilha ativa (visível para novos alunos escolherem)
          </label>
          <button onClick={removeTrilha} className="text-sm font-bold text-red-600 hover:underline">
            Excluir trilha
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">Módulos</h2>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value as 'questoes' | 'aula')}
          className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
        >
          <option value="questoes">Módulo de questões</option>
          <option value="aula">Aula (vídeo opcional)</option>
        </select>
        <input
          value={novoModulo}
          onChange={(e) => setNovoModulo(e.target.value)}
          placeholder={novoTipo === 'aula' ? 'Título da aula' : 'Título do novo módulo'}
          onKeyDown={(e) => e.key === 'Enter' && addModulo()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {novoTipo === 'aula' && (
          <input
            value={novoVideoUrl}
            onChange={(e) => setNovoVideoUrl(e.target.value)}
            placeholder="URL do vídeo do YouTube"
            onKeyDown={(e) => e.key === 'Enter' && addModulo()}
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        )}
        <button onClick={addModulo} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          Adicionar
        </button>
      </div>
      {error && <div className="mt-2 text-sm font-semibold text-red-600">{error}</div>}
      <p className="mt-2 text-xs text-gray-400">
        Aulas são sempre opcionais: aparecem no caminho da trilha, mas não bloqueiam nem exigem conclusão para o aluno avançar.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {(modulos ?? []).map((m, i) => (
          <div key={m.id} className="flex items-center gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0">
            <div className="flex flex-col gap-1">
              <button disabled={i === 0} onClick={() => move(m, -1)} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">
                ▲
              </button>
              <button
                disabled={i === (modulos?.length ?? 0) - 1}
                onClick={() => move(m, 1)}
                className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{m.titulo}</span>
                {m.tipo === 'aula' ? (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">Aula · opcional</span>
                ) : (contagens.get(m.id) ?? 0) > 0 ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                    {contagens.get(m.id)} questões
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">⚠ sem questões</span>
                )}
              </div>
              {m.tipo === 'aula' && (
                <input
                  defaultValue={m.video_url ?? ''}
                  onBlur={(e) => saveVideoUrl(m, e.target.value)}
                  placeholder="URL do vídeo do YouTube"
                  className="mt-1 w-full max-w-md rounded-lg border border-gray-300 px-2 py-1 text-xs"
                />
              )}
            </div>
            {m.tipo === 'questoes' && (
              <Link to={`/admin/modulos/${m.id}`} className="font-bold text-blue-600 hover:underline">
                Editar questões ›
              </Link>
            )}
            <button onClick={() => removeModulo(m)} className="text-sm font-bold text-red-600 hover:underline">
              Excluir
            </button>
          </div>
        ))}
        {modulos?.length === 0 && <div className="px-4 py-6 text-center text-gray-400">Nenhum módulo ainda.</div>}
      </div>
    </AdminLayout>
  );
}
