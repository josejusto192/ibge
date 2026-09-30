// Baixa o próximo lote de questões sem revisão para revisao-trabalho/lote/,
// uma pasta por questão: questao.md (tudo o que o revisor precisa) e as
// imagens como arquivos (o Claude abre e olha).
// Uso: node scripts/revisao/baixar.mjs --quantidade 50 [--disciplina "Matemática"] [--banca "FGV"]
import fs from 'node:fs';
import path from 'node:path';
import { args, conectar, LOTE, pastasDoLote } from './comum.mjs';
import { baixarImagem } from './baixarImagem.mjs';

const opcoes = args();
const quantidade = Math.min(50, Math.max(1, Number(opcoes.quantidade) || 10));
const disciplina = opcoes.disciplina && opcoes.disciplina !== 'todas' ? opcoes.disciplina : null;
const banca = opcoes.banca && opcoes.banca !== 'todas' ? opcoes.banca : null;

const pendentes = pastasDoLote();
if (pendentes.length && opcoes.limpar !== 'sim') {
  console.error(`Ainda há ${pendentes.length} questão(ões) em revisao-trabalho/lote. Rode "node scripts/revisao/enviar.mjs" antes (ou use --limpar para descartar).`);
  process.exit(1);
}
fs.rmSync(LOTE, { recursive: true, force: true });
fs.mkdirSync(LOTE, { recursive: true });

const supabase = await conectar();
const { data: questoes, error } = await supabase.rpc('cowork_proximas_questoes', {
  p_limite: quantidade,
  p_disciplina: disciplina,
  p_banca: banca,
});
if (error) {
  console.error('Erro ao buscar questões:', error.message);
  process.exit(1);
}
if (!questoes?.length) {
  console.log('Nenhuma questão pendente com esses filtros. 🎉');
  process.exit(0);
}

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

async function salvarImagem(src, destinoSemExt) {
  try {
    if (src.startsWith('data:')) {
      const m = src.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
      if (!m) throw new Error('imagem embutida inválida');
      const ext = EXT[m[1].toLowerCase()] ?? 'png';
      const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
      fs.writeFileSync(`${destinoSemExt}.${ext}`, buf);
      return path.basename(`${destinoSemExt}.${ext}`);
    }
    const { buffer, tipo } = await baixarImagem(src);
    const ext = EXT[tipo] ?? (src.split('?')[0].split('.').pop()?.toLowerCase().slice(0, 4) || 'png');
    fs.writeFileSync(`${destinoSemExt}.${ext}`, buffer);
    return path.basename(`${destinoSemExt}.${ext}`);
  } catch (err) {
    return `NÃO ABRIU (${err instanceof Error ? err.message : err})`;
  }
}

// HTML mais limpo para leitura: tira atributos de formatação e ids do site de origem
function limpar(html) {
  return (html ?? '')
    .replace(/\s(?:id|hash|style|align|width|height|border|contenteditable|data-[\w-]+)="[^"]*"/gi, '')
    .replace(/\s(?:class)="(?!render-latex)[^"]*"/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let n = 0;
for (const q of questoes) {
  n += 1;
  const pasta = path.join(LOTE, `${String(n).padStart(2, '0')}-${q.questao_id.slice(0, 8)}`);
  fs.mkdirSync(pasta, { recursive: true });

  // imagens do comentário ([[IMGn]]) — pedidas uma a uma (podem ser grandes)
  const imgsComentario = [];
  for (let i = 1; i <= (q.imagens_no_comentario ?? 0); i++) {
    const { data: src } = await supabase.rpc('cowork_imagem', { p_questao_id: q.questao_id, p_n: i });
    imgsComentario.push(src ? await salvarImagem(src, path.join(pasta, `IMG${i}`)) : 'NÃO ABRIU (sem endereço)');
  }

  // imagens do enunciado e das alternativas (links)
  const imgsEnunciado = [];
  const arquivoDoLink = new Map();
  let k = 0;
  for (const link of q.imagens_links ?? []) {
    k += 1;
    const nome = await salvarImagem(link, path.join(pasta, `enunciado-img${k}`));
    imgsEnunciado.push(nome);
    arquivoDoLink.set(link, nome);
  }
  const trocarImgs = (html) =>
    (html ?? '').replace(/<img[^>]*?src\s*=\s*["']([^"']+)["'][^>]*>/gi, (_t, src) => `[imagem: ${arquivoDoLink.get(src) ?? 'não disponível'}]`);
  const enunciadoHtml = trocarImgs(q.enunciado_html || q.enunciado || '');

  const alternativas = (Array.isArray(q.alternativas) ? q.alternativas : [])
    .map((a) => `- **${a.letra})** ${limpar(trocarImgs(a.html || a.texto))}${a.correta ? '  ← correta' : ''}`)
    .join('\n');

  const md = `# Questão ${q.questao_id}

- Disciplina: ${q.disciplina ?? '—'} · Assunto: ${q.assunto ?? '—'}
- Banca: ${q.banca ?? '—'} · Ano: ${q.ano ?? '—'}
- **Gabarito: ${q.gabarito_letra ?? '—'}**

## Enunciado
${limpar(enunciadoHtml)}

## Alternativas
${alternativas || '(sem alternativas)'}

## Imagens
${imgsComentario.length ? imgsComentario.map((f, i) => `- [[IMG${i + 1}]] do comentário → ${f}`).join('\n') : '- Comentário sem imagens.'}
${imgsEnunciado.length ? imgsEnunciado.map((f) => `- Enunciado/alternativas → ${f}`).join('\n') : ''}

## Diretrizes extras do professor
${q.diretrizes_extras?.trim() || '(nenhuma)'}

## Comentário original (reescreva este)
${limpar(q.comentario_original_html)}
`;
  fs.writeFileSync(path.join(pasta, 'questao.md'), md);
  fs.writeFileSync(path.join(pasta, 'meta.json'), JSON.stringify({ questao_id: q.questao_id, marcadores: q.imagens_no_comentario ?? 0 }));
  process.stdout.write(`\rBaixadas ${n}/${questoes.length}`);
}
console.log(`\nLote pronto em revisao-trabalho/lote (${questoes.length} questões).`);
for (const p of pastasDoLote()) console.log(' ', path.relative(process.cwd(), p));
