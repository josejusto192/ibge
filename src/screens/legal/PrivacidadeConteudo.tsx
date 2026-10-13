// Texto compartilhado entre a página /privacidade e o LegalSheet (modal usado
// dentro do app — link em nova aba trava o PWA no iOS).
export default function PrivacidadeConteudo() {
  return (
    <div className="flex-1 space-y-4 p-[18px_20px_36px] font-sans text-[13.5px] leading-[1.6] text-ink-soft">
      <p className="text-[12px] font-semibold text-text3">Última atualização: setembro de 2026</p>

      <p>
        Esta política explica quais dados o Foco coleta, para quê, e quais são seus direitos, em conformidade com a Lei Geral de
        Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>

      <h2 className="font-display text-[15px] font-extrabold text-ink">1. Dados que coletamos</h2>
      <p>
        Nome, e-mail, WhatsApp, faixa etária, e informações do seu objetivo de estudo (se já prestou concurso, nível de preparo,
        prazo da prova), fornecidos no cadastro. Também registramos seu progresso de estudo (respostas, acertos, XP, streak), quais
        telas do cadastro foram vistas (sem identificar você antes de criar a conta) e, se você conversar com o tutor com
        inteligência artificial (o mascote do app), o conteúdo das suas dúvidas digitadas.
      </p>

      <h2 className="font-display text-[15px] font-extrabold text-ink">2. Para que usamos</h2>
      <p>
        Para operar sua conta e o acompanhamento da trilha de estudos, personalizar sua experiência (meta diária, ranking e o
        nível inicial das questões), contatar você sobre o serviço, e, quando aplicável, processar indicações e cobrança de
        assinatura. Também usamos esses dados de forma agregada (em números e percentuais, sem expor pessoas) para entender o
        público do Foco e melhorar o app, as trilhas e o cadastro.
      </p>

      <h2 className="font-display text-[15px] font-extrabold text-ink">3. Com quem compartilhamos</h2>
      <p>
        Usamos a Supabase (infraestrutura de banco de dados e autenticação) para armazenar seus dados, e a API do Google Gemini
        para gerar as respostas do tutor com IA — nesse caso, o enunciado da questão e sua dúvida digitada são enviados ao Google para
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
  );
}
