import { Check, Path } from '@phosphor-icons/react';
import { useState } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import Dialog from '../../components/Dialog';

export default function TrilhasSheet({ onClose }: { onClose: () => void }) {
  const { trilhas, activeTrilha, setActiveTrilha } = useAppData();
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');
  async function select(id: number) {
    if (saving !== null) return;
    setSaving(id);
    setError('');
    try {
      await setActiveTrilha(id);
      onClose();
    } catch {
      setError('Não foi possível trocar a trilha. Tente novamente.');
      setSaving(null);
    }
  }
  return (
    <Dialog title="Seu objetivo, sua trilha." onClose={onClose}>
      <p className="dialog-description">Escolha o concurso em que quer focar. Seu progresso nas outras trilhas fica salvo.</p>
      {trilhas.length === 0 && <p className="empty-state">Nenhuma trilha disponível no momento.</p>}
      {trilhas.map((t) => (
        <button
          key={t.id}
          className={`track-choice ${t.id === activeTrilha?.id ? 'selected' : ''}`}
          disabled={!t.ativa || saving !== null}
          onClick={() => select(t.id)}
        >
          <span className="metric-icon">
            <Path size={23} />
          </span>
          <div>
            <strong>{t.nome}{t.tipo === 'inteligente' && <span className="ml-1.5 align-middle text-[11px] font-extrabold text-[#6d3fd8]">✨ Inteligente</span>}</strong>
            <p>{t.descricao}</p>
          </div>
          <span className="pill">
            {saving === t.id ? (
              'Salvando…'
            ) : !t.ativa ? (
              'Em breve'
            ) : t.id === activeTrilha?.id ? (
              <>
                <Check size={12} />
                Atual
              </>
            ) : (
              'Escolher'
            )}
          </span>
        </button>
      ))}
      {error && (
        <p className="mt-4 text-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
