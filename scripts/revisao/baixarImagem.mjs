// Baixa uma imagem de um link, contornando os bloqueios mais comuns:
// muitos sites recusam (403) downloads que não parecem vir de um navegador
// ou que não trazem o "Referer" do próprio site. Tentativas, em ordem:
//   1. como navegador, com Referer do próprio site da imagem;
//   2. como navegador, sem Referer;
//   3. cópia arquivada na Wayback Machine (web.archive.org).
// Devolve { buffer, tipo, via } ou lança erro com o motivo de cada tentativa.

const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function tentar(url, headers) {
  const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const tipo = (res.headers.get('content-type') ?? '').split(';')[0].toLowerCase();
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error('arquivo vazio');
  if (tipo.startsWith('text/html')) throw new Error('veio uma página, não uma imagem');
  return { buffer, tipo };
}

export async function baixarImagem(link) {
  const origem = (() => {
    try {
      return new URL(link).origin + '/';
    } catch {
      return undefined;
    }
  })();
  const base = { 'User-Agent': NAVEGADOR, Accept: 'image/avif,image/webp,image/png,image/*,*/*;q=0.8', 'Accept-Language': 'pt-BR,pt;q=0.9' };
  const tentativas = [
    ['navegador + referer', link, { ...base, ...(origem ? { Referer: origem } : {}) }],
    ['navegador', link, base],
    ['arquivo da internet', `https://web.archive.org/web/2024id_/${link}`, base],
  ];
  const erros = [];
  for (const [via, url, headers] of tentativas) {
    try {
      return { ...(await tentar(url, headers)), via };
    } catch (err) {
      erros.push(`${via}: ${err instanceof Error ? err.message : err}`);
    }
  }
  throw new Error(erros.join(' · '));
}

export const EXTENSOES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif' };
