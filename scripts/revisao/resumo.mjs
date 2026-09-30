// Mostra quantas questões faltam revisar por disciplina e banca.
// Uso: node scripts/revisao/resumo.mjs
import { conectar } from './comum.mjs';

const supabase = await conectar();
const { data, error } = await supabase.rpc('cowork_resumo_pendentes');
if (error) {
  console.error('Erro:', error.message);
  process.exit(1);
}
const linhas = data ?? [];
console.table(linhas.map((l) => ({ disciplina: l.disciplina, banca: l.banca, pendentes: l.pendentes, 'com imagem': l.com_imagem, puladas: l.puladas })));
const total = linhas.reduce((t, l) => t + l.pendentes, 0);
const puladas = linhas.reduce((t, l) => t + l.puladas, 0);
console.log(`TOTAL pendentes: ${total} · puladas (aguardando professor): ${puladas}`);
