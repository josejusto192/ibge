import { useEffect, useState } from 'react';
import { fetchConfiguracoesIA, updateConfiguracoesIA, GEMINI_MODELOS, type ConfiguracoesIA } from '../lib/adminQueries';
import AdminLayout from './AdminLayout';

export default function AdminConfiguracoesPage() {
  const [config, setConfig] = useState<ConfiguracoesIA | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfiguracoesIA().then(setConfig);
  }, []);

  async function handleSave() {
    if (!config) return;
    setError(null);
    try {
      await updateConfiguracoesIA(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
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
          <input
            type="password"
            value={config.api_key ?? ''}
            onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
            placeholder="AIza..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
          />
          <div className="mt-1 text-xs text-gray-400">
            Gerada em{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline">
              aistudio.google.com/apikey
            </a>
            . Fica só no banco (nunca é enviada ao navegador do aluno) — só a Edge Function de revisão a lê.
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

        <button onClick={handleSave} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          Salvar configurações
        </button>
      </div>
    </AdminLayout>
  );
}
