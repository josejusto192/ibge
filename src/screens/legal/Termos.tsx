import { useNavigate } from 'react-router-dom';
import { X } from '@phosphor-icons/react';

export default function TermosDeUsoScreen() {
  const navigate = useNavigate();

  return (
    <div className="scr relative flex flex-1 flex-col overflow-y-auto bg-app-bg">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border2 bg-surface p-[14px_18px]">
        <button onClick={() => navigate(-1)} className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border-none bg-app-bg text-text2">
          <X weight="bold" size={16} />
        </button>
        <div className="font-sans text-[15px] font-extrabold text-ink">Termos de Uso</div>
      </div>

      <div className="flex-1 space-y-4 p-[18px_20px_36px] font-sans text-[13.5px] leading-[1.6] text-ink-soft">
        <p className="text-[12px] font-semibold text-text3">Última atualização: julho de 2026</p>

        <p>
          Estes Termos de Uso regulam o acesso e uso do Foco ("app", "plataforma"), um serviço de preparação para concursos públicos
          por trilhas de questões. Ao criar uma conta, você concorda com estes termos.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">1. Cadastro e conta</h2>
        <p>
          Para usar o Foco você precisa criar uma conta com e-mail e senha. Você é responsável por manter a confidencialidade da sua
          senha e por todas as atividades realizadas na sua conta. Informe dados verdadeiros no cadastro.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">2. O que oferecemos</h2>
        <p>
          O app disponibiliza trilhas de estudo com questões comentadas, estatísticas de desempenho, ranking, gamificação (XP,
          streak) e, quando disponível, um tutor de IA para tirar dúvidas sobre questões respondidas incorretamente. O conteúdo é
          fornecido "como está" — apesar dos cuidados de curadoria, não garantimos ausência total de erros nos comentários ou
          questões.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">3. Uso aceitável</h2>
        <p>
          Não é permitido: compartilhar sua conta com terceiros, copiar ou redistribuir o conteúdo das questões/trilhas, tentar
          acessar áreas administrativas sem autorização, ou usar o app de forma que prejudique outros usuários ou a infraestrutura do
          serviço.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">4. Assinatura e pagamento</h2>
        <p>
          Caso o app venha a cobrar por planos pagos, as condições de cobrança, renovação e cancelamento serão informadas antes da
          contratação, dentro do próprio app.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">5. Cancelamento</h2>
        <p>
          Você pode parar de usar o app e solicitar a exclusão da sua conta a qualquer momento, pelo e-mail de contato informado na
          Política de Privacidade.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">6. Alterações</h2>
        <p>
          Podemos atualizar estes termos periodicamente. Mudanças relevantes serão comunicadas dentro do app antes de entrarem em
          vigor.
        </p>
      </div>
    </div>
  );
}
