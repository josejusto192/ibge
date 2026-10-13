import Dialog from '../Dialog';
import TermosConteudo from '../../screens/legal/TermosConteudo';
import PrivacidadeConteudo from '../../screens/legal/PrivacidadeConteudo';

export type LegalDoc = 'termos' | 'privacidade';

// Termos/Política dentro do app, sem navegar: link com target="_blank" no PWA
// do iOS abre uma janela branca sem como voltar, e sair da tela do onboarding
// perderia o que o aluno já preencheu.
export default function LegalSheet({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  return (
    <Dialog title={doc === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'} onClose={onClose}>
      <div className="-mx-5 -mt-4">{doc === 'termos' ? <TermosConteudo /> : <PrivacidadeConteudo />}</div>
    </Dialog>
  );
}
