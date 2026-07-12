import { Notebook } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export default function ErrosFab({ count }: { count: number }) {
  const navigate = useNavigate();

  if (count <= 0) return null;

  return (
    <button
      onClick={() => navigate('/caderno-de-erros')}
      className="absolute bottom-20 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white"
      style={{ background: 'linear-gradient(135deg,#F5484D,#C0392B)', boxShadow: '0 10px 22px -8px rgba(197,57,53,.6)' }}
      aria-label="Caderno de erros"
    >
      <Notebook weight="fill" size={24} color="#fff" />
      <span
        className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-yellow px-1 font-sans text-[11px] font-extrabold text-ink"
      >
        {count}
      </span>
    </button>
  );
}
