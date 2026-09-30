import { useLocation, useNavigate } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import PrivacidadeConteudo from './PrivacidadeConteudo';

export default function PoliticaPrivacidadeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  // Aberto direto pela URL não há histórico pra voltar — location.key
  // 'default' identifica esse caso; cai na raiz do app.
  const close = () => (location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1));

  return (
    <div className="scr relative flex flex-1 flex-col overflow-y-auto bg-app-bg">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border2 bg-surface p-[14px_18px]">
        <button onClick={close} className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border-none bg-app-bg text-text2">
          <X weight="bold" size={16} />
        </button>
        <div className="font-sans text-[15px] font-extrabold text-ink">Política de Privacidade</div>
      </div>

      <PrivacidadeConteudo />
    </div>
  );
}
