// Envia o resultado do lote: para cada pasta em revisao-trabalho/lote,
//   revisado.html → salva a revisão (o banco confere tudo antes de gravar)
//   pular.txt     → marca como pulada com o motivo
// Pastas enviadas vão para revisao-trabalho/feitas/. Se o banco recusar,
// a pasta fica no lote com erro.txt explicando o motivo (corrija e rode de novo).
// Uso: node scripts/revisao/enviar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { conectar, FEITAS, pastasDoLote } from './comum.mjs';

const pastas = pastasDoLote();
if (!pastas.length) {
  console.log('Nada para enviar em revisao-trabalho/lote.');
  process.exit(0);
}
const supabase = await conectar();
const dia = new Date().toISOString().slice(0, 10);
fs.mkdirSync(path.join(FEITAS, dia), { recursive: true });

const resultado = { salvas: 0, puladas: 0, erros: 0, sem_resposta: 0 };
for (const pasta of pastas) {
  const { questao_id } = JSON.parse(fs.readFileSync(path.join(pasta, 'meta.json'), 'utf8'));
  const revisado = path.join(pasta, 'revisado.html');
  const pular = path.join(pasta, 'pular.txt');
  const erroArq = path.join(pasta, 'erro.txt');
  let ok = false;

  if (fs.existsSync(pular)) {
    const motivo = fs.readFileSync(pular, 'utf8').trim() || 'sem motivo';
    const { error } = await supabase.rpc('cowork_pular', { p_questao_id: questao_id, p_motivo: motivo });
    if (error) fs.writeFileSync(erroArq, error.message);
    else {
      ok = true;
      resultado.puladas += 1;
    }
  } else if (fs.existsSync(revisado)) {
    const html = fs.readFileSync(revisado, 'utf8').trim();
    const { data, error } = await supabase.rpc('cowork_salvar_revisao', { p_questao_id: questao_id, p_html: html });
    if (error) fs.writeFileSync(erroArq, error.message);
    else {
      ok = true;
      resultado.salvas += 1;
      if (data !== 'salva') fs.writeFileSync(path.join(pasta, 'aviso.txt'), String(data));
    }
  } else {
    resultado.sem_resposta += 1;
    continue;
  }

  if (ok) {
    fs.rmSync(erroArq, { force: true });
    fs.renameSync(pasta, path.join(FEITAS, dia, path.basename(pasta)));
  } else {
    resultado.erros += 1;
    console.log(`✗ ${path.basename(pasta)}: ${fs.readFileSync(erroArq, 'utf8')}`);
  }
}
console.log(`Salvas: ${resultado.salvas} · puladas: ${resultado.puladas} · recusadas: ${resultado.erros} · sem resposta: ${resultado.sem_resposta}`);
if (resultado.erros) console.log('As recusadas ficaram em revisao-trabalho/lote com erro.txt: corrija o revisado.html (ou crie pular.txt) e rode de novo.');
