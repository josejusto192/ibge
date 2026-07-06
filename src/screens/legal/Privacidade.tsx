import { useNavigate } from 'react-router-dom';
import { X } from '@phosphor-icons/react';

export default function PoliticaPrivacidadeScreen() {
  const navigate = useNavigate();

  return (
    <div className="scr relative flex flex-1 flex-col overflow-y-auto bg-app-bg">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border2 bg-surface p-[14px_18px]">
        <button onClick={() => navigate(-1)} className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border-none bg-app-bg text-text2">
          <X weight="bold" size={16} />
        </button>
        <div className="font-sans text-[15px] font-extrabold text-ink">Política de Privacidade</div>
      </div>

      <div className="flex-1 space-y-4 p-[18px_20px_36px] font-sans text-[13.5px] leading-[1.6] text-ink-soft">
        <p className="text-[12px] font-semibold text-text3">Última atualização: julho de 2026</p>

        <p>
          Esta política explica quais dados o Foco coleta, para quê, e quais são seus direitos, em conformidade com a Lei Geral de
          Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">1. Dados que coletamos</h2>
        <p>
          Nome, e-mail, WhatsApp, faixa etária, e informações do seu objetivo de estudo (se já prestou concurso, nível de preparo,
          prazo da prova), fornecidos no cadastro. Também registramos seu progresso de estudo (respostas, acertos, XP, streak) e, se
          você usar o Tutor de IA, o conteúdo das suas dúvidas digitadas.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">2. Para que usamos</h2>
        <p>
          Para operar sua conta e o acompanhamento da trilha de estudos, personalizar sua experiência (meta diária, ranking),
          contatar você sobre o serviço, e, quando aplicável, processar indicações e cobrança de assinatura.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">3. Com quem compartilhamos</h2>
        <p>
          Usamos a Supabase (infraestrutura de banco de dados e autenticação) para armazenar seus dados, e a API do Google Gemini
          para gerar respostas do Tutor de IA — nesse caso, o enunciado da questão e sua dúvida digitada são enviados ao Google para
          processamento. Não vendemos seus dados a terceiros.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">4. Seus direitos (LGPD)</h2>
        <p>
          Você pode solicitar a qualquer momento: acesso aos seus dados, correção de dados incorretos, exclusão da sua conta e dados
          associados, ou informações sobre com quem compartilhamos seus dados. Para exercer esses direitos, entre em contato pelo
          e-mail abaixo.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">5. Segurança</h2>
        <p>
          Seus dados ficam protegidos por controle de acesso (cada aluno só vê seus próprios dados) e conexão criptografada (HTTPS).
          Senhas nunca são armazenadas em texto puro.
        </p>

        <h2 className="font-display text-[15px] font-extrabold text-ink">6. Contato</h2>
        <p>
          Dúvidas sobre esta política ou sobre seus dados: <strong>josejustomkt@gmail.com</strong>.
        </p>
      </div>
    </div>
  );
}
