import { useEffect, useState } from 'react';
import { createAula, deleteAula, fetchAulas, fetchUsoAulas, updateAula, type AulaRow } from '../lib/adminQueries';
import { extractYoutubeId } from '../lib/youtube';
import AdminLayout from './AdminLayout';

// Biblioteca de aulas: cadastradas aqui, sem trilha. Depois podem ser usadas
// em módulos tipo 'aula' (na tela da trilha) ou como aula de apoio de uma
// questão (na revisão da questão — aparece só no caderno de erros).
export default function AdminAulasPage() {
  const [aulas, setAulas] = useState<AulaRow[] | null>(null);
  const [uso, setUso] = useState<Map<number, { modulos: number; questoes: number }>>(new Map());
  const [creating, setCreating] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetchAulas().then(setAulas);
    fetchUsoAulas().then(setUso);
  }

  useEffect(refresh, []);

  async function handleCreate() {
    if (!titulo.trim() || !videoUrl.trim()) {
      setError('Título e URL do vídeo são obrigatórios.');
      return;
    }
    if (!extractYoutubeId(videoUrl)) {
      setError('URL do YouTube inválida.');
      return;
    }
    setError(null);
    try {
      await createAula({ titulo: titulo.trim(), video_url: videoUrl.trim(), descricao: descricao.trim() || null });
      setTitulo('');
      setVideoUrl('');
      setDescricao('');
      setCreating(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar aula.');
    }
  }

  async function saveField(aula: AulaRow, patch: Partial<Pick<AulaRow, 'titulo' | 'video_url' | 'descricao'>>) {
    if (patch.titulo !== undefined && !patch.titulo.trim()) return;
    if (patch.video_url !== undefined && !extractYoutubeId(patch.video_url)) {
      setError(`URL do YouTube inválida em "${aula.titulo}".`);
      return;
    }
    setError(null);
    try {
      await updateAula(aula.id, patch);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar aula.');
    }
  }

  async function remove(aula: AulaRow) {
    if (!confirm(`Excluir a aula "${aula.titulo}"? Questões vinculadas a ela perdem a aula de apoio.`)) return;
    setError(null);
    try {
      await deleteAula(aula.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir aula.');
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">Aulas</h1>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          {creating ? 'Cancelar' : 'Nova aula'}
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Cadastre a aula uma vez e use onde quiser: como módulo de aula em uma trilha, ou como aula de apoio de uma questão (aparece
        para o aluno no caderno de erros).
      </p>

      {creating && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500">TÍTULO</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">URL DO VÍDEO (YOUTUBE)</label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold text-gray-500">DESCRIÇÃO (opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button onClick={handleCreate} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Criar aula
          </button>
        </div>
      )}

      {error && <div className="mt-3 text-sm font-semibold text-red-600">{error}</div>}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {(aulas ?? []).map((a) => {
          const u = uso.get(a.id);
          return (
            <div key={a.id} className="flex items-start gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0">
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  key={`t-${a.id}-${a.titulo}`}
                  defaultValue={a.titulo}
                  onBlur={(e) => e.target.value.trim() !== a.titulo && saveField(a, { titulo: e.target.value.trim() })}
                  className="w-full rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-gray-900 hover:border-gray-300 focus:border-gray-300"
                />
                <input
                  key={`v-${a.id}-${a.video_url}`}
                  defaultValue={a.video_url}
                  onBlur={(e) => e.target.value.trim() !== a.video_url && saveField(a, { video_url: e.target.value.trim() })}
                  className="w-full max-w-md rounded-lg border border-gray-300 px-2 py-1 text-xs"
                />
                <input
                  key={`d-${a.id}-${a.descricao ?? ''}`}
                  defaultValue={a.descricao ?? ''}
                  placeholder="Descrição (opcional)"
                  onBlur={(e) => e.target.value.trim() !== (a.descricao ?? '') && saveField(a, { descricao: e.target.value.trim() || null })}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div className="flex flex-none flex-col items-end gap-1 pt-1">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                  {u?.modulos ?? 0} módulos · {u?.questoes ?? 0} questões
                </span>
                <button onClick={() => remove(a)} className="text-sm font-bold text-red-600 hover:underline">
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
        {aulas?.length === 0 && <div className="px-4 py-6 text-center text-gray-400">Nenhuma aula ainda.</div>}
        {!aulas && <div className="px-4 py-6 text-center text-gray-400">Carregando…</div>}
      </div>
    </AdminLayout>
  );
}
