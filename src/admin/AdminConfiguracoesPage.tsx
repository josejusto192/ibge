import { useEffect, useState } from 'react';
import { fetchConfiguracoesIA, updateConfiguracoesIA, GEMINI_MODELOS, type ConfiguracoesIA } from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

export default function AdminConfiguracoesPage() {
  const [config, setConfig] = useState<ConfiguracoesIA | null>(null);
  const [novaApiKey, setNovaApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    return fetchConfiguracoesIA().then(setConfig);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await updateConfiguracoesIA({
        modelo: config.modelo,
        prompt_extra: config.prompt_extra,
        tutor_prompt_extra: config.tutor_prompt_extra,
        ...(novaApiKey.trim() ? { api_key: novaApiKey.trim() } : {}),
      });
      setNovaApiKey('');
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <AdminLayout>
        <div className="text-gray-400">Carregando…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-xl font-extrabold text-gray-900">Configurações de IA</h1>
      <p className="mt-1 text-sm text-gray-500">
        Modelo e chave do Google Gemini, usados tanto pelo "Revisar com IA" (reescreve comentários de questões) quanto pelo Tutor de
        IA que o aluno usa na tela de questão.
      </p>

      <div className="mt-6 max-w-lg rounded-xl border border-gray-200 bg-white p-5">
        <label className="text-xs font-bold text-gray-500">MODELO</label>
        <select
          value={config.modelo}
          onChange={(e) => setConfig({ ...config, modelo: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {GEMINI_MODELOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <div className="mt-4">
          <label className="text-xs font-bold text-gray-500">CHAVE DE API DO GEMINI</label>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${config.api_key_configurada ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
            >
              {config.api_key_configurada ? 'Chave configurada' : 'Nenhuma chave configurada'}
            </span>
          </div>
          <input
            type="password"
            value={novaApiKey}
            onChange={(e) => setNovaApiKey(e.target.value)}
            placeholder={config.api_key_configurada ? 'Deixe em branco pra manter a chave atual, ou cole uma nova' : 'AIza...'}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            autoComplete="off"
          />
          <div className="mt-1 text-xs text-gray-400">
            Gerada em{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline">
              aistudio.google.com/apikey
            </a>
            . Depois de salva, a chave nunca é lida de volta pro navegador — nem pelo admin — só as Edge Functions a leem.
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-bold text-gray-500">DIRETRIZES EXTRAS PARA O "REVISAR COM IA" (OPCIONAL)</label>
          <textarea
            value={config.prompt_extra ?? ''}
            onChange={(e) => setConfig({ ...config, prompt_extra: e.target.value })}
            rows={4}
            placeholder="Ex.: prefira frases curtas; sempre cite a lei/manual quando possível; evite jargão jurídico."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <label className="text-xs font-bold text-gray-500">DIRETRIZES EXTRAS PARA O TUTOR DE IA DO ALUNO (OPCIONAL)</label>
          <textarea
            value={config.tutor_prompt_extra ?? ''}
            onChange={(e) => setConfig({ ...config, tutor_prompt_extra: e.target.value })}
            rows={4}
            placeholder="Ex.: chame o aluno de 'concurseiro'; incentive antes de explicar; nunca dê a resposta de outra questão."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="mt-1 text-xs text-gray-400">
            Some ao enunciado, alternativas, gabarito e comentário da questão atual — o aluno só vê essa parte se pedir ajuda depois
            de responder.
          </div>
        </div>

        {error && <div className="mt-3 text-sm font-semibold text-red-600">{error}</div>}
        {saved && <div className="mt-3 text-sm font-semibold text-green-600">Salvo ✓</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </AdminLayout>
  );
}
