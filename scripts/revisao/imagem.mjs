// Baixa uma imagem (link) para um arquivo, para o Claude abrir e olhar.
// Usado pelo revisor do /revisar-questoes (modo Supabase conectado).
// Uso: node scripts/revisao/imagem.mjs "<link>" revisao-trabalho/img/<nome>
import fs from 'node:fs';
import path from 'node:path';
import { baixarImagem, EXTENSOES } from './baixarImagem.mjs';

const [link, destino] = process.argv.slice(2);
if (!link || !destino || !/^https?:\/\//i.test(link)) {
  console.error('Uso: node scripts/revisao/imagem.mjs "<link http(s)>" <arquivo-sem-extensão>');
  process.exit(1);
}
try {
  const { buffer, tipo, via } = await baixarImagem(link);
  const ext = EXTENSOES[tipo] ?? (link.split('?')[0].split('.').pop()?.toLowerCase().slice(0, 4) || 'png');
  const arquivo = `${destino.replace(/\.[a-z0-9]+$/i, '')}.${ext}`;
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, buffer);
  console.log(arquivo + (via === 'arquivo da internet' ? '  (cópia do arquivo da internet: o site original bloqueou)' : ''));
} catch (err) {
  console.error(`NÃO ABRIU: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
