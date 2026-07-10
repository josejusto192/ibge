import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { QuestaoRow } from '../lib/database.types';
import {
  addQuestaoToModulo,
  fetchProximaNaoRevisada,
  fetchQuestaoAdmin,
  reviewWithAI,
  saveManualReview,
  unmarkRevisado,
} from '../lib/adminQueries';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from './AdminLayout';

export default function AdminQuestaoReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const moduloId = searchParams.get('modulo');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questao, setQuestao] = useState<QuestaoRow | null>(null);
  const [draft, setDraft] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [addedToModulo, setAddedToModulo] = useState(false);

  function load() {
    if (!id) return;
    fetchQuestaoAdmin(id).then((q) => {
      setQuestao(q);
      setDraft(q.comentario_revisado_html ?? q.comentario_html ?? q.comentario ?? '');
    });
  }

  useEffect(load, [id]);

  async function handleReviewWithAI() {
    if (!id) return;
    setAiLoading(true);
    setError(null);
    try {
      const result = await reviewWithAI(id);
      setDraft(result.comentario_revisado_html);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao revisar com IA.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSaveManual(irParaProxima = false) {
    if (!id || !user) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      await saveManualReview(id, user.id, draft);
      if (irParaProxima) {
        const proximaId = await fetchProximaNaoRevisada(id);
        if (proximaId) {
          navigate(`/admin/questoes/${proximaId}${moduloId ? `?modulo=${moduloId}` : ''}`);
          setAddedToModulo(false);
          return;
        }
        setInfo('Salvo! Não há mais questões não revisadas. 🎉');
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar revisão.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnmark() {
    if (!id) return;
    setError(null);
    try {
      await unmarkRevisado(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desmarcar revisão.');
    }
  }

  function insertImage() {
    const url = window.prompt('URL da imagem:');
    if (!url) return;
    setDraft((d) => `${d}\n<img src="${url}">`);
  }

  async function handleAddToModulo() {
    if (!id || !moduloId) return;
    await addQuestaoToModulo(Number(moduloId), id, 0);
    setAddedToModulo(true);
  }

  if (!questao) {
    return (
      <AdminLayout>
        <div className="text-gray-400">Carregando…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {moduloId ? (
        <Link to={`/admin/modulos/${moduloId}`} className="text-sm font-bold text-gray-500 hover:text-gray-800">
          ‹ Voltar ao módulo
        </Link>
      ) : (
        <Link to="/admin/questoes" className="text-sm font-bold text-gray-500 hover:text-gray-800">
          ‹ Banco de questões
        </Link>
      )}

      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-lg font-extrabold text-gray-900">Revisar comentário</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${questao.revisado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {questao.revisado ? `Revisada (${questao.revisado_metodo})` : 'Não revisada'}
        </span>
        {questao.revisado && (
          <button onClick={handleUnmark} className="text-xs font-bold text-gray-400 hover:text-gray-700">
            Desmarcar
          </button>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Enunciado</div>
        <div
          className="rich-content mt-1 text-sm text-gray-800"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(questao.enunciado_html ?? questao.enunciado ?? '') }}
        />
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-gray-500">
          {(questao.alternativas ?? []).map((a) => (
            <span
              key={a.letra}
              className={`rounded-lg border px-2 py-1 ${a.correta ? 'border-green-300 bg-green-50 font-bold text-green-700' : 'border-gray-200'}`}
            >
              {a.letra}) {a.texto}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Comentário original (raspado — não mostrar ao aluno)</div>
        <div
          className="rich-content mt-1 max-h-40 overflow-y-auto text-sm text-gray-500"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(questao.comentario_html ?? questao.comentario ?? '') }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Comentário revisado (HTML)</div>
            <div className="flex gap-3">
              <button onClick={insertImage} className="text-xs font-bold text-blue-600 hover:underline">
                + Inserir imagem
              </button>
              <button onClick={handleReviewWithAI} disabled={aiLoading} className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50">
                {aiLoading ? 'Revisando com IA…' : '✨ Revisar com IA'}
              </button>
            </div>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs"
          />
        </div>
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Pré-visualização</div>
          <div className="rich-content h-[calc(100%-24px)] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft) }} />
          </div>
        </div>
      </div>

      {error && <div className="mt-3 text-sm font-semibold text-red-600">{error}</div>}
      {info && <div className="mt-3 text-sm font-semibold text-green-600">{info}</div>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => handleSaveManual(false)}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar e marcar como revisado'}
        </button>
        <button
          onClick={() => handleSaveManual(true)}
          disabled={saving}
          className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          Salvar e revisar próxima »
        </button>
        {moduloId && questao.revisado && (
          <button
            onClick={handleAddToModulo}
            disabled={addedToModulo}
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            {addedToModulo ? 'Adicionada ao módulo ✓' : 'Adicionar a este módulo'}
          </button>
        )}
      </div>
    </AdminLayout>
  );
}
